/**
 * Data access for the game engine — Node port of Casino-App/backend/app/store.py + helpers.py.
 *
 * One sqlite file, one ledger: the engine's "game log" IS our `spins` row (invest -> bet,
 * win_amo -> win), so history/admin/stats keep working on a single table. Extra columns the
 * engine needs (status, user_select, result, mines...) are added by migrateSpins().
 */
export const WIN = 1
export const LOSS = 0
export const PUSH = 2
export const RUNNING = 0
export const FINISHED = 1

export const fmt = (x) => Math.round((Number(x) || 0) * 100) / 100
export const num = (v, d = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}
export const jload = (v, d = null) => {
  if (v === null || v === undefined) return d
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { return d }
}
export const jdump = (v) => JSON.stringify(v ?? null)
export const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
/** PHP mt_rand / rand: inclusive on both ends */
export const mtRand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
export const rand = mtRand

const TRX_COLUMNS = new Set([
  'user_select', 'result', 'status', 'win_status', 'win_amo', 'invest', 'mines',
  'mine_available', 'gold_count', 'try_count', 'bet', 'win', 'detail',
])
/** the engine speaks their column names; our spins table keeps invest->bet, win_amo->win */
const COL_MAP = { invest: 'bet', win_amo: 'win' }

/** adds the engine columns to an existing `spins` table (idempotent) */
export function migrateSpins(db) {
  const cols = new Set(db.prepare('PRAGMA table_info(spins)').all().map((c) => c.name))
  const want = [
    ['status', 'INTEGER DEFAULT 1'],
    ['win_status', 'INTEGER DEFAULT 0'],
    ['user_select', 'TEXT'],
    ['result', 'TEXT'],
    ['mines', 'INTEGER DEFAULT 0'],
    ['mine_available', 'INTEGER DEFAULT 0'],
    ['gold_count', 'INTEGER DEFAULT 0'],
    ['try_count', 'INTEGER DEFAULT 0'],
    ['demo_play', 'INTEGER DEFAULT 0'],
  ]
  let added = 0
  for (const [name, type] of want) {
    if (cols.has(name)) continue
    db.exec(`ALTER TABLE spins ADD COLUMN ${name} ${type}`)
    added++
  }
  return added
}

export default function createStore(db) {
  const q = {
    user: db.prepare('SELECT * FROM users WHERE id = ?'),
    // `pct_win AS win`: the ported engine reads their column name, our schema calls it pct_win
    game: db.prepare('SELECT *, pct_win AS win FROM games WHERE alias = ? AND enabled = 1'),
    games: db.prepare('SELECT *, pct_win AS win FROM games ORDER BY sort, name'),
    setting: db.prepare('SELECT v FROM settings WHERE k = ?'),
    changeBal: db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?'),
    guessBonus: db.prepare('SELECT * FROM guess_bonuses WHERE alias = ? AND chance = ? AND status = 1'),
    guessBonuses: db.prepare('SELECT chance, percent FROM guess_bonuses WHERE alias = ? AND status = 1 ORDER BY chance'),
    log: db.prepare('SELECT * FROM spins WHERE id = ? AND user_id = ?'),
    running: db.prepare('SELECT * FROM spins WHERE status = 0 AND user_id = ? AND alias = ? ORDER BY id DESC LIMIT 1'),
    finishedCount: db.prepare('SELECT COUNT(*) c FROM spins WHERE user_id = ? AND alias = ? AND demo_play = 0 AND status = 1'),
    bonusLog: db.prepare('SELECT id FROM gameplay_bonus_logs WHERE user_id = ? AND alias = ?'),
    addBonusLog: db.prepare('INSERT INTO gameplay_bonus_logs (user_id, alias, amount, created_at) VALUES (?,?,?,?)'),
  }

  return {
    getUser: (id) => q.user.get(id),
    getGame: (alias) => q.game.get(String(alias)) || null,
    getGames: () => q.games.all(),
    getSetting: (k, d = null) => {
      const row = q.setting.get(k)
      return row ? row.v : d
    },
    /** returns the new balance */
    changeBalance(id, delta) {
      q.changeBal.run(fmt(delta), id)
      return fmt(q.user.get(id).balance)
    },
    addTransaction(userId, amount, type, details, remark, postBalance) {
      db.prepare(`INSERT INTO txs (user_id, kind, amount, status, note, created_at) VALUES (?,?,?,?,?,?)`)
        .run(userId, type, Math.round(fmt(amount)), 'done', `${details}${remark ? ' · ' + remark : ''}`.slice(0, 120), now())
      void postBalance
    },
    createGameLog({ userId, alias, userSelect, result, winStatus, invest, winAmo, mines = 0, mineAvailable = 0, demoPlay = 0 }) {
      const info = db.prepare(`INSERT INTO spins
        (user_id, alias, bet, win, detail, status, win_status, user_select, result, mines, mine_available, demo_play, created_at)
        VALUES (?,?,?,?,?,0,?,?,?,?,?,?,?)`)
        .run(userId, alias, Math.round(invest), Math.round(fmt(winAmo)), jdump({ result }),
          Number(winStatus) || 0,
          userSelect === undefined || userSelect === null ? null : (typeof userSelect === 'string' ? userSelect : jdump(userSelect)),
          jdump(result), mines, mineAvailable, demoPlay, now())
      return Number(info.lastInsertRowid)
    },
    getLog: (id, userId) => q.log.get(Number(id), Number(userId)) || null,
    getRunningLog: (userId, alias) => q.running.get(Number(userId), String(alias)) || null,
    updateLog(id, fields) {
      const keys = Object.keys(fields).filter((k) => TRX_COLUMNS.has(k))
      if (!keys.length) return
      db.prepare(`UPDATE spins SET ${keys.map((k) => `${COL_MAP[k] || k} = ?`).join(', ')} WHERE id = ?`)
        .run(...keys.map((k) => fields[k]), Number(id))
    },
    listLogs(userId, limit = 20) {
      return db.prepare(`SELECT s.id, s.bet AS invest, s.win AS win_amo, s.status, s.created_at,
                                g.name AS game_name, s.alias
                         FROM spins s LEFT JOIN games g ON g.alias = s.alias
                         WHERE s.user_id = ? ORDER BY s.id DESC LIMIT ?`).all(Number(userId), Number(limit))
    },
    guessBonus: (alias, chance) => q.guessBonus.get(String(alias), Number(chance)) || null,
    guessBonuses: (alias) => q.guessBonuses.all(String(alias)),
    countFinishedLogs: (userId, alias) => q.finishedCount.get(Number(userId), String(alias)).c,
    hasBonusLog: (userId, alias) => !!q.bonusLog.get(Number(userId), String(alias)),
    addBonusLog: (userId, alias, amount) => q.addBonusLog.run(Number(userId), String(alias), fmt(amount), now()),

    /** gameplay bonus after N finished plays of the same game (their check_and_give_bonus) */
    checkAndGiveBonus(userId, alias, gameName) {
      if (String(this.getSetting('game_play', '1')) !== '1') return null
      if (this.hasBonusLog(userId, alias)) return null
      const required = Math.trunc(num(this.getSetting('gameplay_number_for_bonus', '5'), 5))
      const amount = num(this.getSetting('gameplay_bonus', '10'), 10)
      if (this.countFinishedLogs(userId, alias) < required) return null
      const newBalance = this.changeBalance(userId, amount)
      this.addTransaction(userId, amount, 'gameplay_bonus', `Gameplay bonus (${gameName})`, 'gameplay_bonus', newBalance)
      this.addBonusLog(userId, alias, amount)
      return amount
    },
  }
}

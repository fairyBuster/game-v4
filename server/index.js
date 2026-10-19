/**
 * DY01 clone — one backend for everything (auth, wallet, games, admin) and the static
 * frontend. Zero npm deps: node:http + node:sqlite + node:crypto.
 *
 * Money path lives here on purpose: the browser only sends {alias, bet}, the server draws
 * the reels with its own RNG (the same engines the UI tests use), caps the win, moves the
 * balance and logs the spin. The client just replays the result it gets back.
 *
 *   node server/index.js          -> http://127.0.0.1:8015
 *
 * ponytail: single process, single sqlite file. Split into services the day this needs
 * more than one box.
 */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, resolve as resolvePath, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

import { spin as gSpin, playSpinDetailed, SPEC as GATES_SPEC } from '../web/src/slot/gates.js'
import { spin as sSpin, evaluate as sEval, REELS as S_REELS, ROWS as S_ROWS } from '../web/src/slot/engine.js'
import createStore, { migrateSpins, jdump, jload } from './engine/store.js'
import { getGame as getCasinoGame, loadedAliases, GAME_REGISTRY } from './engine/index.js'
import { CASINO_GAMES, GUESS_BONUSES, LIMIT_SCALE, SETTINGS } from './engine/config.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolvePath(HERE, '..')
const DIST = join(ROOT, 'web', 'dist')
const PORT = Number(process.env.PORT || 8015)

export const MAX_WIN_X = 5000           // all games cap the win at 5000x the bet
const START_BALANCE = 1_000_000
const DAILY_BONUS = 25_000
const REF_BONUS = 50_000              // saldo buat member yang mengundang, per pendaftar baru
const REF_WELCOME = 25_000            // saldo ekstra buat member baru yang daftar pakai kode
const BETS = {
  gates: [500, 1000, 2500, 5000, 10000, 25000],
  dy01_slot: [100, 250, 500, 1000, 2500, 5000, 10000],
}
// The vendor slot builds (public/vendor/simple-slots) draw their own reels but settle
// through the same wallet: their bet ladder is rupiah and the paytable scales with the stake.
const VENDOR_BETS = [5000, 10000, 20000, 50000, 100000, 200000]

// ---------------------------------------------------------------- storage
await mkdir(join(HERE, 'data'), { recursive: true })
const db = new DatabaseSync(join(HERE, 'data', 'app.db'))
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    phone TEXT DEFAULT '',
    balance INTEGER NOT NULL DEFAULT 0,
    vip INTEGER NOT NULL DEFAULT 0,
    is_admin INTEGER NOT NULL DEFAULT 0,
    banned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_bonus TEXT,
    ref_code TEXT,
    referred_by INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS spins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    alias TEXT NOT NULL,
    bet INTEGER NOT NULL,
    win INTEGER NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS txs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS games (
    alias TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    kind TEXT NOT NULL,
    trending INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    sort INTEGER DEFAULT 100
  );
  CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE IF NOT EXISTS guess_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, alias TEXT NOT NULL, chance INTEGER NOT NULL,
    percent REAL NOT NULL, status INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS gameplay_bonus_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, alias TEXT NOT NULL,
    amount REAL NOT NULL, created_at TEXT NOT NULL
  );
`)

const now = () => new Date().toISOString()
const hashPass = (pass, salt) => scryptSync(pass, salt, 64).toString('hex')

function seed() {
  const users = db.prepare('SELECT COUNT(*) c FROM users').get().c
  if (!users) {
    const mk = (u, p, admin, bal) => {
      const salt = randomBytes(16).toString('hex')
      db.prepare(`INSERT INTO users (username, pass_hash, salt, balance, is_admin, vip, created_at)
                  VALUES (?,?,?,?,?,?,?)`).run(u, hashPass(p, salt), salt, bal, admin ? 1 : 0, admin ? 7 : 1, now())
    }
    mk('admin', 'admin123', 1, START_BALANCE)
    mk('demo', 'demo123', 0, START_BALANCE)
    console.log('[seed] users: admin/admin123 (admin), demo/demo123')
  }
  const games = db.prepare('SELECT COUNT(*) c FROM games').get().c
  if (!games) {
    const rows = [
      // kind 'engine' = our own JS engines, played through /api/spin
      ['gates', 'Gates of Olympus', '/game/gates_slot.png', 'engine', 1, 1, 10],
      ['dy01_slot', 'DY01 Slots', '/game/dy01_slot.png', 'engine', 1, 1, 11],
      // kind 'iframe' = vendor build framed as-is; it settles through /api/vendor/* so it
      // draws from the same DY01 wallet as our own engines
      ['slot-gemstones', 'Gemstones', '/vendor/simple-slots/themes/gemstones/images/title.jpg', 'iframe', 0, 0, 20],
      ['slot-pirate', 'Pirate Gold', '/vendor/simple-slots/themes/pirate/images/title.jpg', 'iframe', 0, 0, 21],
      ['slot-ancient-egypt', 'Ancient Egypt', '/vendor/simple-slots/themes/ancient-egypt/images/title.jpg', 'iframe', 0, 0, 22],
      ['slot-aztec', 'Aztec Sun', '/vendor/simple-slots/themes/aztec/images/title.jpg', 'iframe', 0, 0, 23],
      ['slot-classic', 'Classic Fruits', '/vendor/simple-slots/themes/classic/images/title.jpg', 'iframe', 0, 0, 24],
      ['slot-fantasy-forest', 'Fantasy Forest', '/vendor/simple-slots/themes/fantasy-forest/images/title.jpg', 'iframe', 0, 0, 25],
      ['slot-space-adventure', 'Space Adventure', '/vendor/simple-slots/themes/space-adventure/images/title.png', 'iframe', 0, 0, 26],
      // kind 'soon' = cards from the old backend, no game behind them yet
      ['head_tail', 'Head & Tail', '6592b9b5aace01704114613.png', 'soon', 1, 0],
      ['rock_paper_scissors', 'Rock Paper Scissors', '610515f76a27a1627723255.jpg', 'soon', 0, 0],
      ['spin_wheel', 'Spin Wheel', '61051d8469d731627725188.jpg', 'soon', 0, 0],
      ['number_guess', 'Number Guessing', '61051a9ed28511627724446.jpg', 'soon', 0, 0],
      ['dice_rolling', 'Dice Rolling', '61051cb37ad601627724979.jpg', 'soon', 0, 0],
      ['card_finding', 'Card Finding', '610521608fde21627726176.jpg', 'soon', 0, 0],
      ['number_slot', 'Number Slot', '61052482a60ed1627726978.jpg', 'soon', 1, 0],
      ['number_pool', 'Pool Number', '610526fa315241627727610.jpg', 'soon', 1, 0],
      ['roulette', 'Roulette', '63fc71d5784ce1677488597.jpg', 'soon', 0, 1],
      ['casino_dice', 'Casino Dice', '657ff2e06f55f1702884064.jpg', 'soon', 0, 0],
      ['keno', 'Keno', '6492c056a362e1687339094.png', 'soon', 1, 0],
      ['blackjack', 'Black Jack', '641820a7bb36e1679302823.jpg', 'soon', 0, 1],
      ['mines', 'Mines', '658138687ef751702967400.png', 'soon', 0, 0],
      ['poker', 'Poker', '659d119dc8d811704792477.png', 'soon', 0, 0],
      ['color_prediction', 'Color Prediction', '670f5b2d8af5a1729059629.png', 'soon', 0, 0],
      ['crazy_times', 'Crazy Times', '6720d9aaa6d211730206122.png', 'soon', 0, 0],
      ['dream_catcher', 'Dream Catcher', '6815d25acd2e71746260570.png', 'soon', 1, 0],
      ['andar_bahar', 'Andar Bahar', '695373ce3ff591767076814.png', 'soon', 1, 0],
      ['pai_gow_poker', 'Pai Gow Poker', '6952166d1b1ba1766987373.png', 'soon', 1, 0],
    ]
    const ins = db.prepare(`INSERT INTO games (alias, name, image, kind, trending, featured, sort, enabled)
                            VALUES (?,?,?,?,?,?,?,1)`)
    rows.forEach(([alias, name, image, kind, trending, featured, sort], i) => {
      ins.run(alias, name, image, kind, trending, featured, sort ?? 100 + i)
    })
    console.log('[seed] games:', rows.length)
  }
}
seed()

// ---------------------------------------------------------------- referral
// Tiap user punya kode sendiri; member baru yang daftar pakai kode itu membayar bonus dua sisi:
// pengundang +REF_BONUS, pendaftar +REF_WELCOME. Kolomnya ditambah belakangan buat DB lama,
// lalu kode yang masih kosong diisi otomatis (kode 6 karakter, tanpa huruf mirip).
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function newRefCode() {
  for (;;) {
    let code = ''
    for (let i = 0; i < 6; i++) code += REF_ALPHABET[randomBytes(1)[0] % REF_ALPHABET.length]
    if (!db.prepare('SELECT 1 FROM users WHERE ref_code = ?').get(code)) return code
  }
}
{
  const cols = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name))
  if (!cols.has('ref_code')) db.exec('ALTER TABLE users ADD COLUMN ref_code TEXT')
  if (!cols.has('referred_by')) db.exec('ALTER TABLE users ADD COLUMN referred_by INTEGER')
  const fill = db.prepare('UPDATE users SET ref_code = ? WHERE id = ?')
  const missing = db.prepare(`SELECT id FROM users WHERE ref_code IS NULL OR ref_code = ''`).all()
  for (const u of missing) fill.run(newRefCode(), u.id)
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code)')
  if (missing.length) console.log(`[seed] kode referal: ${missing.length} user`)
}

// The ported Casino-App games replace the old hand-written mini games: their engine is the only
// rules source now, so kind gets flipped from 'mini'/'soon' to 'casino' by the registry below.

// ---------------------------------------------------------------- casino engine (ported)
// Adds the columns the ported engine reads, then writes each game's config from
// engine/config.js (same numbers as Casino-App/backend/app/seed.py, limits ×1000 for IDR).
{
  const cols = new Set(db.prepare('PRAGMA table_info(games)').all().map((c) => c.name))
  const want = [
    ['pct_win', 'REAL'], ['probable_win', 'TEXT'], ['probable_win_demo', 'TEXT'],
    ['min_limit', 'REAL DEFAULT 0'], ['max_limit', 'REAL DEFAULT 0'], ['invest_back', 'INTEGER DEFAULT 0'],
    ['level', 'TEXT'], ['instruction', 'TEXT'], ['short_desc', 'TEXT'], ['win_chance', 'REAL'],
  ]
  for (const [name, type] of want) if (!cols.has(name)) db.exec(`ALTER TABLE games ADD COLUMN ${name} ${type}`)

  const upd = db.prepare(`UPDATE games SET pct_win = ?, probable_win = ?, probable_win_demo = ?,
      min_limit = ?, max_limit = ?, invest_back = ?, level = ?, instruction = ?, short_desc = ?
      WHERE alias = ?`)
  let cfg = 0
  for (const [name, alias, win, min, max, investBack, pw, pwd, level, desc] of CASINO_GAMES) {
    cfg += upd.run(win, pw === null ? null : jdump(pw), pwd === null ? null : jdump(pwd),
      min * LIMIT_SCALE, max * LIMIT_SCALE, investBack, level === null ? null : jdump(level),
      desc, desc, alias).changes
    void name
  }
  const spinCols = migrateSpins(db)
  console.log(`[seed] casino config: ${cfg} games · spins columns +${spinCols}`)

  const setS = db.prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO NOTHING')
  for (const [k, v] of Object.entries(SETTINGS)) setS.run(k, String(v))
  if (!db.prepare('SELECT COUNT(*) c FROM guess_bonuses').get().c) {
    const ins = db.prepare('INSERT INTO guess_bonuses (alias, chance, percent, status) VALUES (?, ?, ?, 1)')
    for (const [alias, chance, percent] of GUESS_BONUSES) ins.run(alias, chance, percent)
    console.log('[seed] guess bonuses:', GUESS_BONUSES.length)
  }
}

const store = createStore(db)

// kind='casino' = engine-nya udah diport, jadi kartunya bukan "segera hadir" lagi.
// Sumber kebenarannya registry engine, bukan daftar terpisah.
{
  const flip = db.prepare(`UPDATE games SET kind = 'casino' WHERE alias = ? AND kind != 'casino'`)
  let changed = 0
  for (const alias of loadedAliases()) changed += flip.run(alias).changes
  console.log(`[seed] casino-ready games: ${loadedAliases().length} (kartu diubah: ${changed})`)
}

// ---------------------------------------------------------------- win chance
// Satu angka per game (0-100%): seberapa sering satu putaran menang.
//  - game engine Casino-App (probable_win skalar): angka ini = roll menang engine
//  - number_slot (probable_win = bobot kumulatif 3 level): diubah balik jadi satu %
//  - gates / dy01_slot: frekuensi menang alami diukur, lalu spin disaring
//    (acceptance sampling) supaya hasil akhirnya menang tepat sebesar angka admin
// null = alami / mengikuti aturan meja atau vendor.
const SLOT_CHANCE = new Set(['gates', 'dy01_slot'])
const NATURAL_WIN = new Map(CASINO_GAMES.map(([, alias, , , , , pw]) => [alias, pw]))
const WIN_RATE = new Map()

/** frekuensi menang alami satu engine slot (di-cache; ~0,02ms per ronde) */
function naturalWinRate(alias, rounds = 400) {
  if (WIN_RATE.has(alias)) return WIN_RATE.get(alias)
  let wins = 0
  for (let i = 0; i < rounds; i++) {
    const r = alias === 'gates' ? playGates(1000) : playDy01(1000)
    if (r.winX > 0) wins++
  }
  const p = wins / rounds
  WIN_RATE.set(alias, p)
  return p
}

/** mode pengaturan; null = tidak bisa diatur (aturan meja / vendor) */
function chanceMode(game) {
  if (SLOT_CHANCE.has(game.alias)) return 'slot'
  if (game.alias === 'number_slot') return 'weights'
  if (GAME_REGISTRY[game.alias] && typeof NATURAL_WIN.get(game.alias) === 'number') return 'engine'
  return null
}

/** persentase alami (buat ditampilkan di panel admin) */
function naturalChance(game) {
  const mode = chanceMode(game)
  if (mode === 'slot') return Math.round(naturalWinRate(game.alias) * 1000) / 10
  const cfg = NATURAL_WIN.get(game.alias)
  // mtRand(0,100) punya 101 hasil: P(menang) = (batas + 1) / 101
  if (mode === 'weights') return Math.round(((101 - Number(cfg?.[0] || 0)) / 101) * 1000) / 10
  if (mode === 'engine') return Math.round(((Number(cfg) + 1) / 101) * 1000) / 10
  return null
}

// ---------------------------------------------------------------- helpers
const q = {
  user: db.prepare('SELECT * FROM users WHERE id = ?'),
  byName: db.prepare('SELECT * FROM users WHERE username = ?'),
  session: db.prepare('SELECT s.token, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'),
  balance: db.prepare('UPDATE users SET balance = ? WHERE id = ?'),
  games: db.prepare('SELECT * FROM games ORDER BY sort, name'),
  game: db.prepare('SELECT * FROM games WHERE alias = ?'),
}

function publicUser(u) {
  return {
    id: u.id, username: u.username, balance: u.balance, vip: u.vip,
    is_admin: !!u.is_admin, banned: !!u.banned, ref_code: u.ref_code || '',
    currency: { text: 'IDR' },
  }
}

// Admin + akun testing tidak pernah tampil di daftar member, KPI, atau daftar withdraw.
// t_ = server/test.js, c_ = server/casino.test.js (dua-duanya meninggalkan user di DB).
const isTestAccount = (u) => /^[tc]_/i.test(u.username)
const isMember = (u) => !u.is_admin && !isTestAccount(u)

function send(res, code, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(code, {
    'content-type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  })
  res.end(data)
}
const fail = (res, code, message) => send(res, code, { error: message })

async function body(req) {
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > 262144) throw new Error('body too large')
    chunks.push(c)
  }
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new Error('bad json') }
}

function auth(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return null
  return q.session.get(token) || null
}

// ---------------------------------------------------------------- game math
function playGates(bet) {
  const { runs, totalX } = playSpinDetailed()
  const capped = Math.min(totalX, MAX_WIN_X)
  return { detail: { runs, totalX: capped, capX: GATES_SPEC.maxWinX }, winX: capped }
}

function playDy01(bet) {
  const grid = sSpin()
  const result = sEval(grid, bet)
  const free = []
  let left = result.spins
  let guard = 0
  while (left > 0 && guard++ < 60) {
    left--
    const g = sSpin()
    const r = sEval(g, bet)
    free.push({ grid: g, result: r })
    if (r.spins) left += r.spins
  }
  const total = result.total + free.reduce((s, f) => s + f.result.total, 0)
  const win = Math.min(total, bet * MAX_WIN_X)
  return { detail: { grid, result, free }, winX: win / bet }
}

/**
 * Putaran slot dengan target win chance. Proposal alami menang dengan peluang p;
 * hasil akhirnya menang tepat q (acceptance sampling, satu sisi selalu diterima):
 *   q >= p -> semua kemenangan diterima, kekalahan diterima sebagian
 *   q <= p -> semua kekalahan diterima, kemenangan diterima sebagian
 */
function playWithChance(alias, stake, chance) {
  const natural = () => (alias === 'gates' ? playGates(stake) : playDy01(stake))
  if (chance === null || chance === undefined) return natural()
  const q = Math.min(1, Math.max(0, Number(chance) / 100))
  const p = naturalWinRate(alias)
  if (!(p > 0 && p < 1)) return natural()
  const acceptWin = p <= q ? 1 : (q * (1 - p)) / (p * (1 - q))
  const acceptLoss = q <= p ? 1 : (p * (1 - q)) / (q * (1 - p))
  for (let i = 0; i < 40; i++) {
    const round = natural()
    if (Math.random() < (round.winX > 0 ? acceptWin : acceptLoss)) return round
  }
  return natural()
}

// ---------------------------------------------------------------- routes
const routes = {
  'POST /api/auth/register': async (req, res) => {
    const { username = '', password = '', phone = '', ref = '' } = await body(req)
    const name = String(username).trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(name)) return fail(res, 400, 'username 3-20 huruf/angka/_')
    if (String(password).length < 6) return fail(res, 400, 'password minimal 6 karakter')
    if (q.byName.get(name)) return fail(res, 409, 'username sudah dipakai')
    // kode referal opsional: harus milik akun aktif, bonusnya masuk ke dua sisi
    const code = String(ref).trim().toUpperCase()
    const inviter = code ? db.prepare('SELECT * FROM users WHERE ref_code = ?').get(code) : null
    if (code && (!inviter || inviter.banned)) return fail(res, 400, 'kode referal tidak valid')
    const salt = randomBytes(16).toString('hex')
    const start = START_BALANCE + (inviter ? REF_WELCOME : 0)
    db.prepare(`INSERT INTO users (username, pass_hash, salt, phone, balance, ref_code, referred_by, created_at)
                VALUES (?,?,?,?,?,?,?,?)`)
      .run(name, hashPass(String(password), salt), salt, String(phone).slice(0, 20), start,
        newRefCode(), inviter ? inviter.id : null, now())
    const user = q.byName.get(name)
    if (inviter) {
      q.balance.run(inviter.balance + REF_BONUS, inviter.id)
      const tx = db.prepare('INSERT INTO txs (user_id, kind, amount, status, note, created_at) VALUES (?,?,?,?,?,?)')
      tx.run(inviter.id, 'referral', REF_BONUS, 'done', `undang @${name}`, now())
      tx.run(user.id, 'referral_welcome', REF_WELCOME, 'done', `kode dari @${inviter.username}`, now())
    }
    const token = randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)').run(token, user.id, now())
    send(res, 200, {
      token, user: publicUser(user),
      referral: inviter ? { bonus: REF_WELCOME, referrer: inviter.username } : null,
    })
  },

  'POST /api/auth/login': async (req, res) => {
    const { username = '', password = '' } = await body(req)
    const user = q.byName.get(String(username).trim().toLowerCase())
    if (!user) return fail(res, 401, 'username / password salah')
    const ok = timingSafeEqual(Buffer.from(user.pass_hash, 'hex'), Buffer.from(hashPass(String(password), user.salt), 'hex'))
    if (!ok) return fail(res, 401, 'username / password salah')
    if (user.banned) return fail(res, 403, 'akun diblokir, hubungi admin')
    const token = randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)').run(token, user.id, now())
    send(res, 200, { token, user: publicUser(user) })
  },

  'POST /api/auth/logout': async (req, res) => {
    const h = req.headers.authorization || ''
    if (h.startsWith('Bearer ')) db.prepare('DELETE FROM sessions WHERE token = ?').run(h.slice(7))
    send(res, 200, { ok: true })
  },

  'GET /api/me': async (req, res, user) => {
    if (!user) return fail(res, 401, 'belum login')
    send(res, 200, publicUser(q.user.get(user.id)))
  },

  'GET /api/games': async (req, res) => {
    const rows = q.games.all().filter((g) => g.enabled)
    send(res, 200, rows.map((g) => ({
      alias: g.alias, name: g.name, image: g.image, kind: g.kind,
      trending: !!g.trending, featured: !!g.featured,
    })))
  },

  'GET /api/logs': async (req, res, user, url) => {
    const limit = Math.min(Number(url.searchParams.get('limit') || 10), 50)
    const rows = user
      ? db.prepare('SELECT * FROM spins WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(user.id, limit)
      : db.prepare('SELECT * FROM spins ORDER BY id DESC LIMIT ?').all(limit)
    // No usernames on the public feed: the lobby ticker only needs game + amounts.
    send(res, 200, rows.map((r) => ({
      status: 1, game_alias: r.alias,
      invest: r.bet, win_amo: r.win, win_status: r.win > 0 ? 1 : 0, time: r.created_at,
    })))
  },

  'POST /api/spin': async (req, res, user) => {
    const { alias, bet } = await body(req)
    if (!user) return fail(res, 401, 'belum login')
    const me = q.user.get(user.id)
    if (me.banned) return fail(res, 403, 'akun diblokir')
    const game = q.game.get(String(alias))
    if (!game || !game.enabled) return fail(res, 404, 'game tidak tersedia')
    if (game.kind !== 'engine') return fail(res, 400, 'game ini tidak pakai saldo DY01')
    const stake = BETS[alias]?.includes(Number(bet)) ? Number(bet) : null
    if (!stake) return fail(res, 400, 'bet tidak valid')
    if (me.balance < stake) return fail(res, 400, 'saldo kurang')

    const play = playWithChance(alias, stake, game.win_chance)
    const win = Math.round(play.winX * stake)
    const balance = me.balance - stake + win
    q.balance.run(balance, me.id)
    db.prepare('INSERT INTO spins (user_id, alias, bet, win, detail, created_at) VALUES (?,?,?,?,?,?)')
      .run(me.id, alias, stake, win, JSON.stringify(play.detail), now())
    send(res, 200, { balance, bet: stake, win, detail: play.detail })
  },

  // ------------------------------------------------------------ vendor slots
  // Two calls per round, same wallet as everything else: the frame charges the stake
  // when the reels start, then credits whatever the round (or its bonus) paid out.
  'POST /api/vendor/bet': async (req, res, user) => {
    const { alias, bet } = await body(req)
    if (!user) return fail(res, 401, 'belum login')
    const me = q.user.get(user.id)
    if (me.banned) return fail(res, 403, 'akun diblokir')
    const game = q.game.get(String(alias))
    if (!game || !game.enabled || game.kind !== 'iframe') return fail(res, 404, 'game tidak tersedia')
    const stake = VENDOR_BETS.includes(Number(bet)) ? Number(bet) : null
    if (!stake) return fail(res, 400, 'bet tidak valid')
    if (me.balance < stake) return fail(res, 400, 'saldo kurang')
    const balance = me.balance - stake
    q.balance.run(balance, me.id)
    const info = db.prepare('INSERT INTO spins (user_id, alias, bet, win, detail, created_at) VALUES (?,?,?,?,?,?)')
      .run(me.id, game.alias, stake, 0, JSON.stringify({ vendor: 1 }), now())
    send(res, 200, { balance, bet: stake, spinId: Number(info.lastInsertRowid) })
  },

  'POST /api/vendor/win': async (req, res, user) => {
    const { alias, spinId, win } = await body(req)
    if (!user) return fail(res, 401, 'belum login')
    const me = q.user.get(user.id)
    if (me.banned) return fail(res, 403, 'akun diblokir')
    const game = q.game.get(String(alias))
    if (!game) return fail(res, 404, 'game tidak ada')
    const row = db.prepare('SELECT * FROM spins WHERE id = ? AND user_id = ?').get(Number(spinId) || -1, me.id)
    const cap = (row ? row.bet : 10000) * MAX_WIN_X      // reloaded bonus keeps the cap, row or not
    const amount = Math.min(Math.max(0, Math.floor(Number(win) || 0)), cap)
    if (!amount) return send(res, 200, { balance: me.balance, win: 0 })
    const balance = me.balance + amount
    q.balance.run(balance, me.id)
    if (row) db.prepare('UPDATE spins SET win = ? WHERE id = ?').run(amount, row.id)
    else db.prepare('INSERT INTO spins (user_id, alias, bet, win, detail, created_at) VALUES (?,?,?,?,?,?)')
      .run(me.id, game.alias, 0, amount, JSON.stringify({ vendor: 1, bonus: 1 }), now())
    send(res, 200, { balance, win: amount })
  },

  'POST /api/wallet/deposit': async (req, res, user) => {
    const { amount } = await body(req)
    if (!user) return fail(res, 401, 'belum login')
    const amt = Math.floor(Number(amount))
    if (!Number.isFinite(amt) || amt < 10000 || amt > 100000000) return fail(res, 400, 'nominal 10.000 - 100.000.000')
    const me = q.user.get(user.id)
    q.balance.run(me.balance + amt, me.id)
    db.prepare('INSERT INTO txs (user_id, kind, amount, status, note, created_at) VALUES (?,?,?,?,?,?)')
      .run(me.id, 'deposit', amt, 'done', 'demo instan', now())
    send(res, 200, { balance: me.balance + amt, amount: amt })
  },

  'POST /api/wallet/withdraw': async (req, res, user) => {
    const { amount, bank = '' } = await body(req)
    if (!user) return fail(res, 401, 'belum login')
    const amt = Math.floor(Number(amount))
    if (!Number.isFinite(amt) || amt < 50000) return fail(res, 400, 'minimum tarik 50.000')
    const me = q.user.get(user.id)
    // WD yang masih pending ikut "dipesan" supaya saldo yang sama tidak bisa ditarik dua kali
    const pending = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM txs
                                WHERE user_id = ? AND kind = 'withdraw' AND status = 'pending'`).get(me.id).s
    if (me.balance - pending < amt) return fail(res, 400, 'saldo kurang (masih ada tarik dana pending)')
    db.prepare('INSERT INTO txs (user_id, kind, amount, status, note, created_at) VALUES (?,?,?,?,?,?)')
      .run(me.id, 'withdraw', amt, 'pending', String(bank).slice(0, 30), now())
    send(res, 200, { ok: true, status: 'pending', amount: amt, message: 'menunggu approve admin' })
  },

  'POST /api/bonus/daily': async (req, res, user) => {
    if (!user) return fail(res, 401, 'belum login')
    const me = q.user.get(user.id)
    if (me.last_bonus && Date.now() - Date.parse(me.last_bonus) < 86400000) {
      return fail(res, 429, 'bonus harian sudah diklaim, coba lagi besok')
    }
    const balance = me.balance + DAILY_BONUS
    q.balance.run(balance, me.id)
    db.prepare('UPDATE users SET last_bonus = ? WHERE id = ?').run(now(), me.id)
    db.prepare('INSERT INTO txs (user_id, kind, amount, status, note, created_at) VALUES (?,?,?,?,?,?)')
      .run(me.id, 'bonus', DAILY_BONUS, 'done', 'bonus harian', now())
    send(res, 200, { balance, amount: DAILY_BONUS })
  },

  'GET /api/wallet/txs': async (req, res, user) => {
    if (!user) return fail(res, 401, 'belum login')
    send(res, 200, db.prepare('SELECT * FROM txs WHERE user_id = ? ORDER BY id DESC LIMIT 40').all(user.id))
  },

  // ringkasan referral buat member: kode sendiri + downline + total bonus yang sudah didapat
  'GET /api/referral': async (req, res, user) => {
    if (!user) return fail(res, 401, 'belum login')
    const me = q.user.get(user.id)
    const invited = db.prepare('SELECT username, created_at FROM users WHERE referred_by = ? ORDER BY id DESC').all(me.id)
    const earned = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM txs
                               WHERE user_id = ? AND kind = 'referral'`).get(me.id).s
    send(res, 200, {
      code: me.ref_code, bonus: REF_BONUS, welcome: REF_WELCOME,
      count: invited.length, earned, invited,
    })
  },

  // ------------------------------------------------------------ admin
  'GET /api/admin/users': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    // hitungan undangan ikut filter: referal dari akun testing tidak dihitung
    const invited = new Map()
    for (const r of db.prepare('SELECT referred_by, username, is_admin FROM users WHERE referred_by IS NOT NULL').all()) {
      if (!isMember(r)) continue
      invited.set(r.referred_by, (invited.get(r.referred_by) || 0) + 1)
    }
    const rows = db.prepare(`SELECT u.*,
        (SELECT COUNT(*) FROM spins s WHERE s.user_id = u.id) spins,
        (SELECT COALESCE(SUM(bet),0) FROM spins s WHERE s.user_id = u.id) staked,
        (SELECT COALESCE(SUM(win),0) FROM spins s WHERE s.user_id = u.id) won
      FROM users u ORDER BY u.id`).all().filter(isMember)
    send(res, 200, rows.map((u) => ({
      ...publicUser(u), spins: u.spins, staked: u.staked, won: u.won,
      created_at: u.created_at, invited: invited.get(u.id) || 0,
    })))
  },

  'POST /api/admin/balance': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    const { userId, delta, note = 'adjust admin' } = await body(req)
    const target = q.user.get(Number(userId))
    if (!target) return fail(res, 404, 'user tidak ada')
    const d = Math.floor(Number(delta))
    if (!Number.isFinite(d) || d === 0) return fail(res, 400, 'delta tidak valid')
    const balance = Math.max(0, target.balance + d)
    q.balance.run(balance, target.id)
    db.prepare('INSERT INTO txs (user_id, kind, amount, status, note, created_at) VALUES (?,?,?,?,?,?)')
      .run(target.id, 'adjust', d, 'done', String(note).slice(0, 60), now())
    send(res, 200, { ok: true, balance })
  },

  'POST /api/admin/ban': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    const { userId, banned } = await body(req)
    const target = q.user.get(Number(userId))
    if (!target) return fail(res, 404, 'user tidak ada')
    if (target.is_admin) return fail(res, 400, 'admin tidak bisa diblokir')
    db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(banned ? 1 : 0, target.id)
    if (banned) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id)
    send(res, 200, { ok: true, banned: !!banned })
  },

  'GET /api/admin/withdrawals': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    // Antrian uang sengaja TIDAK difilter: semua request pending harus tetap kelihatan.
    const rows = db.prepare(`SELECT t.*, u.username, u.balance FROM txs t JOIN users u ON u.id = t.user_id
                             WHERE t.kind = 'withdraw' ORDER BY (t.status = 'pending') DESC, t.id DESC LIMIT 50`).all()
    send(res, 200, rows)
  },

  // referral dari sisi admin: siapa mengundang siapa + total bonus yang sudah dibayar
  // (baris & total sama-sama hanya menghitung member asli, jadi angkanya konsisten)
  'GET /api/admin/referrals': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    const rows = db.prepare(`SELECT u.id, u.username, u.created_at, r.username referrer
      FROM users u JOIN users r ON r.id = u.referred_by ORDER BY u.id DESC`).all()
      .filter((r) => !isTestAccount(r) && !isTestAccount({ username: r.referrer }))
    const welcome = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM txs WHERE kind = 'referral_welcome' AND user_id = ?`)
    const reward = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM txs WHERE kind = 'referral' AND note = ?`)
    let total = 0
    for (const r of rows) total += welcome.get(r.id).s + reward.get(`undang @${r.username}`).s
    send(res, 200, { rows, txs: rows.length * 2, total })
  },

  'POST /api/admin/withdraw': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    const { txId, action } = await body(req)
    const tx = db.prepare('SELECT * FROM txs WHERE id = ?').get(Number(txId))
    if (!tx || tx.kind !== 'withdraw') return fail(res, 404, 'request tidak ada')
    if (tx.status !== 'pending') return fail(res, 400, 'sudah diproses')
    const target = q.user.get(tx.user_id)
    if (action === 'approve') {
      if (target.balance < tx.amount) return fail(res, 400, 'saldo user kurang')
      q.balance.run(target.balance - tx.amount, target.id)
    }
    db.prepare('UPDATE txs SET status = ? WHERE id = ?').run(action === 'approve' ? 'done' : 'rejected', tx.id)
    send(res, 200, { ok: true, status: action })
  },

  'GET /api/admin/stats': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    const s = db.prepare(`SELECT COUNT(*) spins, COALESCE(SUM(bet),0) staked, COALESCE(SUM(win),0) won FROM spins`).get()
    const users = db.prepare('SELECT username, is_admin FROM users').all().filter(isMember).length
    const pending = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(amount),0) total FROM txs WHERE kind='withdraw' AND status='pending'`).get()
    send(res, 200, {
      users, spins: s.spins, staked: s.staked, won: s.won,
      ggr: s.staked - s.won,
      rtp: s.staked ? s.won / s.staked : 0,
      pending: pending.n, pendingAmount: pending.total,
    })
  },

  'POST /api/admin/game': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    const { alias, enabled } = await body(req)
    if (!q.game.get(String(alias))) return fail(res, 404, 'game tidak ada')
    db.prepare('UPDATE games SET enabled = ? WHERE alias = ?').run(enabled ? 1 : 0, String(alias))
    send(res, 200, { ok: true, enabled: !!enabled })
  },

  'GET /api/admin/games': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    send(res, 200, q.games.all().map((g) => ({
      alias: g.alias, name: g.name, kind: g.kind, enabled: !!g.enabled,
      win_chance: g.win_chance ?? null, natural: naturalChance(g), chance_editable: !!chanceMode(g),
    })))
  },

  // set / reset peluang menang satu game (null = kembali ke alami)
  'POST /api/admin/game/chance': async (req, res, user) => {
    if (!user?.is_admin) return fail(res, 403, 'khusus admin')
    const { alias, chance } = await body(req)
    const game = q.gameFull.get(String(alias))         // game yang disembunyikan tetap bisa diatur
    if (!game) return fail(res, 404, 'game tidak ada')
    const mode = chanceMode(game)
    if (!mode) return fail(res, 400, 'game ini mengikuti aturan meja / vendor')

    if (chance === null || chance === '' || chance === undefined) {
      db.prepare('UPDATE games SET win_chance = NULL WHERE alias = ?').run(game.alias)
      if (mode !== 'slot') db.prepare('UPDATE games SET probable_win = ? WHERE alias = ?').run(jdump(NATURAL_WIN.get(game.alias)), game.alias)
      console.log(`[admin] ${game.alias} win chance -> alami`)
      return send(res, 200, { ok: true, alias: game.alias, chance: null, natural: naturalChance(game) })
    }

    const value = Math.round(Number(chance) * 10) / 10
    if (!Number.isFinite(value) || value < 0 || value > 100) return fail(res, 400, 'peluang menang 0-100')
    if (mode === 'engine') {
      // -1 = nggak pernah menang (mtRand 0-100), 100 = selalu menang
      db.prepare('UPDATE games SET probable_win = ? WHERE alias = ?').run(jdump(value <= 0 ? -1 : value), game.alias)
    } else if (mode === 'weights') {
      // number_slot: [kalah, menang 1x, 2x, 3x] — rasio antar level menang tetap
      const lose = value <= 0 ? 101 : 100 - value
      db.prepare('UPDATE games SET probable_win = ? WHERE alias = ?')
        .run(jdump([lose, value * 0.8, value * 0.12, value * 0.08]), game.alias)
    }
    db.prepare('UPDATE games SET win_chance = ? WHERE alias = ?').run(value, game.alias)
    console.log(`[admin] ${game.alias} win chance -> ${value}%`)
    send(res, 200, { ok: true, alias: game.alias, chance: value })
  },
}

// ---------------------------------------------------------------- casino engine API
// The shape their React components already speak (Casino-App/frontend/src/api.js):
// games/{alias} for the play page config, then play/invest -> play/end (+ cancel to forfeit).
q.gameFull = db.prepare('SELECT rowid AS id, * FROM games WHERE alias = ?')

const gameBrief = (g) => ({
  id: g.id, name: g.name, alias: g.alias, image: g.image,
  trending: !!g.trending, featured: !!g.featured,
  win: g.pct_win, min_limit: g.min_limit, max_limit: g.max_limit, short_desc: g.short_desc,
})

function apiGameDetail(req, res, user, alias) {
  const g = q.gameFull.get(alias)
  if (!g) return fail(res, 404, 'Game not found')
  const detail = {
    ...gameBrief(g),
    instruction: g.instruction,
    level: jload(g.level, null),
    probable_win: jload(g.probable_win, 0),
    invest_back: !!g.invest_back,
  }
  if (['number_guess', 'mines', 'poker'].includes(alias)) detail.guess_bonuses = store.guessBonuses(alias)
  send(res, 200, detail)
}

async function apiPlay(action, alias, req, res, user) {
  if (!user) return fail(res, 401, 'belum login')
  const me = q.user.get(user.id)
  if (me.banned) return fail(res, 403, 'akun diblokir')

  if (action === 'cancel') {
    const log = store.getRunningLog(me.id, alias)
    if (!log) return send(res, 200, { cancelled: false })
    store.updateLog(log.id, { status: 1, win_status: 0 })
    return send(res, 200, { cancelled: true, game_log_id: log.id })
  }

  let payload = {}
  try { payload = await body(req) } catch (e) { return fail(res, 400, String(e.message || e)) }
  try {
    const game = getCasinoGame(alias, me, payload, store)
    return send(res, 200, action === 'invest' ? game.play() : game.complete())
  } catch (e) {
    const msg = String(e.message || e)
    console.error('[casino]', alias, action, msg)
    return fail(res, msg === 'Game not found' ? 404 : 400, msg)
  }
}

// ---------------------------------------------------------------- static
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json', '.atlas': 'text/plain',
  '.plist': 'text/plain', '.fnt': 'text/plain', '.bin': 'application/octet-stream',
}

async function staticFile(req, res, url) {
  if (!existsSync(DIST)) return fail(res, 503, 'frontend belum di-build (npm run build di web/)')
  const rel = decodeURIComponent(url.pathname)
  const target = rel === '/' || rel === '' ? '/index.html' : rel
  const abs = resolvePath(DIST, '.' + target)
  if (!abs.startsWith(DIST)) return fail(res, 403, 'forbidden')          // traversal guard
  try {
    const data = await readFile(abs)
    // index.html must never be cached: it points at hashed bundles that change on every build.
    const cache = target.startsWith('/assets/') ? 'public, max-age=31536000, immutable'
      : target === '/index.html' ? 'no-cache' : 'public, max-age=60'
    res.writeHead(200, {
      'content-type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream',
      'cache-control': cache,
    })
    return res.end(data)
  } catch {
    try {
      return res.end(await readFile(join(DIST, 'index.html')))
    } catch { return fail(res, 404, 'not found') }
  }
}

// ---------------------------------------------------------------- server
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  if (req.method === 'OPTIONS') {
    return send(res, 204, '', {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    })
  }
  if (!url.pathname.startsWith('/api/')) return staticFile(req, res, url)

  const user = auth(req)

  // dynamic routes (the casino engine's contract)
  const casino = url.pathname.match(/^\/api\/play\/(invest|end|cancel)\/([A-Za-z0-9_]+)$/)
  if (req.method === 'POST' && casino) return apiPlay(casino[1], casino[2], req, res, user)
  const detail = url.pathname.match(/^\/api\/games\/([A-Za-z0-9_]+)$/)
  if (req.method === 'GET' && detail) return apiGameDetail(req, res, user, detail[1])

  const handler = routes[`${req.method} ${url.pathname}`]
  if (!handler) return fail(res, 404, 'no such endpoint')
  try {
    await handler(req, res, user, url)
  } catch (e) {
    const msg = String(e.message || e)
    console.error('[api]', url.pathname, msg)
    fail(res, msg === 'bad json' || msg === 'body too large' ? 400 : 500, msg)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dy01] api + static on http://127.0.0.1:${PORT}  (dist: ${existsSync(DIST) ? 'yes' : 'not built'})`)
})

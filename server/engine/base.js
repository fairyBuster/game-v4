/**
 * Base game engine — Node port of Casino-App/backend/app/engine/base.py (itself a port of the
 * original Xaxino Games\Game.php). Same lifecycle:
 *
 *   play()     validate -> fallback -> gameResult() -> debit stake, open the log (status 0)
 *   complete() custom logic for multi-step games, otherwise settle: credit the payout,
 *              mark the log finished, then the gameplay-bonus check.
 *
 * Payout model (kept from their fix, not the original bug): a game_result() that already
 * computed `win_amount` wins over the `invest * (1 + game.win / 100)` percentage model.
 */
import { WIN, LOSS, FINISHED, fmt, num, jload } from './store.js'

export class GameError extends Error {}

export class BaseGame {
  static alias = ''
  static SUITS = ['H', 'D', 'C', 'S']
  static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

  static freshDeck() {
    return this.SUITS.flatMap((s) => this.RANKS.map((r) => `${r}-${s}`))
  }

  resultShowOnStart = true
  hasCustomCompleteLogic = false

  constructor(alias, user, payload, store) {
    this.alias = alias
    this.user = user
    this.store = store
    this.payload = payload || {}
    this.game = store.getGame(alias)
    if (!this.game) throw new GameError('Game not found')
    this.extraStart = {}
    this.extraEnd = {}
    this.userSelect = this.payload.choose
  }

  // ---------------------------------------------------------------- config
  /** payload value, `def` when missing (their `p()` semantics) */
  p(key, def = null) {
    const v = this.payload[key]
    return v === undefined || v === null ? def : v
  }

  probableWin() {
    return num(jload(this.game.probable_win, 0), 0)
  }

  level() {
    return jload(this.game.level, null)
  }

  bonusPercent(chance) {
    const row = this.store.guessBonus(this.alias, chance)
    return row ? num(row.percent) : 0
  }

  currentBalance() {
    return num(this.store.getUser(this.user.id).balance)
  }

  // ---------------------------------------------------------------- flow
  play() {
    const invest = num(this.payload.invest, 0)
    if (invest <= 0) throw new GameError('Please enter a valid invest amount')
    this.validateStart()
    this.fallback(invest)

    const result = this.gameResult()
    const logId = this.investRow(invest, result)
    const res = { game_log_id: logId, balance: this.currentBalance(), finished: false }
    if (this.resultShowOnStart) res.result = result.result ?? null
    if (result.win_status !== undefined && result.win_status !== null) res.win_status = result.win_status
    return { ...res, ...this.extraStart }
  }

  complete() {
    const logId = num(this.payload.game_log_id, 0)
    const log = this.store.getLog(logId, this.user.id)
    if (!log) throw new GameError('Game Logs not found')
    if (log.status === FINISHED) throw new GameError('Game Log already completed')

    if (this.hasCustomCompleteLogic) {
      const custom = this.customCompleteLogic(log)
      if (custom) return { finished: true, ...custom }
    }
    return this.settle(log)
  }

  // ---------------------------------------------------------------- hooks
  // eslint-disable-next-line no-unused-vars
  validateStart() {}

  gameResult() {
    throw new Error('gameResult() not implemented')
  }

  // eslint-disable-next-line no-unused-vars
  customCompleteLogic(log) {
    return null
  }

  // ---------------------------------------------------------------- internals
  fallback(invest) {
    if (invest > this.currentBalance()) throw new GameError('Oops! You have no sufficient balance')
    if (this.store.getRunningLog(this.user.id, this.alias)) throw new GameError('1 game is in-complete. Please wait')
    if (invest > num(this.game.max_limit, 0)) throw new GameError('Please follow the maximum limit of invest')
    if (invest < num(this.game.min_limit, 0)) throw new GameError('Please follow the minimum limit of invest')
  }

  investRow(invest, result) {
    const newBalance = this.store.changeBalance(this.user.id, -invest)
    this.store.addTransaction(this.user.id, -invest, 'invest', `Invest to ${this.game.name}`, 'invest', newBalance)

    let userSelect = this.userSelect
    if (userSelect !== null && typeof userSelect === 'object') userSelect = JSON.stringify(userSelect)
    const mines = Math.trunc(num(this.payload.mines))

    return this.store.createGameLog({
      userId: this.user.id,
      alias: this.alias,
      userSelect: userSelect ?? null,
      result: result.result ?? null,
      winStatus: result.win_status || 0,
      invest,
      winAmo: fmt(result.win_amount || 0),
      mines,
      mineAvailable: mines,
    })
  }

  credit(amount, details = null) {
    const amt = fmt(amount)
    if (amt <= 0) return this.currentBalance()
    const newBalance = this.store.changeBalance(this.user.id, amt)
    this.store.addTransaction(this.user.id, amt, 'win_bonus', details || `Win bonus of ${this.game.name}`, 'win_bonus', newBalance)
    return newBalance
  }

  finishLog(log, fields = {}) {
    this.store.updateLog(log.id, { status: FINISHED, ...fields })
  }

  /** standard settlement: single-step games land here */
  settle(log) {
    let row = this.store.getLog(log.id, this.user.id) || log    // custom logic may have rewritten it
    const invest = num(row.bet, 0)
    let message, type, sound

    if (row.win_status === WIN || num(row.win) > 0) {
      const stored = num(row.win, 0)
      const payout = stored > 0 ? stored : invest * (1 + num(this.game.win, 0) / 100)
      this.credit(payout)
      this.store.updateLog(row.id, { win_amo: fmt(payout), win: Math.round(fmt(payout)), status: FINISHED })
      row = { ...row, win: Math.round(fmt(payout)) }
      message = 'Yahoo! You Win!!!'
      type = 'success'
      sound = 'win.wav'
    } else {
      this.finishLog(row)
      message = 'Oops! You Lost!!'
      type = 'danger'
      sound = 'lose.wav'
    }

    // Small fix vs their Python: the gameplay bonus is credited BEFORE the response is built, so
    // `bal` is the real post-bonus balance (theirs reported the pre-bonus number and relied on the
    // client calling refreshUser() afterwards).
    const bonus = this.store.checkAndGiveBonus(this.user.id, this.alias, this.game.name)

    const res = {
      finished: true,
      message,
      type,
      sound,
      result: jload(row.result, null),
      user_choose: jload(row.user_select, null),
      win_status: num(row.win) > 0 || row.win_status === WIN ? WIN : LOSS,
      win_amount: fmt(row.win),
      bal: this.currentBalance(),
      ...this.extraEnd,
    }
    if (bonus) res.gameplay_bonus = bonus
    return res
  }
}

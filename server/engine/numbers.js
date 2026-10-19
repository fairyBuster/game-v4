/**
 * Number & grid games — Node port of Casino-App/backend/app/engine/numbers.py
 * (NumberGuess / NumberSlot / ColorPrediction / Roulette / Keno).
 *
 * Same rules, same payout maths. Their column names (invest/win_amo) are read off the log row as
 * bet/win — see the COL_MAP in engine/store.js.
 */
import { BaseGame, GameError } from './base.js'
import { WIN, LOSS, fmt, num, jdump, jload, mtRand, rand } from './store.js'

export const ROULETTE_GROUPS = {
  '1_12': [...Array(12)].map((_, i) => i + 1),
  '13_24': [...Array(12)].map((_, i) => i + 13),
  '25_36': [...Array(12)].map((_, i) => i + 25),
  '1_18': [...Array(18)].map((_, i) => i + 1),
  '19_36': [...Array(18)].map((_, i) => i + 19),
  even: [...Array(18)].map((_, i) => (i + 1) * 2),
  odd: [...Array(18)].map((_, i) => i * 2 + 1),
  red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
  black: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
  '2_1_1': [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  '2_1_2': [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  '2_1_3': [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
}

/** multi-step: keep guessing until you hit the number or run out of tries */
class NumberGuess extends BaseGame {
  static alias = 'number_guess'
  resultShowOnStart = false
  hasCustomCompleteLogic = true

  gameResult() {
    return { result: String(mtRand(1, 100)) }
  }

  customCompleteLogic(log) {
    const raw = this.payload.number
    if (raw === undefined || raw === null || !/^-?\d+$/.test(String(raw).trim())) {
      throw new GameError('Please enter a valid number')
    }
    const number = parseInt(String(raw).trim(), 10)
    if (!(number >= 0 && number <= 100)) throw new GameError('Number must be between 0 and 100')

    const secret = parseInt(jload(log.result) || 0, 10)
    let selects = jload(log.user_select, []) || []
    if (!Array.isArray(selects)) selects = []
    selects.push(number)

    const maxTries = this.store.guessBonuses(this.alias).length
    const tryCount = num(log.try_count, 0) + 1
    const over = tryCount >= maxTries

    this.store.updateLog(log.id, {
      try_count: tryCount,
      user_select: jdump(selects),
      status: over ? 1 : 0,
    })

    if (number === secret) {
      const amount = (num(log.bet, 0) * this.bonusPercent(tryCount)) / 100
      this.credit(amount)
      this.store.updateLog(log.id, { win_status: WIN, status: 1, win_amo: fmt(amount) })
      return {
        finished: true, handled: true, gameSt: 1, win_status: WIN,
        message: `Correct! The number was ${secret}`, result: secret,
        win_amount: fmt(amount), tries: tryCount, user_choose: selects,
        bal: fmt(this.currentBalance()), type: 'success', sound: 'win.wav',
      }
    }

    if (over) {
      this.store.updateLog(log.id, { win_status: LOSS, status: 1 })
      return {
        finished: true, handled: true, gameSt: 1, win_status: LOSS,
        message: `The Number was ${secret}`, result: secret, tries: tryCount,
        user_choose: selects, bal: fmt(this.currentBalance()),
        type: 'danger', sound: 'lose.wav', win_amount: 0,
      }
    }

    const hint = number > secret ? 'low' : 'high'
    return {
      finished: false, gameSt: 0, win_amount: 0,
      message: number > secret ? 'The Number is high' : 'The Number is short',
      hint, tries: tryCount, max_tries: maxTries, number,
      next_bonus: `${this.bonusPercent(tryCount + 1)}%`,
      user_choose: selects, bal: fmt(this.currentBalance()),
    }
  }
}

/** three reels spin and repeat your digit 0-3 times; payout from the game's `level` list */
class NumberSlot extends BaseGame {
  static alias = 'number_slot'
  hasCustomCompleteLogic = true

  validateStart() {
    if (![...Array(10)].map((_, i) => String(i)).includes(String(this.p('choose')))) {
      throw new GameError('Pick a digit from 0 to 9')
    }
    this.userSelect = String(this.p('choose'))
  }

  gameResult() {
    // probable_win di sini array bobot kumulatif — jangan lewat probableWin(),
    // Number([50,40,6,4]) = NaN jadi selalu jatuh ke nilai default
    const cfg = jload(this.game.probable_win, null)
    const thresholds = Array.isArray(cfg) && cfg.length >= 3 ? cfg : [50, 40, 6, 4]
    const roll = mtRand(0, 100)
    const choose = parseInt(this.p('choose'), 10)

    let level
    if (thresholds[0] > roll) level = 0
    else if (thresholds[0] + thresholds[1] > roll) level = 1
    else if (thresholds[0] + thresholds[1] + thresholds[2] > roll) level = 2
    else level = 3

    const result = Array(level).fill(choose)
    let left = 3 - level
    while (left > 0) {
      const value = mtRand(0, 9)
      if (value !== choose) {
        result.push(value)
        left -= 1
      }
    }
    // shuffle (their random.shuffle)
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return { win_status: level, result }
  }

  customCompleteLogic(log) {
    const levels = this.level() || []
    const levelIndex = num(log.win_status, 0) - 1
    let amount = 0
    let winner = false

    if (levelIndex >= 0 && levelIndex < levels.length) {
      amount = (num(log.bet, 0) * num(levels[levelIndex])) / 100
      this.credit(amount)
      winner = true
    }
    this.store.updateLog(log.id, { status: 1, win_amo: winner ? fmt(amount) : num(log.win, 0) })

    return {
      finished: true, handled: true, win_amount: fmt(amount),
      user_choose: log.user_select, result: jload(log.result, null),
      win_status: winner ? WIN : LOSS,
      message: winner ? `Yahoo! You Win for ${log.win_status} Time !!!` : 'Oops! You Lost!!',
      type: winner ? 'success' : 'danger',
      sound: winner ? 'win.wav' : 'lose.wav',
      bal: fmt(this.currentBalance()),
    }
  }
}

class ColorPrediction extends BaseGame {
  static alias = 'color_prediction'
  static GROUPS = { green: [1, 3, 5, 7, 9], violet: [0, 5], red: [2, 4, 6, 8, 0] }

  validateStart() {
    const choice = String(this.p('choose'))
    if (!Object.hasOwn(ColorPrediction.GROUPS, choice) && ![...Array(10)].map((_, i) => String(i)).includes(choice)) {
      throw new GameError('Pick a color or a number')
    }
    this.userSelect = choice
  }

  gameResult() {
    const win = mtRand(0, 100) <= this.probableWin() ? WIN : LOSS
    const choice = String(this.p('choose'))
    const invest = num(this.p('invest'))
    const options = [...Array(10)].map((_, i) => i)
    let ratio = 0
    let result

    if (Object.hasOwn(ColorPrediction.GROUPS, choice)) {
      const group = ColorPrediction.GROUPS[choice]
      if (win) {
        result = group[Math.floor(Math.random() * group.length)]
        if (choice === 'green') ratio = result === 5 ? 1.5 : 2
        else if (choice === 'violet') ratio = 4.5
        else ratio = result === 0 ? 1.5 : 2
      } else {
        const outside = options.filter((o) => !group.includes(o))
        result = outside[Math.floor(Math.random() * outside.length)]
      }
    } else {
      result = parseInt(choice, 10)
      if (win) ratio = 9
      else {
        const others = options.filter((o) => o !== result)
        result = others[Math.floor(Math.random() * others.length)]
      }
    }
    return { win_status: win, result, win_amount: invest * ratio }
  }
}

class Roulette extends BaseGame {
  static alias = 'roulette'

  validateStart() {
    const choice = String(this.p('choose'))
    const valid = new Set([...Object.keys(ROULETTE_GROUPS), ...[...Array(37)].map((_, i) => String(i))])
    if (!valid.has(choice)) throw new GameError('Invalid roulette bet')
    this.userSelect = choice
  }

  gameResult() {
    const choice = String(this.p('choose'))
    // branch instead of a dict lookup: the default would have to evaluate int('red')
    const numbers = Object.hasOwn(ROULETTE_GROUPS, choice) ? ROULETTE_GROUPS[choice] : [parseInt(choice, 10)]
    const number = rand(1, 36)                       // their wheel has no zero pocket
    const win = numbers.includes(number) ? WIN : LOSS
    const winAmo = (num(this.p('invest')) * 36) / numbers.length
    return { win_status: win, result: number, win_amount: winAmo }
  }
}

class Keno extends BaseGame {
  static alias = 'keno'

  validateStart() {
    const choose = this.p('choose')
    if (!Array.isArray(choose) || !choose.length) throw new GameError('Pick at least 1 number')
    const numbers = []
    for (const value of choose) {
      if (!/^\d+$/.test(String(value)) || !(Number(value) >= 1 && Number(value) <= 80)) {
        throw new GameError('Numbers must be between 1 and 80')
      }
      numbers.push(parseInt(value, 10))
    }
    this.userSelect = numbers
  }

  gameResult() {
    const level = this.level() || {}
    const maxSelect = num(level.max_select_number, 10)
    const selects = [...this.userSelect]

    const win = mtRand(0, 100) <= this.probableWin() ? WIN : LOSS
    let winAmo = 0
    let drawn = []
    let matchNumber = []

    if (win) {
      const matches = rand(4, maxSelect)
      drawn = selects.slice(0, matches)
      while (drawn.length < maxSelect) {
        const value = rand(1, 80)
        if (!drawn.includes(value) && !selects.includes(value)) drawn.push(value)
      }
      let commission = 0
      for (const entry of level.levels || []) {
        if (num(entry.level, 0) === matches) { commission = num(entry.percent, 0); break }
      }
      winAmo = num(this.p('invest')) * (1 + commission / 100)
      matchNumber = selects.slice(0, matches)
    } else {
      while (drawn.length < maxSelect) {
        const value = rand(1, 80)
        if (!drawn.includes(value) && !selects.includes(value)) drawn.push(value)
      }
    }

    Object.assign(this.extraStart, { match_number: matchNumber, user_select: selects })
    return { win_status: win, result: drawn, win_amount: winAmo }
  }
}

export const GAMES = [NumberGuess, NumberSlot, ColorPrediction, Roulette, Keno]

/**
 * Single-decision games — Node port of Casino-App/backend/app/engine/quick.py
 * (HeadTail / DiceRolling / RockPaperScissors / CardFinding / SpinWheel / PoolNumber / CasinoDice).
 *
 * The win/lose roll is `mtRand(0,100) <= probable_win` from the games table, and the payout is
 * `invest * (1 + game.win/100)` in settle(). Same house maths as their build, on purpose.
 */
import { BaseGame, GameError } from './base.js'
import { WIN, LOSS, num, mtRand, rand } from './store.js'

class HeadTail extends BaseGame {
  static alias = 'head_tail'

  validateStart() {
    if (!['head', 'tail'].includes(String(this.p('choose')))) throw new GameError('Choose head or tail')
  }

  gameResult() {
    const choose = String(this.p('choose'))
    if (mtRand(0, 100) <= this.probableWin()) return { win_status: WIN, result: choose }
    return { win_status: LOSS, result: choose === 'head' ? 'tail' : 'head' }
  }
}

class DiceRolling extends BaseGame {
  static alias = 'dice_rolling'

  validateStart() {
    if (!['1', '2', '3', '4', '5', '6'].includes(String(this.p('choose')))) throw new GameError('Choose a dice face from 1 to 6')
    this.userSelect = String(this.p('choose'))
  }

  gameResult() {
    const choose = String(this.p('choose'))
    if (mtRand(0, 100) <= this.probableWin()) return { win_status: WIN, result: choose }
    let value = choose
    for (let i = 0; i < 100; i++) {
      value = String(rand(1, 6))
      if (value !== choose) break
    }
    return { win_status: LOSS, result: value }
  }
}

class RockPaperScissors extends BaseGame {
  static alias = 'rock_paper_scissors'
  static BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' }
  static LOSES_TO = { rock: 'paper', paper: 'scissors', scissors: 'rock' }

  validateStart() {
    if (!Object.hasOwn(RockPaperScissors.BEATS, String(this.p('choose')))) throw new GameError('Choose rock, paper or scissors')
  }

  gameResult() {
    const choose = String(this.p('choose'))
    if (mtRand(0, 100) <= this.probableWin()) return { win_status: WIN, result: RockPaperScissors.BEATS[choose] }
    return { win_status: LOSS, result: RockPaperScissors.LOSES_TO[choose] }
  }
}

class CardFinding extends BaseGame {
  static alias = 'card_finding'

  validateStart() {
    if (!['black', 'red'].includes(String(this.p('choose')).toLowerCase())) throw new GameError('Choose black or red')
  }

  gameResult() {
    const choose = String(this.p('choose')).toLowerCase()
    if (mtRand(0, 100) <= this.probableWin()) return { win_status: WIN, result: choose === 'black' ? 'BLACK' : 'RED' }
    return { win_status: LOSS, result: choose === 'black' ? 'RED' : 'BLACK' }
  }
}

class SpinWheel extends BaseGame {
  static alias = 'spin_wheel'

  validateStart() {
    if (!['red', 'blue'].includes(String(this.p('choose')).toLowerCase())) throw new GameError('Choose red or blue')
  }

  gameResult() {
    const choose = String(this.p('choose')).toLowerCase()
    if (mtRand(0, 100) <= this.probableWin()) return { win_status: WIN, result: choose === 'blue' ? 'BLUE' : 'RED' }
    return { win_status: LOSS, result: choose === 'blue' ? 'RED' : 'BLUE' }
  }
}

class PoolNumber extends BaseGame {
  static alias = 'number_pool'

  validateStart() {
    if (!Array.from({ length: 8 }, (_, i) => String(i + 1)).includes(String(this.p('choose')))) {
      throw new GameError('Pick a pool number from 1 to 8')
    }
    this.userSelect = String(this.p('choose'))
  }

  gameResult() {
    const choose = String(this.p('choose'))
    if (mtRand(0, 100) <= this.probableWin()) return { win_status: WIN, result: Number(choose) }
    let value = choose
    for (let i = 0; i < 100; i++) {
      value = String(rand(1, 8))
      if (value !== choose) break
    }
    return { win_status: LOSS, result: Number(value) }
  }
}

/** win-chance slider: the payout follows the chance the player dialled in (99 / percent) */
class CasinoDice extends BaseGame {
  static alias = 'casino_dice'

  validateStart() {
    const chance = num(this.p('percent'))
    if (chance <= 0) throw new GameError('Please set your win chance')
    if (!(chance >= 2 && chance <= 98)) throw new GameError('Win chance must be between 2 and 98')
    if (!['low', 'high'].includes(String(this.p('choose')).toLowerCase())) throw new GameError('Choose low or high')
    this.userSelect = String(this.p('choose')).toLowerCase()
  }

  gameResult() {
    const winChance = num(this.p('percent'))
    const amount = num(this.p('invest'))
    const choose = String(this.p('choose')).toLowerCase()

    const lessThan = Math.trunc(winChance * 100)
    const greaterThan = 9900 - Math.trunc(winChance * 100) + 99
    const payout = Math.round((99 / winChance) * 10000) / 10000
    const winAmo = amount * payout

    let win, number
    if (winChance >= rand(1, 98)) {
      win = WIN
      number = choose === 'low' ? rand(100, lessThan) : rand(greaterThan, 9899)
    } else {
      win = LOSS
      number = choose === 'low' ? rand(lessThan + 1, 9899) : rand(100, greaterThan - 1)
    }

    let shown = String(number)
    if (shown.length < 4) shown = '0' + shown
    return { win_status: win, win_amount: winAmo, result: shown }
  }
}

export const GAMES = [HeadTail, DiceRolling, RockPaperScissors, CardFinding, SpinWheel, PoolNumber, CasinoDice]

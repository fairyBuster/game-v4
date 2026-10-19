/**
 * Casino-App game config — the 19 games' engine columns, copied from
 * Casino-App/backend/app/seed.py (name, alias, win%, min, max, invest_back,
 * probable_win, probable_win_demo, level, short_desc).
 *
 * One deliberate change: their stakes are pocket-sized (min 1, max 100/1000/10000) because their
 * demo player holds 1000. Ours is an IDR wallet, so every limit is ×1000 (min 1.000, max
 * 100.000 / 1.000.000 / 10.000.000) — and the gameplay bonus with it.
 */
export const CASINO_GAMES = [
  // name, alias, win%, min, max, invest_back, probable_win, probable_win_demo, level, desc
  ['Head & Tail', 'head_tail', 96, 1, 100, 1, 48, 100, null,
    'Pick HEAD or TAIL. Land on your side and you win the bonus on top of your stake back.'],
  ['Rock Paper Scissors', 'rock_paper_scissors', 110, 1, 100, 1, 45, 100, null,
    'Choose rock, paper or scissors. Rock beats scissors, scissors beats paper, paper beats rock.'],
  ['Spin Wheel', 'spin_wheel', 110, 1, 10000, 1, 45, 100, null,
    'Bet on RED or BLUE and spin the wheel. Land on your colour to win.'],
  ['Number Guessing', 'number_guess', null, 1, 100, 0, null, null, null,
    'Guess the secret number (1-100). Each wrong guess says higher or lower and raises the bonus.'],
  ['Dice Rolling', 'dice_rolling', 550, 1, 100, 1, 15, 100, null,
    'Pick a dice face from 1-6. If the dice lands on it you win.'],
  ['Card Finding', 'card_finding', 110, 1, 100, 1, 45, 100, null,
    'A random card is drawn - predict whether it is RED or BLACK.'],
  ['Number Slot', 'number_slot', null, 1, 100, 0, [50, 40, 6, 4], null, [100, 150, 200],
    'Pick a digit 0-9. Three reels spin - match 1, 2 or all 3 reels to win.'],
  ['Pool Number', 'number_pool', 700, 1, 1000, 1, 12, 100, null,
    'Pick one of the 8 pool balls. The drawn ball decides the winner.'],
  ['Roulette', 'roulette', null, 1, 1000, 0, null, null, null,
    'European roulette - bet a number, colour, range, parity or column. Straight numbers pay 36x.'],
  ['Casino Dice', 'casino_dice', null, 1, 1000, 0, null, null, null,
    'Set your win chance and bet LOW or HIGH. The tighter the range, the bigger the payout.'],
  ['Keno', 'keno', null, 10, 100, 0, 30, 100,
    { max_select_number: 10, levels: [{ level: 4, percent: 10 }, { level: 5, percent: 20 }, { level: 6, percent: 30 }, { level: 7, percent: 40 }, { level: 8, percent: 50 }, { level: 9, percent: 60 }, { level: 10, percent: 70 }] },
    'Pick up to 10 numbers from 1-80. The more of yours are drawn, the bigger the payout.'],
  ['Black Jack', 'blackjack', 100, 10, 100, 0, 0, null, null,
    'Beat the dealer without going over 21. A tie refunds your bet.'],
  ['Mines', 'mines', null, 10, 100, 0, 100, 100, null,
    'Choose how many mines hide in the 5x5 grid. Dig gold to raise the multiplier, cash out any time.'],
  ['Poker', 'poker', null, 10, 100, 0, 50, 100, null,
    'Five-card draw - see 3 cards, then CALL to reveal the last 2 or FOLD. Bigger hands pay bigger.'],
  ['Color Prediction', 'color_prediction', null, 10, 100, 0, 11, 100, null,
    'Predict the draw: a number (9x), green (2x), red (2x) or violet (4.5x).'],
  ['Crazy Times', 'crazy_times', null, 10, 100, 0, 15, 50, [30, 40, 50, 60],
    'Bet on 1, 2, 5, 10 or one of the four bonus games (coin flip, pachinko, cash hunt, crazy time).'],
  ['Dream Catcher', 'dream_catcher', 0, 1, 1000, 0,
    { one: 43, two: 28, five: 13, ten: 7, twenty: 4, forty: 2, twox: 2, sevenx: 1 },
    { one: 43, two: 28, five: 13, ten: 7, twenty: 4, forty: 2, twox: 1, sevenx: 2 }, null,
    "Bet 1, 2, 5, 10, 20 or 40. A '2x' or '7x' segment spins again with a multiplier."],
  ['Andar Bahar', 'andar_bahar', 90, 1, 1000, 1, 50, 20, null,
    'Indian card game - bet ANDAR or BAHAR. First side to match the joker card wins.'],
  ['Pai Gow Poker', 'pai_gow_poker', 90, 1, 1000, 1, 50, null, null,
    'Arrange 7 cards into a 5-card high hand and a 2-card low hand, then face the dealer.'],
]

export const LIMIT_SCALE = 1000
export const BONUS_SCALE = 1000

/** guess bonuses, straight from their seed (mines 1-20%, poker 50→5%, number_guess 130→10%) */
export const GUESS_BONUSES = [
  ...Array.from({ length: 20 }, (_, i) => ['mines', i + 1, i + 1]),
  ...[50, 45, 40, 35, 30, 25, 20, 15, 10, 5].map((p, i) => ['poker', i + 1, p]),
  ...[130, 110, 100, 90, 10].map((p, i) => ['number_guess', i + 1, p]),
]

export const SETTINGS = {
  cur_text: 'IDR',
  cur_sym: 'Rp',
  game_play: '1',
  gameplay_number_for_bonus: '5',
  gameplay_bonus: String(10 * BONUS_SCALE),
}

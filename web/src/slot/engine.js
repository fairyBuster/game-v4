// Slot engine — 5 reels x 3 rows, 20 fixed lines. Own logic, art cloned from DY01.
// Symbols carry a weight (how often they drop) and pays per line for 3/4/5 of a kind.
// RTP is not declared here: tools measure it (see engine.test.mjs) and the pays are tuned
// until the measurement lands where we want it.

export const REELS = 5
export const ROWS = 3
export const LINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 2, 2, 2, 1], [1, 0, 0, 0, 1], [1, 2, 1, 2, 1],
  [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [1, 0, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 2, 1, 0, 1], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 2, 2, 0], [2, 0, 0, 0, 2],
]

// id, image (sliced out of the bundle's own icon sheets — medals, gift box, coin frame,
// money bag — with tools/slice_sheet.py, which normalises each icon onto a square frame so
// they all render at the same visual weight), weight, [pay3, pay4, pay5] in line-bet units.
export const SYMBOLS = [
  { id: 'wild', img: '/dy01/symbols/wild.png', name: 'Crown Medal', weight: 2, pays: [200, 800, 4000], wild: true },
  { id: 'scatter', img: '/dy01/symbols/scatter.png', name: 'Treasure', weight: 3, scatter: true },
  { id: 'coins', img: '/dy01/symbols/coins.png', name: 'Coin Frame', weight: 6, pays: [110, 330, 1100] },
  { id: 'bag', img: '/dy01/symbols/bag.png', name: 'Money Bag', weight: 8, pays: [90, 270, 900] },
  { id: 'mpink', img: '/dy01/symbols/medal_pink.png', name: 'Pink Medal', weight: 10, pays: [65, 200, 650] },
  { id: 'mgreen', img: '/dy01/symbols/medal_green.png', name: 'Green Medal', weight: 12, pays: [55, 160, 550] },
  { id: 'mpurple', img: '/dy01/symbols/medal_purple.png', name: 'Purple Medal', weight: 14, pays: [45, 130, 450] },
  { id: 'mred', img: '/dy01/symbols/medal_red.png', name: 'Red Medal', weight: 16, pays: [35, 105, 350] },
  { id: 'mblue', img: '/dy01/symbols/medal_blue.png', name: 'Blue Medal', weight: 18, pays: [25, 80, 260] },
  { id: 'mteal', img: '/dy01/symbols/medal_teal.png', name: 'Teal Medal', weight: 20, pays: [22, 66, 220] },
  { id: 'msilver', img: '/dy01/symbols/medal_silver.png', name: 'Silver Medal', weight: 22, pays: [18, 52, 175] },
]

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0)
const BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]))

// scatter pays in total-bet units, plus the free-spin award
export const SCATTER = { 3: { bet: 1, spins: 8 }, 4: { bet: 5, spins: 12 }, 5: { bet: 20, spins: 20 } }

function cell(rng) {
  let r = rng() * TOTAL_WEIGHT
  for (const s of SYMBOLS) {
    r -= s.weight
    if (r < 0) return s.id
  }
  return SYMBOLS[SYMBOLS.length - 1].id
}

/** reel -> row grid of symbol ids */
export function spin(rng = Math.random) {
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => cell(rng)))
}

/**
 * Resolve one grid. `bet` is the total stake per spin (lines are fixed at 20),
 * so one line bet = bet / LINES.length.
 * -> { total, lineWins: [{line, symbol, count, amount, cells}], scatter, spins }
 */
export function evaluate(grid, bet) {
  const lineBet = bet / LINES.length
  const lineWins = []

  LINES.forEach((line, li) => {
    const syms = line.map((row, reel) => grid[reel][row])
    let base = null
    for (let i = 0; i < REELS; i++) {
      const s = BY_ID[syms[i]]
      if (s.scatter) break
      if (s.wild) continue
      base = s
      break
    }
    if (!base) base = BY_ID.wild            // all-wild line pays the wild's own row
    let count = 0
    for (let i = 0; i < REELS; i++) {
      const s = BY_ID[syms[i]]
      if (s.id === base.id || s.wild) count++
      else break
    }
    if (count >= 3) {
      const amount = (base.pays[count - 3] || 0) * lineBet
      if (amount > 0) {
        lineWins.push({
          line: li, symbol: base.id, count, amount,
          cells: line.slice(0, count).map((row, reel) => [reel, row]),
        })
      }
    }
  })

  const scatters = grid.flat().filter((id) => BY_ID[id].scatter).length
  const sc = scatters >= 3 ? SCATTER[Math.min(scatters, 5)] : null
  const total = lineWins.reduce((s, w) => s + w.amount, 0) + (sc ? sc.bet * bet : 0)
  return { total, lineWins, scatter: scatters, spins: sc ? sc.spins : 0 }
}

/**
 * Monte-Carlo RTP, free spins included (a free spin costs nothing, so its payout is
 * pure return — that is what pushes the effective number above the line paytable).
 */
export function measureRtp(spins = 200000, bet = 20, rng = Math.random) {
  let staked = 0
  let returned = 0
  let free = 0
  for (let i = 0; i < spins; i++) {
    staked += bet
    const r = evaluate(spin(rng), bet)
    returned += r.total
    for (let f = 0; f < r.spins; f++) {
      free++
      returned += evaluate(spin(rng), bet).total
    }
  }
  return returned / staked
}

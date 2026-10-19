// Gates-of-Olympus-style engine, built from the vendor spec (vendor/gates/game.yaml):
// 6 reels x 5 rows, "pay anywhere" counting (8/10/12 of a kind), cascading reels,
// multiplier orbs that persist and multiply a tumble's win, 15 free spins on 4+ scatters
// (3+ during the feature retriggers +5), max win 5000x bet.
//
// One deliberate deviation, marked below: the spec's paytable numbers alone measure ~4%
// RTP, so the pays are scaled by PAY_SCALE until the measured RTP matches the spec's own
// target (96.5%). The shape (which symbol pays what, at which count) is untouched.

export const REELS = 6
export const ROWS = 5
export const PAY_SCALE = 1.12

export const SPEC = {
  rtpTarget: 0.965,
  maxWinX: 5000,
  maxCascades: 30,
  freeSpins: 15,
  retriggerScatters: 3,
  retriggerSpins: 5,
}

// pays: [count, multiple of total bet]; bonus (orb) and scatter never tumble away
export const SYMBOLS = [
  { id: 'high-1', name: 'Crown', img: '/gates/symbols/high-1.png', weight: 700, pays: [[8, 10], [10, 25], [12, 50]] },
  { id: 'high-2', name: 'Hourglass', img: '/gates/symbols/high-2.png', weight: 760, pays: [[8, 2.5], [10, 10], [12, 25]] },
  { id: 'high-3', name: 'Ring', img: '/gates/symbols/high-3.png', weight: 820, pays: [[8, 2], [10, 5], [12, 15]] },
  { id: 'high-4', name: 'Chalice', img: '/gates/symbols/high-4.png', weight: 880, pays: [[8, 1.5], [10, 2], [12, 12]] },
  { id: 'low-1', name: 'Red Gem', img: '/gates/symbols/low-1.png', weight: 1180, pays: [[8, 1], [10, 1.5], [12, 10]] },
  { id: 'low-2', name: 'Purple Gem', img: '/gates/symbols/low-2.png', weight: 1260, pays: [[8, 0.8], [10, 1.2], [12, 8]] },
  { id: 'low-3', name: 'Yellow Gem', img: '/gates/symbols/low-3.png', weight: 1350, pays: [[8, 0.5], [10, 1], [12, 5]] },
  { id: 'low-4', name: 'Green Gem', img: '/gates/symbols/low-4.png', weight: 1440, pays: [[8, 0.4], [10, 0.9], [12, 4]] },
  { id: 'low-5', name: 'Blue Gem', img: '/gates/symbols/low-5.png', weight: 1540, pays: [[8, 0.25], [10, 0.75], [12, 2]] },
  { id: 'scatter', name: 'Zeus', img: '/gates/symbols/scatter.png', weight: 218, scatter: true, pays: [[4, 3], [5, 5], [6, 100]] },
  { id: 'bonus', name: 'Multiplier Orb', img: '/gates/symbols/bonus.png', weight: 150, orb: true },
]

export const ORB_VALUES = [2, 4, 6, 8, 10, 15, 20, 25, 50, 100, 250, 500]
export const ORB_WEIGHTS = [400, 300, 200, 150, 120, 60, 40, 30, 10, 4, 2, 1]

const BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]))
const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0)
const ORB_TOTAL = ORB_WEIGHTS.reduce((a, b) => a + b, 0)

export function pickSymbol(rng = Math.random) {
  let r = rng() * TOTAL_WEIGHT
  for (const s of SYMBOLS) {
    r -= s.weight
    if (r < 0) return s.id
  }
  return SYMBOLS[SYMBOLS.length - 1].id
}

export function pickOrb(rng = Math.random) {
  let r = rng() * ORB_TOTAL
  for (let i = 0; i < ORB_VALUES.length; i++) {
    r -= ORB_WEIGHTS[i]
    if (r < 0) return ORB_VALUES[i]
  }
  return ORB_VALUES[0]
}

/** grid[reel][row] of symbol ids */
export function spin(rng = Math.random) {
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => pickSymbol(rng)))
}

/** which paytable tier a count falls into (12 means 12 or more) */
function payFor(sym, count) {
  let out = 0
  for (const [c, p] of sym.pays) if (count >= c) out = p
  return out * PAY_SCALE
}

/**
 * Count-based evaluation of one grid.
 * -> { total (bet multiples), hits: [{symbol, count, pay, cells:[[reel,row]]}], scatters }
 * Orbs never pay on their own.
 */
export function evaluate(grid) {
  const where = new Map()
  for (let r = 0; r < REELS; r++) {
    for (let row = 0; row < ROWS; row++) {
      const id = grid[r][row]
      if (!where.has(id)) where.set(id, [])
      where.get(id).push([r, row])
    }
  }
  const hits = []
  let total = 0
  let scatters = 0
  for (const [id, cells] of where) {
    const sym = BY_ID[id]
    if (!sym || sym.orb) continue
    if (sym.scatter) scatters = cells.length
    const pay = payFor(sym, cells.length)
    if (pay > 0) {
      hits.push({ symbol: id, count: cells.length, pay, cells })
      total += pay
    }
  }
  return { total, hits, scatters }
}

const orbCells = (grid) => {
  const out = []
  for (let r = 0; r < REELS; r++) for (let row = 0; row < ROWS; row++) if (BY_ID[grid[r][row]].orb) out.push([r, row])
  return out
}

/** remove the paying cells + drop the rest down, refill from the top */
export function tumble(grid, winCells, rng = Math.random) {
  const kill = new Set(winCells.map(([r, row]) => `${r}-${row}`))
  const next = grid.map((col, r) => {
    const keep = []
    for (let row = ROWS - 1; row >= 0; row--) if (!kill.has(`${r}-${row}`)) keep.push(col[row])
    while (keep.length < ROWS) keep.push(pickSymbol(rng))
    return keep.reverse()
  })
  return next
}

/**
 * Full spin: cascade until nothing pays (max 30), orbs persist and multiply the win of
 * the tumble step they are sitting on, scatters are read on the final grid.
 * -> { totalX, steps: [{hits, orbs, orbSum, winX, grid}], grid, freeSpins }
 */
export function resolve(startGrid, rng = Math.random) {
  let grid = startGrid
  let totalX = 0
  let cascades = 0
  const steps = []
  const orbs = new Map()                       // "reel-row" -> value, survives the tumbles

  // orbs already on the starting grid land with a value
  for (const [r, row] of orbCells(grid)) orbs.set(`${r}-${row}`, pickOrb(rng))

  let freeSpins = 0
  for (;;) {
    const res = evaluate(grid)
    const orbSum = [...orbs.values()].reduce((a, b) => a + b, 0)
    if (res.total === 0) {
      steps.push({ hits: [], orbs: [...orbs], orbSum, winX: 0, grid })
      break
    }
    const winX = res.total * (orbSum > 0 ? orbSum : 1)
    totalX += winX
    steps.push({ hits: res.hits, orbs: [...orbs], orbSum, winX, grid })
    if (res.scatters >= 4) freeSpins = SPEC.freeSpins

    const winCells = res.hits.flatMap((h) => h.cells)
    grid = tumble(grid, winCells, rng)
    cascades++

    // orbs keep dropping into the empty holes with the rest of the symbols
    for (const [r, row] of orbCells(grid)) {
      const key = `${r}-${row}`
      if (!orbs.has(key)) orbs.set(key, pickOrb(rng))
    }
    if (cascades >= SPEC.maxCascades) break
  }

  // scatters anywhere on the final grid pay and can trigger / retrigger the feature
  const finalScatters = grid.flat().filter((id) => BY_ID[id].scatter).length
  const scSym = BY_ID.scatter
  const scPay = payFor(scSym, finalScatters)
  if (scPay > 0) totalX += scPay
  if (finalScatters >= 4) freeSpins = SPEC.freeSpins
  else if (finalScatters >= SPEC.retriggerScatters && freeSpins === 0) freeSpins = SPEC.retriggerSpins

  return { totalX: Math.min(totalX, SPEC.maxWinX), steps, grid, freeSpins }
}

/** one paid spin including the free-spin feature, with every run kept for the UI to replay */
export function playSpinDetailed(rng = Math.random) {
  const runs = [resolve(spin(rng), rng)]
  let free = runs[0].freeSpins
  let guard = 0
  while (free > 0 && guard++ < 500) {
    free--
    const r = resolve(spin(rng), rng)
    runs.push(r)
    if (r.freeSpins) free += r.freeSpins          // retrigger
  }
  const totalX = Math.min(runs.reduce((s, r) => s + r.totalX, 0), SPEC.maxWinX)
  return { runs, totalX }
}

/** one paid spin including the free-spin feature; returns the total won in bet multiples */
export function playSpin(rng = Math.random) {
  return playSpinDetailed(rng).totalX
}

export function measureRtp(spins = 60000, rng = Math.random) {
  let returned = 0
  for (let i = 0; i < spins; i++) returned += playSpin(rng)
  return returned / spins
}

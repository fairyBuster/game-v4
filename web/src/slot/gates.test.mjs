// Runnable checks for the Gates engine:  node src/slot/gates.test.mjs
import assert from 'node:assert/strict'
import { REELS, ROWS, SPEC, SYMBOLS, evaluate, playSpin, resolve, spin, tumble } from './gates.js'

const ids = new Set(SYMBOLS.map((s) => s.id))

// --- shape ---
const g = spin()
assert.equal(g.length, REELS)
assert.equal(g[0].length, ROWS)
for (const col of g) for (const c of col) assert.ok(ids.has(c), 'unknown symbol ' + c)

// Hand-built grid: place `extra` counts first, then cycle the paytable symbols evenly so
// no filler symbol can reach the 8-of-a-kind tier. grid[reel][row].
const POOL = ['high-1', 'high-2', 'high-3', 'high-4', 'low-1', 'low-2', 'low-3', 'low-4', 'low-5']
function makeGrid(extra) {
  const cells = []
  for (let r = 0; r < REELS; r++) for (let row = 0; row < ROWS; row++) cells.push([r, row])
  const out = Array.from({ length: REELS }, () => Array(ROWS).fill(null))
  let i = 0
  for (const [id, n] of Object.entries(extra)) {
    for (let k = 0; k < n; k++) {
      const [r, row] = cells[i++]
      out[r][row] = id
    }
  }
  let p = 0
  const pool = POOL.filter((s) => !(s in extra))       // never re-add a symbol we counted
  while (i < cells.length) {
    const [r, row] = cells[i++]
    out[r][row] = pool[p++ % pool.length]
  }
  return out
}

// --- pay anywhere: only the target symbol reaches a paying count ---
const eight = evaluate(makeGrid({ 'low-5': 8 }))
const blue = eight.hits.find((h) => h.symbol === 'low-5')
assert.ok(blue, '8 blue gems must pay')
assert.equal(blue.count, 8)
assert.equal(eight.total, blue.pay, 'only the blue gems may pay on that grid')
const twelve = evaluate(makeGrid({ 'low-5': 12 }))
assert.equal(twelve.total / blue.pay, 8, '12 of a kind must pay the top tier (2 / 0.25)')

// --- orbs multiply the win of the step they sit on (rng 0.5 -> the 4x orb) ---
const orbRun = resolve(makeGrid({ bonus: 1, 'low-5': 8 }), () => 0.5)
assert.equal(orbRun.steps[0].orbSum, 4)
assert.equal(orbRun.steps[0].winX, orbRun.steps[0].hits.reduce((s, h) => s + h.pay, 0) * 4)

// --- tumbling removes the paying cells, keeps the shape, keeps the orbs ---
const withOrb = makeGrid({ bonus: 1, 'low-5': 8 })
const t = tumble(withOrb, [[0, 1], [0, 2]], () => 0.99)
assert.equal(t.length, REELS)
assert.equal(t[0].length, ROWS)
assert.ok(t[0].includes('bonus'), 'the orb must survive a tumble')

// --- 4 scatters award the free spins, 3 do not ---
assert.equal(resolve(makeGrid({ scatter: 4 }), () => 0.5).freeSpins, SPEC.freeSpins)
assert.notEqual(resolve(makeGrid({ scatter: 3 }), () => 0.5).freeSpins, SPEC.freeSpins)

// --- the max win is capped at the spec's 5000x, and the cap really binds here ---
const capped = resolve(makeGrid({ 'high-1': 24, bonus: 6 }), () => 0.9999)
const raw = capped.steps.reduce((s, st) => s + st.winX, 0)
assert.ok(raw > SPEC.maxWinX, `expected the sequence to blow past the cap, got ${raw}`)
assert.equal(capped.totalX, SPEC.maxWinX)

// --- RTP: seeded Monte Carlo, must sit near the spec's 96.5% target ---
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const SPINS = 200000
const rng = mulberry32(20261013)
let returned = 0
for (let i = 0; i < SPINS; i++) returned += playSpin(rng)
const rtp = returned / SPINS
console.log(`measured RTP over ${SPINS} spins (seeded, free spins included): ${(rtp * 100).toFixed(2)}%`)
assert.ok(rtp > 0.90 && rtp < 1.03, `RTP out of band: ${(rtp * 100).toFixed(2)}%`)

console.log('gates engine: all checks passed')

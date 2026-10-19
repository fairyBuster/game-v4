// Runnable check for the slot engine.  node src/slot/engine.test.mjs
import assert from 'node:assert/strict'
import { LINES, REELS, ROWS, SYMBOLS, evaluate, measureRtp, spin } from './engine.js'

const S = (id) => id
const grid = (rows) => rows                       // rows[reel][row]

// --- grid shape / symbols are real ---
const g = spin()
assert.equal(g.length, REELS)
assert.equal(g[0].length, ROWS)
const ids = new Set(SYMBOLS.map((s) => s.id))
for (const reel of g) for (const c of reel) assert.ok(ids.has(c), 'unknown symbol ' + c)

// --- line count and every line index is inside the 3 rows ---
assert.equal(LINES.length, 20)
for (const line of LINES) {
  assert.equal(line.length, REELS)
  for (const row of line) assert.ok(row >= 0 && row < ROWS)
}

// --- a hand-built 5-of-a-kind on line 1 (middle row) pays the top row of the table ---
const bet = 20
const five = grid(Array.from({ length: REELS }, () => ['msilver', 'coins', 'msilver']))
const r1 = evaluate(five, bet)
const middle = r1.lineWins.find((w) => w.line === 0)
assert.ok(middle, 'expected line 1 to win')
assert.equal(middle.symbol, 'coins')
assert.equal(middle.count, 5)
assert.equal(middle.amount, 1100 * (bet / LINES.length))      // coins pays 1100 for five

// --- two symbols is not a win (checked on the symbol, other lines may pay by design) ---
const two = grid(Array.from({ length: REELS }, (_, i) => (i < 2 ? ['coins', 'msilver', 'msilver'] : ['msilver', 'msilver', 'msilver'])))
assert.ok(!evaluate(two, bet).lineWins.some((w) => w.symbol === 'coins'), 'gift x2 must not pay')

// --- the wild substitutes for the leading symbol (grid is [reel][row], line 1 = middle row) ---
const wild = grid([['msilver', 'wild', 'msilver'], ['msilver', 'coins', 'msilver'], ['msilver', 'coins', 'msilver'], ['msilver', 'msilver', 'msilver'], ['msilver', 'msilver', 'msilver']])
const w = evaluate(wild, bet).lineWins.find((x) => x.line === 0)
assert.ok(w && w.symbol === 'coins' && w.count === 3, 'wild should complete a 3-of-a-kind of gift')

// --- 3 scatters anywhere pay the scatter table and award free spins ---
const sc = grid([['scatter', 'msilver', 'msilver'], ['msilver', 'scatter', 'msilver'], ['msilver', 'msilver', 'scatter'], ['msilver', 'msilver', 'msilver'], ['msilver', 'msilver', 'msilver']])
const rs = evaluate(sc, bet)
assert.equal(rs.scatter, 3)
assert.equal(rs.spins, 8)
assert.ok(rs.total >= 1 * bet, 'scatter pay must be included')

// --- nothing can pay more than the theoretical max on one line ---
const best = grid(Array.from({ length: REELS }, () => ['wild', 'wild', 'wild']))
const rb = evaluate(best, bet)
assert.equal(rb.lineWins.length, LINES.length)
assert.ok(rb.total <= LINES.length * 4000 * (bet / LINES.length) + 1e-9)

// --- measured RTP (free spins included) has to sit in a sane band ---
// seeded RNG: free spins trigger rarely, so an unseeded Monte-Carlo run swings a few
// points between runs and would flap this assertion.
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rtp = measureRtp(200000, bet, mulberry32(20261013))
console.log('measured RTP over 200k paid spins (seeded, free spins included):', (rtp * 100).toFixed(2) + '%')
assert.ok(rtp > 0.85 && rtp < 1.02, `RTP out of band: ${(rtp * 100).toFixed(2)}%`)

console.log('slot engine: all checks passed')

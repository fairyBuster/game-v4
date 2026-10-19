// RTP read-out for the gates engine:  node src/slot/gates.rtp.mjs [spins]
import { measureRtp } from './gates.js'

function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const spins = Number(process.argv[2] || 60000)
const rtp = measureRtp(spins, mulberry32(20261013))
console.log(`spins ${spins}  RTP ${(rtp * 100).toFixed(2)}%`)

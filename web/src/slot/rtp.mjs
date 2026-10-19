// Quick RTP read-out for tuning the paytable:  node src/slot/rtp.mjs [spins]
import { measureRtp } from './engine.js'

const spins = Number(process.argv[2] || 400000)
const rtp = measureRtp(spins, 20)
console.log(`spins ${spins}  RTP ${(rtp * 100).toFixed(2)}%`)

/**
 * Pure geometry for the roulette wheel, kept out of the JSX so it can be
 * checked without a browser (see rouletteWheel.check.js).
 *
 * The disc is drawn with a conic-gradient, which starts at 12 o'clock and
 * grows clockwise, so pocket i occupies [i*SEG, (i+1)*SEG) clockwise from top.
 */

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
export const RED_SET = new Set(RED_NUMBERS)

// real European single-zero pocket order, clockwise from 0
export const POCKETS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export const SEG = 360 / POCKETS.length

export const pocketColor = (n) => (n === 0 ? '#15803d' : RED_SET.has(n) ? '#b3122b' : '#221d38')

/** Rotation that lands `pocket` under the top pointer, always spinning forward. */
export function landRotation(prev, pocket) {
  const centre = POCKETS.indexOf(pocket) * SEG + SEG / 2
  return Math.ceil((prev + 360 * 5) / 360) * 360 + (360 - centre)
}

/** Screen angle of a pocket centre (deg clockwise from the top) at a given disc rotation. */
export function pocketAngle(pocket, rotation) {
  return (POCKETS.indexOf(pocket) * SEG + SEG / 2 + rotation) % 360
}

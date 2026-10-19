/**
 * Geometry for the 3D dice cube, kept out of the JSX so it can be checked
 * without a browser (see diceCube.check.js).
 *
 * CSS 3D axes: +x right, +y down, +z toward the viewer. A face sits at
 * `rotateX(a) rotateY(b) translateZ(HALF)`, so its outward normal in the
 * cube's local frame is Rx(a)·Ry(b)·(0,0,1). A face is visible from the front
 * exactly when the cube's own rotation maps that normal back to (0,0,1).
 */

export const HALF = 55 // half the cube edge, in px

/** Where each face is placed on the cube: [rotX, rotY] of the face itself. */
export const FACE_TRANSFORM = {
  1: [0, 0],
  2: [0, 180],
  3: [0, 90],
  4: [0, -90],
  5: [90, 0],
  6: [-90, 0],
}

/** The cube's rotation that brings each face to the front (its inverse). */
export const FACE_ROT = {
  1: [0, 0],
  2: [0, 180],
  3: [0, -90],
  4: [0, 90],
  5: [-90, 0],
  6: [90, 0],
}

export const faceStyle = (face) => {
  const [x, y] = FACE_TRANSFORM[face]
  return `rotateX(${x}deg) rotateY(${y}deg) translateZ(${HALF}px)`
}

export const cubeTransform = (rot) => `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`

/** Next tumble step. Always rotates forward, never rewinds mid-spin. */
export function tumble(state, rand = Math.random) {
  return {
    x: state.x + 90 + 90 * Math.floor(rand() * 3),
    y: state.y + 180 + 180 * Math.floor(rand() * 2),
  }
}

/** Rotation that settles `face` toward the viewer, still spinning forward. */
export function landRotation(state, face) {
  const [tx, ty] = FACE_ROT[face] || FACE_ROT[1]
  const snap = (cur, target) => Math.ceil((cur + 720 - target) / 360) * 360 + target
  return { x: snap(state.x, tx), y: snap(state.y, ty) }
}

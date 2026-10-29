/**
 * Screen-space geometry for the view: maps a drag on a sticker to a layer
 * turn, and a turn to its CSS rotation. Pure math so it can be tested
 * without a DOM.
 *
 * World axes: x right, y up, z towards the front. The view is the CSS
 * transform `rotateX(rx) rotateY(ry)` applied to the cube element, whose
 * local frame is world with y flipped (CSS y points down).
 */

import { MOVE_DEFS } from './cube.js';

const RAD = Math.PI / 180;

/** Screen-space (x right, y down) direction of a world vector under the view. */
export function toScreen(v, { rx, ry }) {
  const [x, y, z] = [v[0], -v[1], v[2]];
  const x1 = x * Math.cos(ry * RAD) + z * Math.sin(ry * RAD);
  const z1 = -x * Math.sin(ry * RAD) + z * Math.cos(ry * RAD);
  const y2 = y * Math.cos(rx * RAD) - z1 * Math.sin(rx * RAD);
  return [x1, y2];
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * @param {{ pos: number[], normal: number[] }} sticker from cube.STICKERS
 * @param {number[]} drag screen-space [dx, dy]
 * @param {{ rx: number, ry: number }} view
 * @returns {import('./cube.js').Move | null}
 */
export function dragMove(sticker, [dx, dy], view) {
  const faceAxis = sticker.normal.findIndex((c) => c !== 0);
  let best = null;
  for (let axis = 0; axis < 3; axis += 1) {
    if (axis === faceAxis) continue;
    for (const sign of [1, -1]) {
      const t = [0, 0, 0];
      t[axis] = sign;
      const [sx, sy] = toScreen(t, view);
      const len = Math.hypot(sx, sy);
      if (len < 0.2) continue; // axis points (almost) at the viewer; direction is ambiguous
      const score = (sx * dx + sy * dy) / len;
      if (!best || score > best.score) best = { score, t };
    }
  }
  if (!best) return null;

  // Pushing a sticker along t rotates its layer right-handedly about normal x t.
  const turnAxis = cross(sticker.normal, best.t);
  const axis = turnAxis.findIndex((c) => c !== 0);
  const layer = sticker.pos[axis];
  const name = Object.keys(MOVE_DEFS).find((k) => {
    const d = MOVE_DEFS[k];
    return d.axis === axis && d.layers.length === 1 && d.layers[0] === layer;
  });
  // Move defs turn clockwise seen from their `sign` end, i.e. left-handedly about sign.
  return { name, amount: MOVE_DEFS[name].sign === -turnAxis[axis] ? 1 : -1 };
}

/**
 * CSS `rotate3d` arguments that animate `move` in the cube element's frame.
 * Move defs turn clockwise seen from their `sign` end, i.e. a -90deg
 * right-handed turn in world space; flipping y into CSS space flips the
 * handedness, so the CSS angle is +90deg about the y-flipped axis.
 * @param {import('./cube.js').Move} move
 * @returns {{ axis: number[], angle: number }}
 */
export function cssTurn(move) {
  const def = MOVE_DEFS[move.name];
  const axis = [0, 0, 0];
  axis[def.axis] = def.axis === 1 ? -def.sign : def.sign;
  return { axis, angle: 90 * move.amount };
}

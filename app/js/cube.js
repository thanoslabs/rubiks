/**
 * 3x3 cube state model.
 *
 * State is a 54-character string of face letters in URFDLB order, nine
 * facelets per face, row-major as seen in the standard net (the Kociemba
 * facelet order). Moves are derived from sticker geometry rather than
 * hand-written permutation tables: each sticker has a cubie position and an
 * outward normal, and a quarter turn rotates both about the move's axis.
 */

export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
export const SOLVED = FACES.map((f) => f.repeat(9)).join('');

// Cubie position (x right, y up, z towards the viewer/front) of the sticker
// at (row, col) on each face, plus the face's outward normal.
const FACE_GEOMETRY = {
  U: { normal: [0, 1, 0], pos: (r, c) => [c - 1, 1, r - 1] },
  R: { normal: [1, 0, 0], pos: (r, c) => [1, 1 - r, 1 - c] },
  F: { normal: [0, 0, 1], pos: (r, c) => [c - 1, 1 - r, 1] },
  D: { normal: [0, -1, 0], pos: (r, c) => [c - 1, -1, 1 - r] },
  L: { normal: [-1, 0, 0], pos: (r, c) => [-1, 1 - r, c - 1] },
  B: { normal: [0, 0, -1], pos: (r, c) => [1 - c, 1 - r, -1] },
};

/** @type {{ face: string, index: number, pos: number[], normal: number[] }[]} */
export const STICKERS = FACES.flatMap((face) => Array.from({ length: 9 }, (_, i) => ({
  face,
  index: i,
  pos: FACE_GEOMETRY[face].pos(Math.floor(i / 3), i % 3),
  normal: FACE_GEOMETRY[face].normal,
})));

/**
 * Each move turns the stickers whose coordinate on `axis` is in `layers`,
 * clockwise as seen looking from the `sign` end of that axis.
 * Slices follow their standard reference face: M like L, E like D, S like F.
 */
export const MOVE_DEFS = {
  U: { axis: 1, sign: 1, layers: [1] },
  D: { axis: 1, sign: -1, layers: [-1] },
  R: { axis: 0, sign: 1, layers: [1] },
  L: { axis: 0, sign: -1, layers: [-1] },
  F: { axis: 2, sign: 1, layers: [1] },
  B: { axis: 2, sign: -1, layers: [-1] },
  M: { axis: 0, sign: -1, layers: [0] },
  E: { axis: 1, sign: -1, layers: [0] },
  S: { axis: 2, sign: 1, layers: [0] },
  x: { axis: 0, sign: 1, layers: [-1, 0, 1] },
  y: { axis: 1, sign: 1, layers: [-1, 0, 1] },
  z: { axis: 2, sign: 1, layers: [-1, 0, 1] },
};
export const MOVES = Object.keys(MOVE_DEFS);

const key = (pos, normal) => `${pos.join()}|${normal.join()}`;
const STICKER_INDEX = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]));

// Clockwise quarter turn (seen from the +u end) of v about unit axis u:
// v' = (u . v)u - (u x v). Exact on integer vectors.
const rotate = (v, u) => {
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return [0, 1, 2].map((i) => dot * u[i] - cross[i] + 0); // + 0 normalises -0
};

// perm[dest] = source index, so a turn is `perm.map((src) => state[src])`.
const quarterTurn = ({ axis, sign, layers }) => {
  const u = [0, 0, 0];
  u[axis] = sign;
  const perm = STICKERS.map((_, i) => i);
  STICKERS.forEach((s, src) => {
    if (!layers.includes(s.pos[axis])) return;
    perm[STICKER_INDEX.get(key(rotate(s.pos, u), rotate(s.normal, u)))] = src;
  });
  return perm;
};

const compose = (a, b) => b.map((src) => a[src]); // a then b
const PERMS = new Map();
for (const [name, def] of Object.entries(MOVE_DEFS)) {
  const q = quarterTurn(def);
  const half = compose(q, q);
  PERMS.set(`${name}1`, q);
  PERMS.set(`${name}2`, half);
  PERMS.set(`${name}-1`, compose(half, q));
}

/**
 * @typedef {{ name: string, amount: 1 | 2 | -1 }} Move
 * @param {string} state a 54-facelet string; not validated here (hot path) — see isValidState
 * @param {Move} move
 * @returns {string}
 */
export function applyMove(state, move) {
  const perm = PERMS.get(`${move.name}${move.amount}`);
  if (!perm) throw new Error(`Unknown move: ${JSON.stringify(move)}`);
  let next = '';
  for (const src of perm) next += state[src];
  return next;
}

/** @param {string} state @param {Move[]} moves @returns {string} */
export function applyMoves(state, moves) {
  return moves.reduce(applyMove, state);
}

/** True when every face shows a single colour (orientation-independent). */
export function isSolved(state) {
  for (let f = 0; f < 54; f += 9) {
    for (let i = 1; i < 9; i += 1) if (state[f + i] !== state[f]) return false;
  }
  return true;
}

/**
 * Shape check for untrusted input (e.g. localStorage): 54 facelets, 9 of each
 * colour. Not a reachability check — some colour arrangements that pass
 * cannot be produced by any sequence of moves.
 */
export function isValidState(state) {
  if (typeof state !== 'string' || state.length !== 54) return false;
  return FACES.every((f) => state.split(f).length - 1 === 9);
}

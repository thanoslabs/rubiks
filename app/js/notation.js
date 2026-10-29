/**
 * Standard (WCA/Singmaster) notation for the moves supported by cube.js:
 * face turns U D L R F B, slices M E S, and rotations x y z, each optionally
 * followed by ' (counter-clockwise) or 2 (half turn). Wide moves are not supported.
 */

const PRIME = "'’′"; // ASCII, typographic, and prime-symbol variants seen in pasted scrambles
const TOKEN = new RegExp(`^([UDLRFBMESxyz])(2[${PRIME}]?|[${PRIME}])?$`);

export class NotationError extends Error {
  /** @param {string} token @param {number} index zero-based token position */
  constructor(token, index) {
    super(`Invalid move "${token}" at position ${index + 1}`);
    this.name = 'NotationError';
    this.token = token;
    this.index = index;
  }
}

/**
 * @param {string} text whitespace-separated moves, e.g. "R U' F2"
 * @returns {import('./cube.js').Move[]}
 * @throws {NotationError}
 */
export function parse(text) {
  if (typeof text !== 'string') throw new TypeError('Scramble text must be a string');
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return tokens.map((token, index) => {
    const match = TOKEN.exec(token);
    if (!match) throw new NotationError(token, index);
    const suffix = match[2] ?? '';
    const amount = suffix.startsWith('2') ? 2 : suffix ? -1 : 1;
    return { name: match[1], amount };
  });
}

const SUFFIX = { 1: '', 2: '2', [-1]: "'" };

/** @param {import('./cube.js').Move[]} moves @returns {string} */
export function format(moves) {
  return moves.map(({ name, amount }) => {
    if (!(amount in SUFFIX)) throw new RangeError(`Invalid amount ${amount} for move ${name}`);
    return name + SUFFIX[amount];
  }).join(' ');
}

/** @param {import('./cube.js').Move[]} moves @returns {import('./cube.js').Move[]} */
export function invert(moves) {
  return moves.slice().reverse().map(({ name, amount }) => ({ name, amount: amount === 2 ? 2 : -amount }));
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACES, MOVES, SOLVED, STICKERS, applyMove, applyMoves, isSolved, isValidState,
} from '../app/js/cube.js';

// Minimal move-list builder so these tests don't depend on the notation module.
const seq = (text) => text.split(' ').map((t) => ({
  name: t[0],
  amount: t.endsWith('2') ? 2 : t.endsWith("'") ? -1 : 1,
}));

const face = (state, f) => state.slice(FACES.indexOf(f) * 9, FACES.indexOf(f) * 9 + 9);
const SCRAMBLED = applyMoves(SOLVED, seq("R U2 F' L D B2 R' U F2 D' L2 B"));

const orderOf = (moves) => {
  let state = applyMoves(SOLVED, moves);
  let n = 1;
  while (state !== SOLVED) {
    state = applyMoves(state, moves);
    n += 1;
  }
  return n;
};

test('solved state is 54 facelets, 9 per face in URFDLB order', () => {
  assert.equal(SOLVED.length, 54);
  assert.equal(SOLVED, 'U'.repeat(9) + 'R'.repeat(9) + 'F'.repeat(9) + 'D'.repeat(9) + 'L'.repeat(9) + 'B'.repeat(9));
  assert.equal(STICKERS.length, 54);
  assert.ok(isSolved(SOLVED));
});

test('single turns match the reference Kociemba facelet strings', () => {
  const expected = {
    U: 'UUUUUUUUU BBBRRRRRR RRRFFFFFF DDDDDDDDD FFFLLLLLL LLLBBBBBB',
    R: 'UUFUUFUUF RRRRRRRRR FFDFFDFFD DDBDDBDDB LLLLLLLLL UBBUBBUBB',
    F: 'UUUUUULLL URRURRURR FFFFFFFFF RRRDDDDDD LLDLLDLLD BBBBBBBBB',
  };
  for (const [name, facelets] of Object.entries(expected)) {
    assert.equal(applyMove(SOLVED, { name, amount: 1 }), facelets.replace(/ /g, ''), name);
  }
});

test('F carries individual stickers to their reference positions (L8, L5, L2 -> U6, U7, U8)', () => {
  // Label every facelet uniquely so sticker order within a face is checked, not just colours.
  const labels = Array.from({ length: 54 }, (_, i) => String.fromCharCode(48 + i)).join('');
  const turned = applyMove(labels, { name: 'F', amount: 1 });
  const L = 36;
  assert.deepEqual([turned[6], turned[7], turned[8]], [labels[L + 8], labels[L + 5], labels[L + 2]]);
});

test('every move applied four times is the identity', () => {
  for (const name of MOVES) {
    let state = SCRAMBLED;
    for (let i = 0; i < 4; i += 1) state = applyMove(state, { name, amount: 1 });
    assert.equal(state, SCRAMBLED, name);
  }
});

test('prime and double moves agree with repeated quarter turns', () => {
  for (const name of MOVES) {
    const q = (s, n) => Array.from({ length: n }).reduce((acc) => applyMove(acc, { name, amount: 1 }), s);
    assert.equal(applyMove(SCRAMBLED, { name, amount: 2 }), q(SCRAMBLED, 2), `${name}2`);
    assert.equal(applyMove(SCRAMBLED, { name, amount: -1 }), q(SCRAMBLED, 3), `${name}'`);
  }
});

test('a sequence followed by its inverse is the identity', () => {
  const moves = seq("R U F' D2 L' B M E' S2 x y' z2");
  const inverse = moves.slice().reverse().map(({ name, amount }) => ({ name, amount: amount === 2 ? 2 : -amount }));
  assert.equal(applyMoves(applyMoves(SCRAMBLED, moves), inverse), SCRAMBLED);
});

test('known group orders: (R U R\' U\') is 6, (R U) is 105', () => {
  assert.equal(orderOf(seq("R U R' U'")), 6);
  assert.equal(orderOf(seq('R U')), 105);
});

test('U turns clockwise seen from above: F top row takes R colour', () => {
  const state = applyMove(SOLVED, { name: 'U', amount: 1 });
  assert.equal(face(state, 'F').slice(0, 3), 'RRR');
  assert.equal(face(state, 'L').slice(0, 3), 'FFF');
  assert.equal(face(state, 'F').slice(3), 'F'.repeat(6));
});

test('R turns clockwise seen from the right: U right column takes F colour', () => {
  const u = face(applyMove(SOLVED, { name: 'R', amount: 1 }), 'U');
  assert.deepEqual([u[2], u[5], u[8]], ['F', 'F', 'F']);
  assert.deepEqual([u[0], u[3], u[6]], ['U', 'U', 'U']);
});

test('slice moves follow their standard faces (x = R M\' L\', y = U E\' D\', z = F S B\')', () => {
  assert.equal(applyMoves(SCRAMBLED, seq('x')), applyMoves(SCRAMBLED, seq("R M' L'")));
  assert.equal(applyMoves(SCRAMBLED, seq('y')), applyMoves(SCRAMBLED, seq("U E' D'")));
  assert.equal(applyMoves(SCRAMBLED, seq('z')), applyMoves(SCRAMBLED, seq("F S B'")));
});

test('isSolved holds after whole-cube rotations and fails after a face turn', () => {
  assert.ok(isSolved(applyMoves(SOLVED, seq('x y2 z\''))));
  assert.ok(!isSolved(applyMove(SOLVED, { name: 'R', amount: 1 })));
});

test('isValidState accepts reachable states and rejects malformed ones', () => {
  assert.ok(isValidState(SCRAMBLED));
  assert.ok(!isValidState(null));
  assert.ok(!isValidState(SOLVED.slice(1)));
  assert.ok(!isValidState(`X${SOLVED.slice(1)}`));
  assert.ok(!isValidState(`R${SOLVED.slice(1)}`)); // 8 U, 10 R
});

test('applyMove rejects unknown moves', () => {
  assert.throws(() => applyMove(SOLVED, { name: 'Q', amount: 1 }), /Unknown move/);
  assert.throws(() => applyMove(SOLVED, { name: 'R', amount: 3 }), /Unknown move/);
});

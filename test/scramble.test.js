import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMoves, isSolved, SOLVED } from '../app/js/cube.js';
import { format, parse } from '../app/js/notation.js';
import { randomScramble } from '../app/js/scramble.js';

// mulberry32: small seedable PRNG so scramble tests are reproducible.
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const AXIS = { U: 'y', D: 'y', L: 'x', R: 'x', F: 'z', B: 'z' };

test('defaults to 25 face turns', () => {
  const moves = randomScramble({ rng: seeded(1) });
  assert.equal(moves.length, 25);
  for (const { name, amount } of moves) {
    assert.ok('UDLRFB'.includes(name), name);
    assert.ok([1, 2, -1].includes(amount));
  }
});

test('never repeats a face or turns one axis three times in a row', () => {
  for (let seed = 0; seed < 500; seed += 1) {
    const moves = randomScramble({ rng: seeded(seed) });
    moves.forEach((m, i) => {
      if (i >= 1) assert.notEqual(m.name, moves[i - 1].name, `seed ${seed}: ${format(moves)}`);
      if (i >= 2) {
        const axes = new Set([m, moves[i - 1], moves[i - 2]].map((x) => AXIS[x.name]));
        assert.ok(axes.size > 1, `seed ${seed}: ${format(moves)}`);
      }
    });
  }
});

test('is deterministic for a given RNG and honours length', () => {
  assert.deepEqual(randomScramble({ rng: seeded(42) }), randomScramble({ rng: seeded(42) }));
  assert.equal(randomScramble({ length: 10, rng: seeded(3) }).length, 10);
  assert.deepEqual(randomScramble({ length: 0 }), []);
});

test('round-trips through notation and leaves the cube unsolved', () => {
  const moves = randomScramble({ rng: seeded(7) });
  assert.deepEqual(parse(format(moves)), moves);
  assert.ok(!isSolved(applyMoves(SOLVED, moves)));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOLVED, applyMoves } from '../app/js/cube.js';
import { parse } from '../app/js/notation.js';
import {
  MAX_STORED_MOVES, createSession, elapsed, fromStored, isNewSolve, recordMove, scrambleSession, toStored,
} from '../app/js/session.js';

const play = (session, text, times) => parse(text).reduce(
  (s, move, i) => recordMove(s, move, times ? times[i] : 0),
  session,
);

test('scramble starts an attempt from solved and records the scramble text', () => {
  const s = scrambleSession(parse("R U'"));
  assert.equal(s.status, 'scrambled');
  assert.equal(s.scramble, "R U'");
  assert.notEqual(s.cube, SOLVED);
  assert.equal(s.moves, 0);
});

test('first turn starts the timer; solving back reports solved with time and moves', () => {
  let s = scrambleSession(parse("R U"));
  s = recordMove(s, parse("U'")[0], 1000);
  assert.equal(s.status, 'solving');
  assert.equal(s.runningSince, 1000);
  s = recordMove(s, parse("R'")[0], 4500);
  assert.equal(s.status, 'solved');
  assert.equal(s.moves, 2);
  assert.equal(s.elapsedMs, 3500);
  assert.equal(s.runningSince, null);
});

test('rotations neither count nor start the timer, and a rotated solved cube still counts', () => {
  let s = scrambleSession(parse('R'));
  s = play(s, 'x y');
  assert.equal(s.status, 'scrambled');
  assert.equal(s.moves, 0);
  assert.equal(s.runningSince, null);
  // Undo the rotations, then the scramble.
  s = play(s, "y' x' R'", [0, 0, 10]);
  assert.equal(s.status, 'solved');
});

test('isNewSolve fires for one-move and multi-move solves only', () => {
  const scrambled = scrambleSession(parse('R'));
  const solved = recordMove(scrambled, parse("R'")[0], 5);
  assert.equal(solved.status, 'solved');
  assert.ok(isNewSolve(scrambled, solved));
  const solving = recordMove(scrambleSession(parse('R U')), parse("U'")[0], 0);
  assert.ok(isNewSolve(solving, recordMove(solving, parse("R'")[0], 1)));
  assert.ok(!isNewSolve(createSession(), recordMove(createSession(), parse('R')[0], 0)));
  assert.ok(!isNewSolve(solved, recordMove(solved, parse('x')[0], 0)));
});

test('free play never celebrates, and turning a solved cube starts fresh free play', () => {
  let s = play(createSession(), "R R'");
  assert.equal(s.status, 'idle');
  s = play(scrambleSession(parse('R')), "R'", [100]);
  assert.equal(s.status, 'solved');
  s = play(s, 'U', [200]);
  assert.equal(s.status, 'idle');
  assert.equal(s.moves, 1);
  assert.equal(s.elapsedMs, 0);
  assert.equal(s.scramble, '');
});

test('history rebuilds the cube and restarts whenever the cube is solved', () => {
  let s = scrambleSession(parse("R U'"));
  s = play(s, 'F x');
  assert.equal(applyMoves(SOLVED, s.history), s.cube);
  s = play(createSession(), "R R'");
  assert.deepEqual(s.history, []);
  // Solved in a rotated orientation: history collapses to at most 4 rotations (24 orientations).
  s = play(createSession(), "x y R R' y R2 R2 z");
  assert.ok(s.history.every((m) => 'xyz'.includes(m.name)) && s.history.length <= 4, JSON.stringify(s.history));
  assert.equal(applyMoves(SOLVED, s.history), s.cube);
});

test('stored sessions round-trip and the timer pauses across reloads', () => {
  let s = recordMove(scrambleSession(parse('R U F')), parse('U')[0], 1000);
  const stored = JSON.parse(JSON.stringify(toStored(s, 3000)));
  assert.equal(stored.elapsedMs, 2000);
  s = fromStored(stored);
  assert.equal(s.runningSince, null);
  assert.equal(elapsed(s, 999999), 2000);
  s = recordMove(s, parse('U')[0], 10000);
  assert.equal(elapsed(s, 10500), 2500);
});

test('stored sessions restore the same cube', () => {
  const s = play(scrambleSession(parse("R U F' D2")), "L B' x", [0, 1, 2]);
  const restored = fromStored(JSON.parse(JSON.stringify(toStored(s, 5))));
  assert.equal(restored.cube, s.cube);
  assert.equal(restored.status, 'solving');
});

test('fromStored rejects corrupt or tampered data', () => {
  const good = toStored(scrambleSession(parse('R')), 0);
  assert.ok(fromStored(good));
  for (const bad of [
    null, 'x', {}, { ...good, v: 2 }, { ...good, history: 'R Q' }, { ...good, history: 7 }, { ...good, status: 'won' },
    { ...good, status: 'solved' }, // claims solved but history leaves it scrambled
    { ...good, history: 'R '.repeat(MAX_STORED_MOVES + 1).trim() },
    { ...good, moves: -1 }, { ...good, moves: 1.5 }, { ...good, elapsedMs: Infinity },
    { ...good, scramble: '<img src=x>' }, { ...good, scramble: 'R '.repeat(300) },
  ]) {
    assert.equal(fromStored(bad), null, JSON.stringify(bad));
  }
});

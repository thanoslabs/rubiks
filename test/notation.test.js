import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotationError, format, invert, parse } from '../app/js/notation.js';

test('parses face, slice, and rotation moves with modifiers', () => {
  assert.deepEqual(parse("R U' F2 M E' S2 x y' z2"), [
    { name: 'R', amount: 1 }, { name: 'U', amount: -1 }, { name: 'F', amount: 2 },
    { name: 'M', amount: 1 }, { name: 'E', amount: -1 }, { name: 'S', amount: 2 },
    { name: 'x', amount: 1 }, { name: 'y', amount: -1 }, { name: 'z', amount: 2 },
  ]);
});

test("accepts 2', typographic primes, and irregular whitespace", () => {
  assert.deepEqual(parse("  R2'\tU’\n D2’ F′"), [
    { name: 'R', amount: 2 }, { name: 'U', amount: -1 }, { name: 'D', amount: 2 }, { name: 'F', amount: -1 },
  ]);
});

test('empty input is an empty sequence', () => {
  assert.deepEqual(parse(''), []);
  assert.deepEqual(parse('   '), []);
});

test('rejects invalid tokens and names the token and its position', () => {
  for (const [text, token, index] of [['R U Q', 'Q', 2], ['R3', 'R3', 0], ['F r', 'r', 1], ["U''", "U''", 0]]) {
    assert.throws(() => parse(text), (err) => {
      assert.ok(err instanceof NotationError);
      assert.equal(err.token, token);
      assert.equal(err.index, index);
      assert.match(err.message, new RegExp(token.replace(/'/g, "\\'")));
      return true;
    });
  }
});

test('rejects non-string input and invalid amounts', () => {
  assert.throws(() => parse(null), TypeError);
  assert.throws(() => format([{ name: 'R', amount: 3 }]), RangeError);
});

test('formats to canonical notation and round-trips', () => {
  const text = "R U' F2 M x' z2";
  assert.equal(format(parse(text)), text);
  assert.equal(format(parse("R2' U’")), "R2 U'");
});

test('invert reverses order and flips direction', () => {
  assert.equal(format(invert(parse("R U' F2 x"))), "x' F2 U R'");
  assert.deepEqual(invert([]), []);
});

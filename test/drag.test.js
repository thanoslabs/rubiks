import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVE_DEFS, STICKERS, applyMove } from '../app/js/cube.js';
import { cssTurn, dragMove, toScreen } from '../app/js/drag.js';

const FRONT = { rx: 0, ry: 0 };
const DEFAULT = { rx: -25, ry: -35 };
const sticker = (face, index) => STICKERS.find((s) => s.face === face && s.index === index);

test('toScreen maps world axes to screen directions (y down)', () => {
  const round = (v) => v.map((c) => Math.round(c * 1000) / 1000 + 0);
  assert.deepEqual(round(toScreen([1, 0, 0], FRONT)), [1, 0]);
  assert.deepEqual(round(toScreen([0, 1, 0], FRONT)), [0, -1]);
  assert.deepEqual(round(toScreen([1, 0, 0], { rx: 0, ry: 90 })), [0, 0]);
});

test('dragging the front top row left turns U', () => {
  assert.deepEqual(dragMove(sticker('F', 1), [-30, 2], FRONT), { name: 'U', amount: 1 });
  assert.deepEqual(dragMove(sticker('F', 1), [30, 2], FRONT), { name: 'U', amount: -1 });
});

test('front columns and middle slices map to R, L, M, and E', () => {
  assert.deepEqual(dragMove(sticker('F', 5), [0, -30], FRONT), { name: 'R', amount: 1 });
  assert.deepEqual(dragMove(sticker('F', 3), [0, 30], FRONT), { name: 'L', amount: 1 });
  assert.deepEqual(dragMove(sticker('F', 7), [0, 30], FRONT), { name: 'M', amount: 1 });
  assert.deepEqual(dragMove(sticker('F', 4), [30, 0], FRONT), { name: 'E', amount: 1 });
});

test('drags under the default view move the sticker the way it was pushed', () => {
  // A U-face sticker on the right column pushed towards the front should be R'.
  const towardsFront = toScreen([0, 0, 1], DEFAULT);
  assert.deepEqual(dragMove(sticker('U', 5), towardsFront, DEFAULT), { name: 'R', amount: -1 });

  // Generic check: for every sticker and every in-plane push, the sticker ends up
  // (in world space) displaced along the push direction.
  for (const [i, s] of STICKERS.entries()) {
    const faceAxis = s.normal.findIndex((c) => c !== 0);
    for (let axis = 0; axis < 3; axis += 1) {
      if (axis === faceAxis) continue;
      const t = [0, 0, 0];
      t[axis] = 1;
      const move = dragMove(s, toScreen(t, DEFAULT), DEFAULT);
      // Track sticker i by labelling the state.
      const labels = Array.from({ length: 54 }, (_, k) => (k === i ? '#' : '.')).join('');
      const dest = STICKERS[applyMove(labels, move).indexOf('#')];
      const moved = dest.pos.map((p, k) => p - s.pos[k]);
      const sameStickerFace = dest.normal.every((c, k) => c === s.normal[k]);
      // Either it moved along +t within the face, or it wrapped onto the face in the +t direction.
      assert.ok(sameStickerFace ? moved[axis] > 0 : dest.normal[axis] === 1, `${s.face}${s.index} push ${t} -> ${move.name}`);
    }
  }
});

// Standard right-handed rotation matrix, which is how CSS defines rotate3d().
const rotate3d = ([x, y, z], [ux, uy, uz], deg) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const t = 1 - c;
  return [
    (t * ux * ux + c) * x + (t * ux * uy - s * uz) * y + (t * ux * uz + s * uy) * z,
    (t * ux * uy + s * uz) * x + (t * uy * uy + c) * y + (t * uy * uz - s * ux) * z,
    (t * ux * uz - s * uy) * x + (t * uy * uz + s * ux) * y + (t * uz * uz + c) * z,
  ];
};

test('cssTurn animates every sticker to where applyMove puts it', () => {
  const centre = (s) => s.pos.map((p, k) => p + s.normal[k] / 2);
  const toCss = ([x, y, z]) => [x, -y + 0, z]; // + 0 avoids -0, which deepEqual treats as distinct
  for (const name of Object.keys(MOVE_DEFS)) {
    for (const amount of [1, -1, 2]) {
      const { axis, angle } = cssTurn({ name, amount });
      STICKERS.forEach((s, i) => {
        if (!MOVE_DEFS[name].layers.includes(s.pos[MOVE_DEFS[name].axis])) return;
        const labels = Array.from({ length: 54 }, (_, k) => (k === i ? '#' : '.')).join('');
        const dest = STICKERS[applyMove(labels, { name, amount }).indexOf('#')];
        const animated = rotate3d(toCss(centre(s)), axis, angle).map((v) => Math.round(v * 1e6) / 1e6 + 0);
        assert.deepEqual(animated, toCss(centre(dest)), `${name}${amount} sticker ${s.face}${s.index}`);
      });
    }
  }
});

/**
 * CSS 3D rendering of the cube: 54 fixed sticker elements whose colours come
 * from the state string. A turn animates by rotating the affected stickers
 * about the cube centre, then snaps them back and re-colours from the new state.
 */

import { MOVE_DEFS, STICKERS } from './cube.js';
import { cssTurn, dragMove } from './drag.js';

const FACE_ROTATION = {
  U: 'rotateX(90deg)', D: 'rotateX(-90deg)', R: 'rotateY(90deg)',
  L: 'rotateY(-90deg)', F: '', B: 'rotateY(180deg)',
};
const DRAG_THRESHOLD = 8;
const easeOut = (t) => 1 - (1 - t) ** 3;

export class CubeView {
  /** @param {HTMLElement} scene @param {{ onMove: (move: import('./cube.js').Move) => void }} options */
  constructor(scene, { onMove }) {
    this.scene = scene;
    this.onMove = onMove;
    this.view = { rx: -25, ry: -35 };
    this.spinToken = 0;
    this.cube = document.createElement('div');
    this.cube.className = 'cube';
    this.stickers = STICKERS.map((s, i) => {
      const el = document.createElement('div');
      el.className = 'sticker';
      el.dataset.i = String(i);
      // Sticker centre sits half a cubie out from its cubie along the normal.
      const [x, y, z] = s.pos.map((p, k) => p + s.normal[k] / 2);
      el.base = `translate3d(calc(${x} * var(--s)), calc(${-y} * var(--s)), calc(${z} * var(--s))) ${FACE_ROTATION[s.face]}`;
      el.style.transform = el.base;
      this.cube.append(el);
      return el;
    });
    scene.append(this.cube);
    this.applyView();
    this.bindPointer();
  }

  render(state) {
    this.stickers.forEach((el, i) => { el.dataset.c = state[i]; });
  }

  applyView() {
    this.cube.style.transform = `rotateX(${this.view.rx}deg) rotateY(${this.view.ry}deg)`;
  }

  /** Animate `move`, then show `nextState`. Resolves when done. */
  animate(move, ms, nextState) {
    const def = MOVE_DEFS[move.name];
    const layer = this.stickers.filter((_, i) => def.layers.includes(STICKERS[i].pos[def.axis]));
    const { axis, angle: target } = cssTurn(move);
    const finish = () => {
      layer.forEach((el) => { el.style.transform = el.base; });
      this.render(nextState);
    };
    if (ms <= 0) {
      finish();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const t = Math.min(1, (now - start) / ms);
        const angle = target * easeOut(t);
        layer.forEach((el) => { el.style.transform = `rotate3d(${axis.join(',')}, ${angle}deg) ${el.base}`; });
        if (t < 1) requestAnimationFrame(frame);
        else {
          finish();
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  /** One full turn of the view about the vertical axis. */
  spin(ms = 1200) {
    const from = this.view.ry;
    const start = performance.now();
    const token = ++this.spinToken;
    const frame = (now) => {
      if (token !== this.spinToken) return; // cancelled by a new spin or a drag
      const t = Math.min(1, (now - start) / ms);
      this.view.ry = from + 360 * easeOut(t);
      this.applyView();
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  bindPointer() {
    let drag = null;
    this.scene.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || drag) return; // one pointer at a time
      const el = e.target.closest('.sticker');
      drag = {
        id: e.pointerId, x: e.clientX, y: e.clientY, done: false,
        sticker: el ? STICKERS[Number(el.dataset.i)] : null, view: { ...this.view },
      };
      this.spinToken += 1; // the user takes over the view
      this.scene.setPointerCapture(e.pointerId);
      this.scene.classList.add('dragging');
    });
    this.scene.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (drag.sticker) {
        // One turn per drag gesture.
        if (drag.done || Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        drag.done = true;
        const move = dragMove(drag.sticker, [dx, dy], this.view);
        if (move) this.onMove(move);
      } else {
        this.view.ry = drag.view.ry + dx * 0.5;
        this.view.rx = Math.max(-89, Math.min(89, drag.view.rx - dy * 0.5));
        this.applyView();
      }
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      this.scene.classList.remove('dragging');
    };
    this.scene.addEventListener('pointerup', end);
    this.scene.addEventListener('pointercancel', end);
    this.scene.addEventListener('lostpointercapture', end);
  }
}

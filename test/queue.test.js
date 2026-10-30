import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskQueue } from '../app/js/queue.js';

const tick = () => new Promise((r) => setTimeout(r, 5));
const idle = async (q) => { while (q.running) await tick(); };

test('runs tasks sequentially in order', async () => {
  const q = new TaskQueue();
  const log = [];
  for (const n of [1, 2, 3]) {
    q.push(async () => {
      log.push(`start ${n}`);
      await tick();
      log.push(`end ${n}`);
    });
  }
  await idle(q);
  assert.deepEqual(log, ['start 1', 'end 1', 'start 2', 'end 2', 'start 3', 'end 3']);
});

test('a failing task is reported and later tasks still run', async () => {
  const errors = [];
  const q = new TaskQueue((err) => errors.push(err.message));
  let ran = false;
  q.push(async () => { throw new Error('boom'); });
  q.push(() => { ran = true; });
  await idle(q);
  assert.deepEqual(errors, ['boom']);
  assert.ok(ran);
  q.push(() => { ran = 'again'; });
  await idle(q);
  assert.equal(ran, 'again');
});

test('clear drops pending tasks and lets the running task see it was superseded', async () => {
  const q = new TaskQueue();
  const log = [];
  q.push(async () => {
    const gen = q.generation;
    await tick();
    log.push(gen === q.generation ? 'committed' : 'skipped');
  });
  q.push(() => log.push('pending'));
  q.clear();
  q.push(() => log.push('after clear'));
  await idle(q);
  assert.deepEqual(log, ['skipped', 'after clear']);
});

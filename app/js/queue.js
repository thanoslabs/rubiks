/**
 * Runs async tasks one at a time (so turn animations never overlap). A
 * failing task is reported and does not block later ones. `clear()` drops
 * pending tasks and bumps `generation`, letting the task that is still
 * running detect it was superseded (e.g. by Reset) and skip its commit.
 */
export class TaskQueue {
  constructor(onError = (err) => console.error(err)) {
    this.tasks = [];
    this.running = false;
    this.generation = 0;
    this.onError = onError;
  }

  get pending() {
    return this.tasks.length;
  }

  /** @param {() => Promise<void> | void} task */
  push(task) {
    this.tasks.push(task);
    if (!this.running) this.drain();
  }

  clear() {
    this.tasks.length = 0;
    this.generation += 1;
  }

  async drain() {
    this.running = true;
    try {
      while (this.tasks.length) {
        try {
          await this.tasks.shift()();
        } catch (err) {
          this.onError(err);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

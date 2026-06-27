const PRIORITY = { critical: 0, high: 1, medium: 2, low: 3 };
const MAX_QUEUE = 100;

class Scheduler {
  constructor(maxSize = MAX_QUEUE) {
    this.queue = [];
    this.counter = 0;
    this.maxSize = maxSize;
  }

  enqueue(task) {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift();
    }

    const id = `task-${++this.counter}`;
    const entry = { id, ...task, state: 'queued', enqueuedAt: new Date().toISOString() };
    this.#insert(entry);
    return id;
  }

  dequeue() {
    const task = this.queue.shift();
    if (task) task.state = 'running';
    return task;
  }

  get(id) {
    return this.queue.find(t => t.id === id);
  }

  #insert(entry) {
    const priority = PRIORITY[entry.priority] ?? PRIORITY.medium;
    let low = 0;
    let high = this.queue.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const midP = PRIORITY[this.queue[mid].priority] ?? PRIORITY.medium;
      if (midP <= priority) low = mid + 1;
      else high = mid;
    }
    this.queue.splice(low, 0, entry);
  }
}

module.exports = { Scheduler };

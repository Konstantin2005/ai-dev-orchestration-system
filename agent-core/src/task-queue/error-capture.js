import { createTask } from './task-schema.js';

const MAX_RATE = 10;
const WINDOW_MS = 60000;

export class ErrorCaptureLayer {
  constructor(normalizer, telemetry) {
    this.normalizer = normalizer;
    this.telemetry = telemetry;
    this.rateCounts = new Map();
  }

  capture(error, source, severity = 'error') {
    if (this.#isRateLimited(source)) return;

    if (this.telemetry) {
      try {
        this.telemetry.capture(error, source, severity);
      } catch {
        // telemetry must never throw
      }
    }

    try {
      const task = createTask(error, source);
      task.severity = severity;
      this.normalizer.normalize(task);
    } catch {
      // normalizer must never throw
    }
  }

  #isRateLimited(source) {
    const now = Date.now();
    const window = this.rateCounts.get(source) || [];
    const recent = window.filter(t => now - t < WINDOW_MS);
    recent.push(now);
    this.rateCounts.set(source, recent);
    return recent.length > MAX_RATE;
  }

  wrap(fn, source) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        this.capture(err, source);
        throw err;
      }
    };
  }

  handler(source) {
    return (err) => {
      this.capture(err, source);
    };
  }
}

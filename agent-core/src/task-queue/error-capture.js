import { createTask } from './task-schema.js';

const MAX_RATE = 10;
const WINDOW_MS = 60000;
const CIRCUIT_BREAKER_THRESHOLD = 20;
const CIRCUIT_BREAKER_TIMEOUT = 30000;

export class ErrorCaptureLayer {
  constructor(normalizer, telemetry) {
    this.normalizer = normalizer;
    this.telemetry = telemetry;
    this.rateCounts = new Map();
    this.circuitBreakers = new Map();
  }

  capture(error, source, severity = 'error') {
    if (this.#isCircuitOpen(source)) return;
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

    if (recent.length > CIRCUIT_BREAKER_THRESHOLD) {
      this.#openCircuit(source);
    }

    return recent.length > MAX_RATE;
  }

  #isCircuitOpen(source) {
    const breaker = this.circuitBreakers.get(source);
    if (!breaker) return false;
    if (breaker.state === 'open') {
      if (Date.now() - breaker.openedAt > CIRCUIT_BREAKER_TIMEOUT) {
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }
    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
      this.rateCounts.delete(source);
      return false;
    }
    return false;
  }

  #openCircuit(source) {
    if (!this.circuitBreakers.has(source) || this.circuitBreakers.get(source).state !== 'open') {
      this.circuitBreakers.set(source, { state: 'open', openedAt: Date.now() });
    }
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

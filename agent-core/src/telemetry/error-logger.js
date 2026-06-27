import { ErrorCollector } from './error-collector.js';
import { GitTransport } from './transport.js';
import { FallbackStorage } from './fallback-storage.js';

let _instance = null;

export class ErrorLogger {
  constructor(options = {}) {
    this.collector = new ErrorCollector({
      maxSize: options.bufferSize || 50,
      flushInterval: options.flushInterval || 5000,
      transport: options.transport || new GitTransport({ repoDir: options.repoDir }),
      fallback: options.fallback || new FallbackStorage(),
    });

    this.collector.start();
  }

  capture(error, source, severity) {
    this.collector.capture(error, source, severity);
  }

  /**
   * Wraps an async function with try/catch telemetry
   */
  wrap(fn, source, severity = 'error') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        this.collector.capture(err, source, severity);
        throw err;
      }
    };
  }

  /**
   * Creates an error handler for EventEmitter / Streams
   */
  handler(source, severity = 'error') {
    return (err) => {
      this.collector.capture(err, source, severity);
    };
  }

  async flush() {
    await this.collector.flush();
  }

  dispose() {
    this.collector.stop();
  }

  static init(options = {}) {
    if (!_instance) {
      _instance = new ErrorLogger(options);
    }
    return _instance;
  }

  static getInstance() {
    return _instance;
  }
}

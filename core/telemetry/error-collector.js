export class ErrorCollector {
  constructor(options = {}) {
    this.buffer = [];
    this.maxSize = options.maxSize || 50;
    this.flushInterval = options.flushInterval || 5000;
    this.transport = options.transport || null;
    this.fallback = options.fallback || null;
    this._timer = null;
    this._started = false;
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._timer = setInterval(() => this.flush(), this.flushInterval);
    if (this._timer.unref) this._timer.unref();
  }

  stop() {
    this._started = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  capture(error, source, severity = 'error') {
    const entry = {
      timestamp: new Date().toISOString(),
      source,
      error_type: error.name || 'UnknownError',
      message: error.message || String(error),
      stack: error.stack || '',
      context: error.context || {},
      severity,
    };

    this.buffer.push(entry);

    if (this.buffer.length >= this.maxSize) {
      setImmediate(() => this.flush());
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0);
    let written = false;

    if (this.transport) {
      try {
        await this.transport.write(batch);
        written = true;
      } catch {
        // transport failed
      }
    }

    if (!written && this.fallback) {
      try {
        await this.fallback.write(batch);
      } catch {
        // fallback also failed — logs lost
      }
    }
  }

  get pending() {
    return this.buffer.length;
  }
}

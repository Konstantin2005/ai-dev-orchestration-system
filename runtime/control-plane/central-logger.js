const fs = require('fs');
const path = require('path');

const FLUSH_INTERVAL = 5000;
const MAX_BUFFER = 100;

class CentralLogger {
  constructor(logDir) {
    this.logDir = logDir || path.join(process.cwd(), 'central-logs');
    this.buffers = {};
    this._timer = null;
    this._started = false;
    this._logDepth = 0;
    this._maxDepth = 5;
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._timer = setInterval(() => this.flushAll(), FLUSH_INTERVAL);
    if (this._timer.unref) this._timer.unref();
  }

  stop() {
    this._started = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  log(stream, entry) {
    if (this._logDepth >= this._maxDepth) return;
    this._logDepth++;
    try {
      if (!this.buffers[stream]) this.buffers[stream] = [];
      this.buffers[stream].push({ timestamp: new Date().toISOString(), ...entry });
      if (this.buffers[stream].length >= MAX_BUFFER) this.flush(stream);
    } finally {
      this._logDepth--;
    }
  }

  flush(stream) {
    const entries = this.buffers[stream];
    if (!entries || entries.length === 0) return;
    this.buffers[stream] = [];

    try {
      const dir = path.join(this.logDir, stream);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${new Date().toISOString().slice(0, 10)}.log`);
      const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
      fs.appendFileSync(filePath, lines, 'utf-8');
    } catch (err) {
      console.error(`[CENTRAL-LOGGER] Flush error for "${stream}": ${err.message}`);
    }
  }

  flushAll() {
    for (const stream of Object.keys(this.buffers)) this.flush(stream);
  }
}

module.exports = { CentralLogger };

const fs = require('fs');
const path = require('path');

const FLUSH_INTERVAL = 30000;
const MAX_CHANGES = 100;

class StateManager {
  constructor(filePath = null) {
    this.filePath = filePath || path.join(process.cwd(), 'shared', 'global-context.json');
    this.cache = new Map();
    this.pending = new Map();
    this._timer = null;
    this._started = false;
    this._state = {};
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._load();
    this._timer = setInterval(() => this.flush(), FLUSH_INTERVAL);
    if (this._timer.unref) this._timer.unref();
  }

  stop() {
    this._started = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  async get(key) {
    if (this.pending.has(key)) return this.pending.get(key);
    if (this.cache.has(key)) return this.cache.get(key);
    return this._state[key];
  }

  set(key, value) {
    this.pending.set(key, value);
    this.cache.set(key, value);
    if (this.pending.size >= MAX_CHANGES) this.#doFlush();
  }

  async flush() {
    this.#doFlush();
  }

  #doFlush() {
    if (this.pending.size === 0) return;
    const updates = {};
    for (const [key, value] of this.pending) updates[key] = value;
    this.pending.clear();

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      for (const [key, value] of Object.entries(updates)) {
        this._state[key] = value;
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this._state, null, 2), 'utf-8');

      const now = Date.now();
      const logPath = this.filePath + '.journal';
      const line = JSON.stringify({ t: now, updates }) + '\n';
      fs.appendFileSync(logPath, line, 'utf-8');
    } catch (err) {
      console.error(`[STATE-MANAGER] Failed to write state: ${err.message}`);
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (raw.charCodeAt(0) === 0xFEFF) {
          this._state = JSON.parse(raw.slice(1));
        } else {
          this._state = JSON.parse(raw);
        }
        for (const [key, value] of Object.entries(this._state)) {
          this.cache.set(key, value);
        }
      }
    } catch (err) {
      console.error(`[STATE-MANAGER] Failed to load state: ${err.message}`);
    }
  }
}

module.exports = { StateManager };

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
  }

  start() {
    if (this._started) return;
    this._started = true;
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
    const loaded = await this.#load();
    this.cache.set(key, loaded[key]);
    return loaded[key];
  }

  set(key, value) {
    this.pending.set(key, value);
    if (this.pending.size >= MAX_CHANGES) this.flush();
  }

  async flush() {
    if (this.pending.size === 0) return;
    const updates = {};
    for (const [key, value] of this.pending) updates[key] = value;
    this.pending.clear();

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let existing = {};
      try { existing = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')); } catch (err) {
        console.error(`[STATE-MANAGER] Failed to parse state file: ${err.message}`);
      }
      for (const [key, value] of Object.entries(updates)) {
        existing[key] = value;
        this.cache.set(key, value);
      }
      fs.writeFileSync(this.filePath, JSON.stringify(existing, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[STATE-MANAGER] Failed to write state file: ${err.message}`);
    }
  }

  async #load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (err) {
      console.error(`[STATE-MANAGER] Failed to load state file: ${err.message}`);
    }
    return {};
  }
}

module.exports = { StateManager };

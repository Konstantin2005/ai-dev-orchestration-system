import fs from 'fs/promises';
import path from 'path';

export class Logger {
  constructor(name) {
    this.name = name;
    this.logDir = null;
    this.entries = [];
  }

  async init(workspace) {
    this.logDir = path.join(workspace, 'logs');
    await fs.mkdir(this.logDir, { recursive: true });
  }

  info(message, meta = {}) {
    this.#log('INFO', message, meta);
  }

  warn(message, meta = {}) {
    this.#log('WARN', message, meta);
  }

  error(message, meta = {}) {
    this.#log('ERROR', message, meta);
  }

  #log(level, message, meta) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      agent: this.name,
      message,
      meta,
    };
    this.entries.push(entry);
    this.#flush(entry);
  }

  async #flush(entry) {
    if (!this.logDir) return;
    const filePath = path.join(this.logDir, `${this.name}.log`);
    const line = `[${entry.timestamp}] [${entry.level}] [${entry.agent}] ${entry.message} ${Object.keys(entry.meta).length ? JSON.stringify(entry.meta) : ''}\n`;
    try {
      await fs.appendFile(filePath, line, 'utf-8');
    } catch {
      // silent fail
    }
  }

  getEntries() {
    return this.entries;
  }
}

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitTransport {
  constructor(options = {}) {
    this.repoDir = options.repoDir || null;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  async write(batch) {
    if (!this.repoDir) throw new Error('GitTransport: repoDir not set');

    const grouped = this.#groupByDateAndSource(batch);
    const files = [];

    for (const [dateDir, sources] of Object.entries(grouped)) {
      for (const [source, entries] of Object.entries(sources)) {
        const dir = path.join(this.repoDir, 'logs', dateDir);
        const file = path.join(dir, `${source}.jsonl`);

        await fs.mkdir(dir, { recursive: true });
        const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
        await fs.appendFile(file, lines, 'utf-8');
        files.push(file);
      }
    }

    await this.#gitCommit(files);
  }

  #groupByDateAndSource(batch) {
    const grouped = {};
    for (const entry of batch) {
      const date = entry.timestamp?.slice(0, 10) || 'unknown';
      const source = (entry.source || 'unknown').replace(/\./g, '-');
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][source]) grouped[date][source] = [];
      grouped[date][source].push(entry);
    }
    return grouped;
  }

  async #gitCommit(files) {
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        await execAsync('git add -A', { cwd: this.repoDir });
        await execAsync('git commit -m "telemetry: batch log update" --allow-empty', {
          cwd: this.repoDir,
        });
        await execAsync('git push origin master', { cwd: this.repoDir });
        return;
      } catch {
        if (attempt >= this.retries) throw new Error('GitTransport: all retries failed');
        await new Promise(r => setTimeout(r, this.retryDelay * attempt));
      }
    }
  }
}

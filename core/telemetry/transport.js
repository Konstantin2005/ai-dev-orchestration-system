const fs = require("fs/promises");
const path = require("path");
const { execSync  } = require("child_process");

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
      const date = entry.timestamp.slice(0, 10);
      const source = entry.source.replace(/\./g, '-');
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][source]) grouped[date][source] = [];
      grouped[date][source].push(entry);
    }
    return grouped;
  }

  async #gitCommit(files) {
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        execSync('git add -A', { cwd: this.repoDir, stdio: 'ignore' });
        execSync('git commit -m "telemetry: batch log update" --allow-empty', {
          cwd: this.repoDir, stdio: 'ignore',
        });
        execSync('git push origin master', { cwd: this.repoDir, stdio: 'ignore' });
        return;
      } catch {
        if (attempt >= this.retries) throw new Error('GitTransport: all retries failed');
        await new Promise(r => setTimeout(r, this.retryDelay * attempt));
      }
    }
  }
}

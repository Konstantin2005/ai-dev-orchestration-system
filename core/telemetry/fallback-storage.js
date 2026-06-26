const fs = require("fs/promises");
const path = require("path");
const os = require("os");

export class FallbackStorage {
  constructor(options = {}) {
    this.dir = options.dir || path.join(os.tmpdir(), 'error-telemetry-fallback');
  }

  async write(batch) {
    const date = batch[0].timestamp.slice(0, 10);
    const dir = path.join(this.dir, date);
    await fs.mkdir(dir, { recursive: true });

    const sources = new Set(batch.map(e => e.source));
    for (const source of sources) {
      const file = path.join(dir, `${source.replace(/\./g, '-')}.jsonl`);
      const lines = batch
        .filter(e => e.source === source)
        .map(e => JSON.stringify(e))
        .join('\n') + '\n';
      await fs.appendFile(file, lines, 'utf-8');
    }
  }
}

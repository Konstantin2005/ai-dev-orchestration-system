const fs = require("fs/promises");
const path = require("path");

export class SharedMemory {
  constructor() {
    this.store = new Map();
    this.workspace = null;
  }

  async init(workspace) {
    this.workspace = workspace;
    const sharedDir = path.join(workspace, 'shared');
    await fs.mkdir(sharedDir, { recursive: true });
    await this.#loadFromDisk(sharedDir);
  }

  async set(key, value) {
    this.store.set(key, value);
    if (this.workspace) {
      await this.#persist(key, value);
    }
  }

  get(key) {
    return this.store.get(key);
  }

  async #persist(key, value) {
    const sharedDir = path.join(this.workspace, 'shared');
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(sharedDir, `${sanitized}.json`);
    try {
      await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
    } catch {
      // silent fail on persistence
    }
  }

  async #loadFromDisk(sharedDir) {
    try {
      const files = await fs.readdir(sharedDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = file.replace('.json', '');
          const content = await fs.readFile(path.join(sharedDir, file), 'utf-8');
          this.store.set(key, JSON.parse(content));
        }
      }
    } catch {
      // directory is empty or doesn't exist yet
    }
  }

  getAll() {
    return Object.fromEntries(this.store);
  }
}

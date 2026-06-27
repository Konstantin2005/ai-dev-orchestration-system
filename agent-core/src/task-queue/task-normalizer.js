import fs from 'fs/promises';
import path from 'path';
import { TASK_STATES, canTransition } from './task-schema.js';

export class TaskNormalizer {
  constructor(options = {}) {
    this.repoDir = options.repoDir || null;
    this.dedupCache = new Map();
  }

  async normalize(task) {
    if (this.#isDuplicate(task)) {
      return null;
    }

    task.state = TASK_STATES.NORMALIZED;
    this.#updateDedupCache(task);

    if (this.repoDir) {
      await this.#persist(task);
    }

    return task;
  }

  #isDuplicate(task) {
    const existing = this.dedupCache.get(task.dedup_key);
    if (!existing) return false;

    const cooldown = 3600000;
    return Date.now() - existing.ts < cooldown;
  }

  #updateDedupCache(task) {
    this.dedupCache.set(task.dedup_key, {
      id: task.id,
      ts: Date.now(),
    });
  }

  async #persist(task) {
    const dir = path.join(this.repoDir, 'tasks');
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${task.id}.json`);
    await fs.writeFile(file, JSON.stringify(task, null, 2), 'utf-8');
  }

  async loadDedupCache() {
    if (!this.repoDir) return;
    const metaDir = path.join(this.repoDir, 'meta');
    try {
      const files = await fs.readdir(metaDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = JSON.parse(await fs.readFile(path.join(metaDir, file), 'utf-8'));
          this.dedupCache.set(file.replace('.json', ''), data);
        }
      }
    } catch {
      // meta dir doesn't exist yet
    }
  }
}

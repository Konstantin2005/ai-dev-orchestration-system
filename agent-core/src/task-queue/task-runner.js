import fs from 'fs/promises';
import path from 'path';
import { TASK_STATES, canTransition } from './task-schema.js';

export class TaskRunner {
  constructor(options = {}) {
    this.repoDir = options.repoDir;
    this.executor = options.executor || this.#defaultExecutor;
  }

  async pickNext() {
    if (!this.repoDir) return null;

    const tasksDir = path.join(this.repoDir, 'tasks');
    let files;
    try {
      files = await fs.readdir(tasksDir);
    } catch {
      return null;
    }

    let bestTask = null;
    let bestScore = -1;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await fs.readFile(path.join(tasksDir, file), 'utf-8');
      const task = JSON.parse(content);

      if (task.state !== TASK_STATES.QUEUED) continue;
      if (task.retry_count >= task.max_retries) continue;

      const score = task.readiness_score - task.retry_count * 0.2;
      if (score > bestScore) {
        bestScore = score;
        bestTask = task;
      }
    }

    return bestTask ? { ...bestTask } : null;
  }

  async execute(task) {
    const copy = { ...task, context: { ...(task.context || {}) } };

    if (!canTransition(copy.state, TASK_STATES.EXECUTING)) {
      throw new Error(`Cannot execute task in state: ${copy.state}`);
    }

    copy.state = TASK_STATES.EXECUTING;
    await this.#save(copy);

    try {
      const result = await this.executor(copy);
      copy.state = TASK_STATES.VALIDATING;
      copy.result = result;
      await this.#save(copy);
      return copy;
    } catch (err) {
      copy.state = TASK_STATES.FAILED;
      copy.retry_count = (copy.retry_count || 0) + 1;
      copy.last_error = err.message;
      await this.#save(copy);
      return copy;
    }
  }

  async validate(task) {
    const copy = { ...task, context: { ...(task.context || {}) } };

    if (!canTransition(copy.state, TASK_STATES.VALIDATING)) return;

    const isValid = copy.result && !copy.last_error;
    copy.state = isValid ? TASK_STATES.DONE : TASK_STATES.FAILED;

    if (copy.state === TASK_STATES.FAILED && copy.retry_count < copy.max_retries) {
      copy.state = TASK_STATES.QUEUED;
    }

    await this.#save(copy);
    await this.#moveToFinal(copy);
  }

  async #save(task) {
    if (!this.repoDir) return;
    const file = path.join(this.repoDir, 'tasks', `${task.id}.json`);
    await fs.writeFile(file, JSON.stringify(task, null, 2), 'utf-8');
  }

  async #moveToFinal(task) {
    if (!this.repoDir) return;

    const targetDir = task.state === TASK_STATES.DONE ? 'archive' : 'failed';
    const target = path.join(this.repoDir, targetDir, `${task.id}.json`);
    const source = path.join(this.repoDir, 'tasks', `${task.id}.json`);

    try {
      await fs.rename(source, target);
      if (task.state === TASK_STATES.FAILED && task.retry_count < task.max_retries) {
        await fs.copyFile(target, source);
      }
    } catch {
      // file already moved
    }
  }

  async #defaultExecutor(task) {
    return { executed: true, task_id: task.id };
  }
}

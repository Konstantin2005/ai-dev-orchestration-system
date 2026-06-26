const { AgentAdapter } = require('../interface');

class AiderAdapter extends AgentAdapter {
  constructor(config = {}) {
    super(config);
    this._aiderPath = config.aiderPath || 'aider';
    this._model = config.model || 'gpt-4';
  }

  async init() {
    if (this._initialized) return;
    console.error('[AIDER-ADAPTER] Checking Aider CLI availability...');
    this._initialized = true;
    console.error('[AIDER-ADAPTER] Aider adapter initialized');
  }

  async execute(task, context = {}) {
    if (!this._initialized) await this.init();
    console.error(`[AIDER-ADAPTER] Executing task: ${task.title || 'untitled'}`);

    const fullPrompt = `Task: ${task.title}\n\n${task.body || ''}\n\nContext: ${JSON.stringify(context)}`;

    try {
      const { execSync } = require('child_process');
      const output = execSync(
        `"${this._aiderPath}" --model ${this._model} --no-git --yes --message ${JSON.stringify(fullPrompt)}`,
        { encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
      );

      return {
        status: 'COMPLETED',
        files: this._parseFiles(output, context),
        logs: { aider: output }
      };
    } catch (err) {
      console.error(`[AIDER-ADAPTER] Error: ${err.message}`);
      return {
        status: 'ERROR',
        files: [],
        logs: { aider: `Error: ${err.message}` }
      };
    }
  }

  _parseFiles(output, context) {
    const files = [];
    const fileRegex = /^diff --git a\/(.+?) b\/(.+?)$/gm;
    let match;
    while ((match = fileRegex.exec(output)) !== null) {
      const filePath = match[2];
      if (filePath && !filePath.startsWith('.ai-system/')) {
        files.push({ path: filePath, content: output, description: `Aider edit: ${filePath}` });
      }
    }

    if (files.length === 0) {
      files.push({
        path: 'aider-output.md',
        content: output,
        description: 'Aider execution output'
      });
    }

    return files;
  }

  getMetadata() {
    return {
      id: 'aider',
      name: 'Aider Agent',
      type: 'code',
      capabilities: ['code', 'edit', 'refactor'],
      framework: 'aider',
      language: 'python',
      version: '0.50.x'
    };
  }
}

module.exports = { AiderAdapter };

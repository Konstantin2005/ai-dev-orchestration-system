const { AgentAdapter } = require('../interface');

class CustomAgentAdapter extends AgentAdapter {
  constructor(config = {}) {
    super(config);
    this._executeFn = config.executeFn || null;
  }

  async init() {
    if (this._initialized) return;
    console.error('[CUSTOM-ADAPTER] Initializing Custom agent...');
    this._initialized = true;
    console.error('[CUSTOM-ADAPTER] Custom agent initialized');
  }

  async execute(task, context = {}) {
    if (!this._initialized) await this.init();

    if (typeof this._executeFn === 'function') {
      return this._executeFn(task, context);
    }

    console.error(`[CUSTOM-ADAPTER] No custom execute function provided for task: ${task.title || 'untitled'}`);
    return {
      status: 'SKIPPED',
      files: [],
      logs: {
        custom: 'No execute function configured'
      }
    };
  }

  getMetadata() {
    return {
      id: 'custom',
      name: this.config.name || 'Custom Agent',
      framework: 'user-defined',
      language: this.config.language || 'any',
      version: this.config.version || '1.0.0'
    };
  }
}

module.exports = { CustomAgentAdapter };

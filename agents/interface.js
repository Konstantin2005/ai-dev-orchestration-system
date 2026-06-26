class AgentAdapter {
  constructor(config = {}) {
    this.config = config;
    this._initialized = false;
  }

  async init() {
    this._initialized = true;
  }

  async execute(task, context) {
    throw new Error('AgentAdapter subclasses must implement execute()');
  }

  validate(output) {
    const errors = [];
    if (!output) {
      errors.push('Output is null or undefined');
    }
    if (output && typeof output !== 'object') {
      errors.push('Output must be an object');
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  emitLogs(executionId, logs) {
    const timestamp = new Date().toISOString();
    return {
      executionId,
      agentId: this.constructor.name,
      timestamp,
      logs
    };
  }

  getMetadata() {
    return {
      id: this.constructor.name,
      version: '1.0.0'
    };
  }
}

module.exports = { AgentAdapter };

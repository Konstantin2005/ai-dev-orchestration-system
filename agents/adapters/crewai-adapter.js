const { AgentAdapter } = require('../interface');

class CrewAIAdapter extends AgentAdapter {
  constructor(config = {}) {
    super(config);
    this._dockerImage = config.dockerImage || 'crewai:latest';
  }

  async init() {
    if (this._initialized) return;
    console.error(`[CREWAI-ADAPTER] Initializing CrewAI (Docker: ${this._dockerImage})...`);
    this._initialized = true;
    console.error('[CREWAI-ADAPTER] CrewAI adapter initialized');
  }

  async execute(task, context = {}) {
    if (!this._initialized) await this.init();

    console.error(`[CREWAI-ADAPTER] Would execute task via CrewAI: ${task.title || 'untitled'}`);

    const { execSync } = require('child_process');
    const config = JSON.stringify({
      task: { title: task.title, body: task.body, number: task.number },
      context: { language: context.language, repo: context.repo }
    });

    try {
      const output = execSync(
        `docker run --rm -i ${this._dockerImage} crewai-run`,
        {
          input: config,
          encoding: 'utf-8',
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024
        }
      );

      return {
        status: 'COMPLETED',
        files: [],
        logs: {
          crewai: output.trim()
        }
      };
    } catch (err) {
      console.error(`[CREWAI-ADAPTER] Execution error: ${err.message}`);
      throw new Error(`CrewAI execution failed: ${err.message}`);
    }
  }

  getMetadata() {
    return {
      id: 'crewai',
      name: 'CrewAI Agent',
      framework: 'crewai',
      language: 'python',
      version: '0.30.x'
    };
  }
}

module.exports = { CrewAIAdapter };

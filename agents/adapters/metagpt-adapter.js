const { AgentAdapter } = require('../interface');

class MetaGPTAdapter extends AgentAdapter {
  constructor(config = {}) {
    super(config);
    this._dockerImage = config.dockerImage || 'metagpt:latest';
  }

  async init() {
    if (this._initialized) return;
    console.error(`[METAGPT-ADAPTER] Initializing MetaGPT (Docker: ${this._dockerImage})...`);
    this._initialized = true;
    console.error('[METAGPT-ADAPTER] MetaGPT adapter initialized');
  }

  async execute(task, context = {}) {
    if (!this._initialized) await this.init();

    console.error(`[METAGPT-ADAPTER] Would execute task via MetaGPT: ${task.title || 'untitled'}`);

    const { execSync } = require('child_process');
    const config = JSON.stringify({
      task: { title: task.title, body: task.body, number: task.number },
      context: { language: context.language, repo: context.repo }
    });

    try {
      const output = execSync(
        `docker run --rm -i ${this._dockerImage} metagpt-run`,
        {
          input: config,
          encoding: 'utf-8',
          timeout: 300000,
          maxBuffer: 10 * 1024 * 1024
        }
      );

      return {
        status: 'COMPLETED',
        files: [],
        logs: {
          metagpt: output.trim()
        }
      };
    } catch (err) {
      console.error(`[METAGPT-ADAPTER] Execution error: ${err.message}`);
      throw new Error(`MetaGPT execution failed: ${err.message}`);
    }
  }

  getMetadata() {
    return {
      id: 'metagpt',
      name: 'MetaGPT Agent',
      framework: 'MetaGPT',
      language: 'python',
      version: '0.8.x'
    };
  }
}

module.exports = { MetaGPTAdapter };

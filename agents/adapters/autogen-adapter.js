const { AgentAdapter } = require('../interface');

class AutoGenAdapter extends AgentAdapter {
  constructor(config = {}) {
    super(config);
    this._dockerImage = config.dockerImage || 'autogen:latest';
    this._containerName = null;
  }

  async init() {
    if (this._initialized) return;
    console.error(`[AUTOGEN-ADAPTER] Initializing AutoGen (Docker: ${this._dockerImage})...`);

    const { execSync } = require('child_process');
    try {
      execSync(`docker image inspect ${this._dockerImage} 2>/dev/null`, { stdio: 'ignore' });
      console.error('[AUTOGEN-ADAPTER] Docker image found');
    } catch {
      console.error(`[AUTOGEN-ADAPTER] Docker image ${this._dockerImage} not found. Will pull on first execution.`);
    }

    this._initialized = true;
    console.error('[AUTOGEN-ADAPTER] AutoGen adapter initialized');
  }

  async execute(task, context = {}) {
    if (!this._initialized) await this.init();

    console.error(`[AUTOGEN-ADAPTER] Would execute task via AutoGen: ${task.title || 'untitled'}`);

    const prompt = JSON.stringify({
      task: {
        title: task.title,
        body: task.body,
        number: task.number
      },
      context: {
        language: context.language,
        repo: context.repo
      }
    });

    const result = await this._runDocker(prompt);

    return {
      status: 'COMPLETED',
      files: result.files || [],
      logs: {
        autogen: JSON.stringify(result.logs || {}, null, 2)
      }
    };
  }

  async _runDocker(prompt) {
    const { execSync } = require('child_process');

    try {
      const output = execSync(
        `docker run --rm -i ${this._dockerImage} node -e "console.log(JSON.stringify({files: [], logs: {agent: 'AutoGen stub'}}))"`,
        {
          input: prompt,
          encoding: 'utf-8',
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024
        }
      );

      try {
        return JSON.parse(output.trim());
      } catch {
        return {
          files: [],
          logs: { raw: output.trim() }
        };
      }
    } catch (err) {
      console.error(`[AUTOGEN-ADAPTER] Docker execution error: ${err.message}`);
      throw new Error(`AutoGen execution failed: ${err.message}`);
    }
  }

  getMetadata() {
    return {
      id: 'autogen',
      name: 'AutoGen Agent',
      framework: 'microsoft/autogen',
      language: 'python',
      version: '0.2.x'
    };
  }
}

module.exports = { AutoGenAdapter };

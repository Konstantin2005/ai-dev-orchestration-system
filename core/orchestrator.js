const { Pipeline  } = require("./pipeline");
const { Logger  } = require("./logger/index");
const { SharedMemory  } = require("./shared/memory");

export class Orchestrator {
  constructor(config = {}) {
    this.config = config;
    this.logger = new Logger('orchestrator');
    this.memory = new SharedMemory();
    this.pipeline = new Pipeline(config.pipeline);
  }

  async run(issue) {
    this.logger.info('Orchestrator started', { issueId: issue.id, title: issue.title });

    const slug = this.#generateSlug(issue.title);
    const workspace = `.work/issues/${issue.id}-${slug}`;

    await this.memory.init(workspace);
    await this.memory.set('issue', issue);
    await this.memory.set('workspace', workspace);

    try {
      const result = await this.pipeline.execute(workspace, this.memory);
      this.logger.info('Pipeline completed', { status: 'success', result });
      return result;
    } catch (err) {
      this.logger.error('Pipeline failed', { error: err.message });
      throw err;
    }
  }

  #generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }
}

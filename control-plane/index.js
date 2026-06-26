const Router = require('./router');
const GlobalState = require('./global-state');
const Logger = require('../observability/logger');
const MultiRepoAdapter = require('./multi-repo-adapter');

class ControlPlane {
  constructor(config = {}) {
    this.config = config;
    this.state = new GlobalState(config.statePath || null);
    this.logger = new Logger(config.logDir || null);
    this.router = new Router(this.state);
    this.multiRepo = new MultiRepoAdapter({ logger: this.logger, state: this.state });
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    await this.state.init();
    await this.logger.init();
    await this.multiRepo.init();
    this._initialized = true;
    console.error('[CONTROL-PLANE] Initialized');
  }

  async handleIssue(issue) {
    if (!this._initialized) await this.init();
    console.error(`[CONTROL-PLANE] Handling issue #${issue.id}: ${issue.title}`);

    const routing = await this.router.route(issue);
    this.logger.logRouting(routing);

    this.state.updateRepo(routing.targetRepo, {
      lastIssue: issue.id,
      lastRouting: routing,
      timestamp: new Date().toISOString()
    });

    return routing;
  }

  async executeIssue(issue, agentIds = [], mode = 'single', context = {}) {
    const routing = await this.handleIssue(issue);
    const execution = {
      issue: { id: issue.id, title: issue.title },
      routing,
      agentIds,
      mode,
      context,
      status: 'pending',
      startedAt: new Date().toISOString()
    };

    this.logger.logExecution(execution);

    const result = await this.multiRepo.executeAcrossRepos(routing, issue, agentIds, mode, context);

    execution.status = result.status || 'completed';
    execution.completedAt = new Date().toISOString();
    execution.result = result;

    this.state.logExecution(execution);
    this.logger.logExecution(execution);

    return result;
  }

  getState() {
    return this.state.getState();
  }

  getAgentPerformance() {
    return this.state.getAgentPerformance();
  }

  async shutdown() {
    await this.state.persist();
    console.error('[CONTROL-PLANE] Shutdown complete');
  }
}

module.exports = { ControlPlane };

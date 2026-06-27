const { StateManager } = require('./state-manager');
const { Scheduler } = require('./scheduler');

class UnifiedOrchestrator {
  constructor(options = {}) {
    this.agents = options.agents || {};
    this.scheduler = new Scheduler(100);
    this.stateManager = new StateManager();
    this.stateManager.start();
    this.validator = options.validator || null;
    this.logger = options.logger || null;
  }

  async processIssue(issueId, sourceRepo, adapters) {
    const adapter = adapters[sourceRepo];
    if (!adapter) throw new Error(`No adapter for repo: ${sourceRepo}`);

    const issue = await adapter.readIssue(issueId);
    const route = this.#route(issue, sourceRepo, adapters);

    this.stateManager.set(`issue:${issueId}`, { repo: route.targetRepo, state: 'routing' });

    const agent = this.#selectAgent(issue);
    const schedulerId = this.scheduler.enqueue({ issue, route, agent });

    this.stateManager.set(`issue:${issueId}`, { repo: route.targetRepo, state: 'scheduled', agent: agent.name, schedulerId });

    this.logger?.log('execution-trace', { event: 'scheduled', issueId, agent: agent.name, targetRepo: route.targetRepo });

    return this.#delegateExecution(schedulerId, route, agent);
  }

  async #delegateExecution(schedulerId, route, agent) {
    this.stateManager.set(`issue:${route.issue?.id || schedulerId}`, { state: 'executing', agent: agent.name });

    try {
      const context = await route.adapter.fetchContext(route.targetRepo);
      const artifacts = await agent.execute(context, route.issue || {});

      for (const file of artifacts.files || []) {
        const valid = this.validator ? this.validator.validate(file, route.targetRepo) : { valid: true };
        if (!valid.valid) throw new Error(`Validation failed: ${file.path} — ${valid.reason}`);
        await route.adapter.writeFile(file.path, file.content, route.targetRepo);
      }

      const pr = await route.adapter.createPR(route.targetRepo, route.issue);
      this.stateManager.set(`issue:${route.issue?.id || schedulerId}`, { state: 'done', pr: pr?.url });
      this.logger?.log('execution-trace', { event: 'pr-created', issueId: route.issue?.id, pr: pr?.url });

      return { status: 'done', artifacts, pr };
    } catch (err) {
      this.stateManager.set(`issue:${route.issue?.id || schedulerId}`, { state: 'failed', error: err.message });
      this.logger?.log('execution-trace', { event: 'failed', issueId: route.issue?.id, error: err.message });
      return { status: 'failed', error: err.message };
    }
  }

  #selectAgent(issue) {
    const type = issue.labels?.find(l => ['architect', 'backend', 'frontend', 'qa', 'reviewer'].includes(l)) || 'backend';
    return this.agents[type] || this.agents.backend;
  }

  #route(issue, sourceRepo, adapters) {
    const { route } = require('../router/multi-repo-router');
    return route(issue, sourceRepo, adapters);
  }
}

module.exports = { UnifiedOrchestrator };

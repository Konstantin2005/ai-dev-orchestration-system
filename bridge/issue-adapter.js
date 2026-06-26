const MapperBridge = require('./mapper/index');

class IssueAdapter {
  constructor(config = {}) {
    this.config = config;
    this._knownRepos = {
      'ai-dev-orchestration-system': { type: 'execution', primary: true },
      'ObsidianMain': { type: 'input', localPath: 'C:\\obsidian\\Main' },
      'agent-core': { type: 'archived', merged: true }
    };
  }

  normalize(issue) {
    const sourceRepo = this._detectSourceRepo(issue);
    const task = {
      id: issue.id || issue.number,
      title: issue.title || '',
      body: issue.body || '',
      slug: this._generateSlug(issue.title || ''),
      sourceRepo,
      sourceRepoUrl: issue.url || null,
      timestamp: new Date().toISOString(),
      priority: this._detectPriority(issue),
      taskType: this._detectTaskType(issue),
      normalized: true
    };
    return task;
  }

  route(task) {
    const agentRef = MapperBridge.getAgentRef(task.taskType);
    const pipelineOrder = MapperBridge.getPipelineOrder();
    const templateRef = MapperBridge.getTemplateRef(task.taskType);

    return {
      task,
      executionTarget: 'ai-dev-orchestration-system',
      preferredAgent: agentRef,
      pipelineStage: pipelineOrder[0] || 'architect',
      templateHint: templateRef,
      routingConfidence: this._routingConfidence(task)
    };
  }

  _detectSourceRepo(issue) {
    const body = (issue.body || '').toLowerCase();
    const title = (issue.title || '').toLowerCase();
    const combined = `${title} ${body}`;

    if (combined.includes('obsidian') || combined.includes('main') || combined.includes('c:\\obsidian')) return 'ObsidianMain';
    if (combined.includes('agent-core')) return 'agent-core';
    return 'ai-dev-orchestration-system';
  }

  _detectPriority(issue) {
    const body = (issue.body || '').toLowerCase();
    const title = (issue.title || '').toLowerCase();

    if (body.includes('critical') || body.includes('urgent') || title.includes('critical')) return 'high';
    if (body.includes('important') || body.includes('blocker')) return 'high';
    if (body.includes('low') || body.includes('nice to have')) return 'low';
    return 'medium';
  }

  _detectTaskType(issue) {
    const body = (issue.body || '').toLowerCase();
    const title = (issue.title || '').toLowerCase();
    const combined = `${title} ${body}`;

    if (combined.includes('bug') || combined.includes('fix') || combined.includes('error')) return 'bug';
    if (combined.includes('refactor') || combined.includes('clean') || combined.includes('optimize')) return 'refactor';
    if (combined.includes('research') || combined.includes('benchmark') || combined.includes('investigate')) return 'research';
    if (combined.includes('test')) return 'testing';
    if (combined.includes('agent-core') || combined.includes('merge') || combined.includes('consolidate')) return 'migration';
    return 'feature';
  }

  _generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  _routingConfidence(task) {
    if (task.sourceRepo === 'ai-dev-orchestration-system') return 0.95;
    if (task.taskType === 'migration') return 0.9;
    return 0.8;
  }
}

module.exports = { IssueAdapter };

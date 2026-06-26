class ControlPlaneRouter {
  constructor(state) {
    this.state = state;
    this._knownRepos = [
      { name: 'ai-dev-orchestration-system', url: 'https://github.com/Konstantin2005/ai-dev-orchestration-system.git', primary: true },
      { name: 'ObsidianMain', url: null, primary: false, localPath: 'C:\\obsidian\\Main' }
    ];
  }

  async route(issue) {
    const targetRepo = this._detectRepo(issue);
    const taskType = this._classifyTask(issue);
    const agentStrategy = this._selectAgentStrategy(taskType, issue);
    const contextSources = await this._attachContextSources(issue, targetRepo);

    return {
      targetRepo,
      taskType,
      agentStrategy,
      contextSources,
      routingDecision: {
        reason: `Detected ${taskType} task for ${targetRepo.name}`,
        confidence: this._calculateConfidence(issue, targetRepo)
      }
    };
  }

  _detectRepo(issue) {
    for (const repo of this._knownRepos) {
      if (repo.localPath && issue.body && issue.body.includes(repo.localPath)) return repo;
    }

    if (issue.body && issue.body.toLowerCase().includes('obsidian')) {
      return this._knownRepos.find(r => r.name === 'ObsidianMain') || this._knownRepos[0];
    }

    return this._knownRepos[0];
  }

  _classifyTask(issue) {
    const body = (issue.body || '').toLowerCase();
    const title = (issue.title || '').toLowerCase();
    const combined = `${title} ${body}`;

    if (combined.includes('bug') || combined.includes('fix') || combined.includes('error') || combined.includes('crash')) return 'bug';
    if (combined.includes('refactor') || combined.includes('clean') || combined.includes('optimize')) return 'refactor';
    if (combined.includes('research') || combined.includes('investigate') || combined.includes('architect')) return 'research';
    if (combined.includes('test') || combined.includes('benchmark')) return 'testing';
    return 'feature';
  }

  _selectAgentStrategy(taskType, issue) {
    const strategies = {
      'feature': { preferredAgents: ['langgraph', 'autogen'], compare: false, fallback: 'custom' },
      'bug': { preferredAgents: ['aider', 'sweep'], compare: false, fallback: 'custom' },
      'refactor': { preferredAgents: ['aider', 'metagpt'], compare: false, fallback: 'custom' },
      'research': { preferredAgents: ['crewai', 'langgraph'], compare: true, fallback: 'custom' },
      'testing': { preferredAgents: ['langgraph', 'crewai'], compare: true, fallback: 'custom' }
    };

    const strategy = strategies[taskType] || strategies['feature'];

    if (issue.body && issue.body.includes('compare_agents: true')) {
      strategy.compare = true;
    }

    return strategy;
  }

  async _attachContextSources(issue, targetRepo) {
    const sources = [{ repo: targetRepo.name, type: 'target', priority: 1 }];

    for (const repo of this._knownRepos) {
      if (repo.name !== targetRepo.name) {
        sources.push({ repo: repo.name, type: 'context', priority: 2 });
      }
    }

    const history = this.state.getAgentPerformance();
    if (history.length > 0) {
      sources.push({ repo: 'agent-performance-history', type: 'metrics', priority: 3, data: history.slice(-5) });
    }

    return sources;
  }

  _calculateConfidence(issue, targetRepo) {
    if (targetRepo.localPath && issue.body && issue.body.includes(targetRepo.localPath)) return 0.95;
    if (targetRepo.primary) return 0.9;
    return 0.7;
  }
}

module.exports = ControlPlaneRouter;

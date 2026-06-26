class SelectionEngine {
  constructor(registry) {
    this.registry = registry;
  }

  async selectAgent(task, context = {}) {
    const agents = this.registry.list();
    if (agents.length === 0) {
      return {
        selected: null,
        reasoning: 'No agents available in registry',
        comparisonTable: [],
        fallback: null,
        riskAnalysis: []
      };
    }

    const scored = agents.map(agent => ({
      agent,
      score: this._calculateScore(agent, task, context)
    }));

    scored.sort((a, b) => b.score.total - a.score.total);

    const selected = scored[0].agent;
    const fallback = scored.length > 1 ? scored[1].agent : null;

    return {
      selected,
      reasoning: this._generateReasoning(scored[0], task),
      comparisonTable: scored.map(s => ({
        agent: s.agent.id,
        name: s.agent.name,
        totalScore: s.score.total,
        breakdown: s.score.breakdown
      })),
      fallback,
      riskAnalysis: this._analyzeRisks(selected, task),
      marketplace: this._suggestMarketplace(scored, task)
    };
  }

  suggestForMarketplace(task, context = {}, count = 3) {
    const agents = this.registry.list();
    const scored = agents.map(agent => ({
      agent,
      score: this._calculateScore(agent, task, context)
    }));
    scored.sort((a, b) => b.score.total - a.score.total);
    return scored.slice(0, count).map(s => s.agent.id);
  }

  _calculateScore(agent, task, context) {
    const taskComplexity = this._estimateComplexity(task);
    const taskDomain = this._detectDomain(task);
    const repoLang = context.language || 'unknown';

    const weights = {
      taskFit: 0.30,
      speed: 0.15,
      cost: 0.10,
      reliability: 0.20,
      languageMatch: 0.10,
      historicalPerformance: 0.15
    };

    const taskFit = this._scoreTaskFit(agent, taskDomain, taskComplexity);
    const speed = this._scoreSpeed(agent, taskComplexity);
    const cost = this._scoreCost(agent);
    const reliability = this._scoreReliability(agent);
    const languageMatch = this._scoreLanguageMatch(agent, repoLang);
    const historicalPerformance = this._scoreHistoricalPerformance(agent, context);

    const raw = {
      taskFit: taskFit * weights.taskFit,
      speed: speed * weights.speed,
      cost: cost * weights.cost,
      reliability: reliability * weights.reliability,
      languageMatch: languageMatch * weights.languageMatch,
      historicalPerformance: historicalPerformance * weights.historicalPerformance
    };

    const total = Object.values(raw).reduce((sum, v) => sum + v, 0);

    return {
      total: Math.round(total * 100) / 100,
      breakdown: {
        taskFit: { score: taskFit, weight: weights.taskFit, weighted: raw.taskFit },
        speed: { score: speed, weight: weights.speed, weighted: raw.speed },
        cost: { score: cost, weight: weights.cost, weighted: raw.cost },
        reliability: { score: reliability, weight: weights.reliability, weighted: raw.reliability },
        languageMatch: { score: languageMatch, weight: weights.languageMatch, weighted: raw.languageMatch },
        historicalPerformance: { score: historicalPerformance, weight: weights.historicalPerformance, weighted: raw.historicalPerformance }
      }
    };
  }

  _scoreHistoricalPerformance(agent, context) {
    const history = context.agentHistory || [];
    const agentHistory = history.filter(h => h.agentId === agent.id);
    if (agentHistory.length === 0) return 0.5;

    const completed = agentHistory.filter(h => h.status === 'COMPLETED').length;
    const successRate = completed / agentHistory.length;

    const avgDuration = agentHistory
      .filter(h => h.duration)
      .reduce((sum, h) => sum + h.duration, 0) / agentHistory.length;

    const speedScore = avgDuration < 5000 ? 1.0 : avgDuration < 30000 ? 0.7 : 0.4;

    return (successRate * 0.6 + speedScore * 0.4);
  }

  _estimateComplexity(task) {
    const length = (task.body || task.title || '').length;
    if (length > 2000) return 'high';
    if (length > 500) return 'medium';
    return 'low';
  }

  _detectDomain(task) {
    const text = ((task.title || '') + ' ' + (task.body || '')).toLowerCase();
    if (/frontend|ui|component|react|vue|css|html/.test(text)) return 'frontend';
    if (/backend|api|database|server|endpoint/.test(text)) return 'backend';
    if (/test|testing|qa|coverage/.test(text)) return 'testing';
    if (/documentation|docs|readme|guide/.test(text)) return 'documentation';
    if (/research|analysis|investigate|benchmark|compare/.test(text)) return 'research';
    return 'general';
  }

  _scoreTaskFit(agent, domain, complexity) {
    const useCases = (agent.bestUseCases || []).join(' ').toLowerCase();
    const strengths = (agent.strengths || []).join(' ').toLowerCase();
    const combined = useCases + ' ' + strengths;

    const domainKeywords = {
      frontend: ['frontend', 'ui', 'component', 'code generation'],
      backend: ['backend', 'api', 'software', 'code generation'],
      testing: ['testing', 'qa', 'validation', 'test'],
      documentation: ['documentation', 'content', 'research'],
      research: ['research', 'analysis', 'exploratory', 'compare'],
      general: ['software', 'code generation', 'pipeline', 'engineering']
    };

    const keywords = domainKeywords[domain] || domainKeywords.general;
    const matches = keywords.filter(k => combined.includes(k)).length;
    const baseScore = matches / keywords.length;

    if (complexity === 'high' && agent.id === 'metagpt') return Math.min(baseScore + 0.3, 1);
    if (complexity === 'low' && agent.speed.latency === 'low') return Math.min(baseScore + 0.2, 1);
    if (domain === 'research' && baseScore > 0) return Math.min(baseScore + 0.4, 1);
    if (domain === 'research') return Math.min(baseScore + 0.2, 1);

    return Math.max(baseScore, 0.1);
  }

  _scoreSpeed(agent, complexity) {
    const latency = agent.speed ? agent.speed.latency : 'medium';
    const map = { low: 1.0, medium: 0.6, high: 0.3, variable: 0.5 };
    const base = map[latency] || 0.5;

    if (complexity === 'high') return Math.min(base + 0.2, 1);
    if (complexity === 'low') return base;

    return base;
  }

  _scoreCost(agent) {
    const cost = agent.cost ? agent.cost.perTask : 'medium';
    const map = { low: 1.0, medium: 0.6, high: 0.3, variable: 0.5 };
    return map[cost] || 0.5;
  }

  _scoreReliability(agent) {
    const reliability = agent.reliability ? agent.reliability.score : 0.5;
    return Math.min(reliability + (agent.reliability?.fallbackImplemented ? 0.1 : 0), 1);
  }

  _scoreLanguageMatch(agent, repoLanguage) {
    const agentLang = (agent.language || '').toLowerCase();
    const repoLang = (repoLanguage || '').toLowerCase();

    if (agentLang === repoLang) return 1.0;
    if (agentLang === 'any' || repoLang === 'any') return 0.8;
    if (agentLang === 'javascript' && ['typescript', 'js', 'ts', 'node'].includes(repoLang)) return 0.9;
    if (agentLang === 'python' && ['py', 'python'].includes(repoLang)) return 0.9;
    return 0.5;
  }

  _generateReasoning(scoreResult, task) {
    const { agent, score } = scoreResult;
    const breakdown = score.breakdown;
    const topFactors = Object.entries(breakdown)
      .sort((a, b) => b[1].weighted - a[1].weighted)
      .slice(0, 3);

    const reasons = topFactors.map(([key, val]) =>
      `${key} (${val.score.toFixed(2)} → weighted ${val.weighted.toFixed(2)})`
    );

    return `Selected ${agent.name} (score: ${score.total.toFixed(2)}). ` +
      `Top factors: ${reasons.join(', ')}. ` +
      `Best for: ${(agent.bestUseCases || ['general tasks']).slice(0, 2).join(', ')}.`;
  }

  _analyzeRisks(agent, task) {
    const risks = [];

    if (!agent.reliability?.fallbackImplemented) {
      risks.push({
        type: 'no_fallback',
        severity: 'medium',
        description: `${agent.name} has no fallback mechanism. If execution fails, task will fail.`
      });
    }

    if (agent.runtime === 'docker') {
      risks.push({
        type: 'docker_dependency',
        severity: 'medium',
        description: `${agent.name} requires Docker. May fail if Docker is not available.`
      });
    }

    if (agent.cost?.perTask === 'high') {
      risks.push({
        type: 'high_cost',
        severity: 'low',
        description: `${agent.name} has high API cost (${agent.cost.apiCalls || '?'} calls per task).`
      });
    }

    if (agent.speed?.latency === 'high') {
      risks.push({
        type: 'slow_execution',
        severity: 'low',
        description: `${agent.name} has high latency (${agent.speed.avgExecutionMs || '?'}ms avg).`
      });
    }

    return risks;
  }

  _suggestMarketplace(scored, task) {
    const topTypes = new Map();
    for (const { agent, score } of scored) {
      const type = agent.type || 'graph';
      if (!topTypes.has(type) || score.total > topTypes.get(type).score) {
        topTypes.set(type, { agent: agent.id, name: agent.name, score: score.total });
      }
    }

    return Array.from(topTypes.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(t => ({ agent: t.agent, name: t.name }));
  }
}

module.exports = { SelectionEngine };

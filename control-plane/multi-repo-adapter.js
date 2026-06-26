class MultiRepoAdapter {
  constructor(deps = {}) {
    this.logger = deps.logger || null;
    this.state = deps.state || null;
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;
    console.error('[MULTI-REPO] Multi-Repo adapter initialized');
  }

  async executeAcrossRepos(routing, issue, agentIds, mode, context) {
    console.error(`[MULTI-REPO] Executing across repos: target=${routing.targetRepo.name}`);
    const startTime = Date.now();

    const execResult = {
      targetRepo: routing.targetRepo.name,
      taskType: routing.taskType,
      status: 'completed',
      duration: 0,
      agentIds: agentIds || [],
      mode: mode || 'single',
      context,
      results: []
    };

    try {
      const strategy = routing.agentStrategy;
      const agentsToRun = strategy.compare
        ? (agentIds && agentIds.length > 0 ? agentIds : strategy.preferredAgents)
        : (agentIds && agentIds.length > 0 ? agentIds : [strategy.preferredAgents[0]]);

      console.error(`[MULTI-REPO] Running agents: ${agentsToRun.join(', ')}${strategy.compare ? ' (COMPARE MODE)' : ''}`);

      const AgentMarketplace = require('../agents/marketplace').AgentMarketplace;
      const AgentRegistry = require('../agents/registry').AgentRegistry;

      const registry = await require('../agents/registry').initRegistry();
      const marketplace = new AgentMarketplace(registry);

      const marketplaceResult = await marketplace.execute(
        issue,
        agentsToRun,
        strategy.compare ? 'marketplace' : 'single',
        { ...context, routing }
      );

      execResult.results = marketplaceResult.results || [];
      execResult.marketplaceResult = marketplaceResult;
      execResult.duration = Date.now() - startTime;

      if (this.state) {
        for (const r of execResult.results) {
          if (r.status === 'COMPLETED') {
            this.state.recordAgentPerformance(r.agent, {
              duration: r.duration,
              status: r.status,
              taskType: routing.taskType,
              repo: routing.targetRepo.name
            });
          }
        }
      }

      if (strategy.compare && execResult.results.length >= 2) {
        try {
          const ComparisonEngine = require('../agents/comparison-engine').ComparisonEngine;
          const engine = new ComparisonEngine(registry);
          const comparison = engine.compare(execResult.results);

          execResult.comparison = comparison;

          if (this.state) {
            this.state.recordBenchmark({
              issueId: issue.id,
              agents: agentsToRun,
              winner: comparison.winner?.agent,
              report: comparison.report
            });
          }

          if (this.logger) {
            this.logger.logBenchmark({
              issueId: issue.id,
              agents: agentsToRun,
              winner: comparison.winner?.agent,
              scores: comparison.results?.map(r => ({ agent: r.agent, total: r.total }))
            });
          }
        } catch (err) {
          console.error(`[MULTI-REPO] Comparison failed: ${err.message}`);
        }
      }
    } catch (err) {
      execResult.status = 'error';
      execResult.error = err.message;
      console.error(`[MULTI-REPO] Execution error: ${err.message}`);
    }

    if (this.logger) {
      this.logger.logCost({
        operation: 'executeAcrossRepos',
        repo: routing.targetRepo.name,
        duration: execResult.duration,
        agentsUsed: execResult.results.length
      });
    }

    return execResult;
  }
}

module.exports = MultiRepoAdapter;

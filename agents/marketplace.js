class AgentMarketplace {
  constructor(registry) {
    this.registry = registry;
  }

  async execute(task, agentIds = [], mode = 'single', context = {}) {
    if (mode === 'single' || agentIds.length <= 1) {
      return this._executeSingle(task, agentIds[0] || 'langgraph', context);
    }

    return this._executeMarketplace(task, agentIds, context);
  }

  async _executeSingle(task, agentId, context) {
    const agent = this.registry.get(agentId);
    if (!agent) {
      return {
        mode: 'single',
        requestedAgents: [agentId],
        results: [{
          agent: agentId,
          status: 'SKIPPED',
          reason: `Agent ${agentId} not found in registry`
        }],
        bestResult: null
      };
    }

    const AdapterClass = this._getAdapterClass(agentId);
    if (!AdapterClass) {
      return {
        mode: 'single',
        requestedAgents: [agentId],
        results: [{
          agent: agentId,
          name: agent.name,
          status: 'SKIPPED',
          reason: `No adapter implementation for ${agentId}`
        }],
        bestResult: null
      };
    }

    const adapter = new AdapterClass();
    await adapter.init();
    const startTime = Date.now();
    const result = await adapter.execute(task, context);
    const duration = Date.now() - startTime;

    return {
      mode: 'single',
      requestedAgents: [agentId],
      results: [{
        agent: agentId,
        name: agent.name,
        type: agent.type,
        status: result.status || 'COMPLETED',
        duration,
        files: result.files || [],
        logs: result.logs || {}
      }],
      bestResult: {
        agent: agentId,
        name: agent.name,
        duration
      }
    };
  }

  async _executeMarketplace(task, agentIds, context) {
    const availableAgents = agentIds
      .map(id => ({ id, descriptor: this.registry.get(id) }))
      .filter(a => a.descriptor && this._getAdapterClass(a.id));

    if (availableAgents.length === 0) {
      return {
        mode: 'marketplace',
        requestedAgents: agentIds,
        results: [],
        bestResult: null,
        comparison: null
      };
    }

    console.error(`[MARKETPLACE] Running ${availableAgents.length} agents in parallel...`);

    const results = await Promise.allSettled(
      availableAgents.map(async ({ id, descriptor }) => {
        const AdapterClass = this._getAdapterClass(id);
        const adapter = new AdapterClass();
        await adapter.init();
        const startTime = Date.now();

        try {
          const output = await adapter.execute(task, context);
          return {
            agent: id,
            name: descriptor.name,
            type: descriptor.type,
            status: output.status || 'COMPLETED',
            duration: Date.now() - startTime,
            output,
            error: null
          };
        } catch (err) {
          return {
            agent: id,
            name: descriptor.name,
            type: descriptor.type,
            status: 'ERROR',
            duration: Date.now() - startTime,
            output: null,
            error: err.message
          };
        }
      })
    );

    const marketResults = results.map(r =>
      r.status === 'fulfilled' ? r.value : {
        agent: 'unknown',
        name: 'Unknown',
        status: 'ERROR',
        duration: 0,
        output: null,
        error: r.reason?.message || 'Promise rejected'
      }
    );

    const successful = marketResults.filter(r => r.status === 'COMPLETED' && r.output);
    let bestResult = null;
    if (successful.length > 0) {
      successful.sort((a, b) => a.duration - b.duration);
      bestResult = {
        agent: successful[0].agent,
        name: successful[0].name,
        duration: successful[0].duration
      };
    }

    return {
      mode: 'marketplace',
      requestedAgents: agentIds,
      results: marketResults.map(r => ({
        agent: r.agent,
        name: r.name,
        type: r.type,
        status: r.status,
        duration: r.duration,
        error: r.error
      })),
      bestResult
    };
  }

  _getAdapterClass(agentId) {
    const adapters = {
      'langgraph': () => { try { return require('./adapters/langgraph-adapter').LangGraphAdapter } catch { return null } },
      'autogen': () => { try { return require('./adapters/autogen-adapter').AutoGenAdapter } catch { return null } },
      'crewai': () => { try { return require('./adapters/crewai-adapter').CrewAIAdapter } catch { return null } },
      'metagpt': () => { try { return require('./adapters/metagpt-adapter').MetaGPTAdapter } catch { return null } },
      'aider': () => { try { return require('./adapters/aider-adapter').AiderAdapter } catch { return null } },
      'sweep': () => { try { return require('./adapters/sweep-adapter').SweepAIAdapter } catch { return null } },
      'custom': () => { try { return require('./adapters/custom-adapter').CustomAgentAdapter } catch { return null } }
    };
    const loader = adapters[agentId];
    return loader ? loader() : null;
  }
}

module.exports = { AgentMarketplace };

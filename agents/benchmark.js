class BenchmarkEngine {
  constructor(registry) {
    this.registry = registry;
  }

  async run(task, agentIds = [], context = {}) {
    const agentsToTest = agentIds.length > 0
      ? agentIds.map(id => this.registry.get(id)).filter(Boolean)
      : this.registry.list();

    if (agentsToTest.length === 0) {
      return {
        task: { title: task.title },
        results: [],
        comparison: [],
        winner: null,
        report: 'No agents available for benchmarking'
      };
    }

    console.error(`[BENCHMARK] Running benchmark for ${agentsToTest.length} agents on task: ${task.title || 'untitled'}`);

    const results = [];
    for (const agent of agentsToTest) {
      try {
        const AdapterClass = this._getAdapterClass(agent.id);
        if (!AdapterClass) {
          results.push({
            agent: agent.id,
            name: agent.name,
            status: 'SKIPPED',
            reason: `No adapter implementation for ${agent.id}`,
            duration: 0,
            output: null
          });
          continue;
        }

        const adapter = new AdapterClass();
        const startTime = Date.now();

        await adapter.init();
        const output = await adapter.execute(task, context);

        const duration = Date.now() - startTime;
        const validation = adapter.validate(output);

        results.push({
          agent: agent.id,
          name: agent.name,
          status: validation.valid ? 'SUCCESS' : 'VALIDATION_FAILED',
          duration,
          outputSize: JSON.stringify(output).length,
          validationErrors: validation.errors,
          output
        });

        console.error(`[BENCHMARK] ${agent.id}: ${duration}ms - ${validation.valid ? 'OK' : 'VALIDATION_FAILED'}`);
      } catch (err) {
        results.push({
          agent: agent.id,
          name: agent.name,
          status: 'ERROR',
          duration: 0,
          error: err.message,
          output: null
        });
        console.error(`[BENCHMARK] ${agent.id}: ERROR - ${err.message}`);
      }
    }

    const winner = this._determineWinner(results);
    const comparison = this._buildComparisonTable(results);
    const report = this._generateReport(results, winner, task);

    return {
      task: { title: task.title, body: task.body?.slice(0, 200) },
      results,
      comparison,
      winner,
      report
    };
  }

  _getAdapterClass(agentId) {
    const adapterMap = {
      'langgraph': () => require('./adapters/langgraph-adapter').LangGraphAdapter,
      'autogen': () => require('./adapters/autogen-adapter').AutoGenAdapter,
      'crewai': () => require('./adapters/crewai-adapter').CrewAIAdapter,
      'metagpt': () => require('./adapters/metagpt-adapter').MetaGPTAdapter,
      'custom': () => require('./adapters/custom-adapter').CustomAgentAdapter
    };
    const loader = adapterMap[agentId];
    if (!loader) return null;
    try {
      return loader();
    } catch {
      return null;
    }
  }

  _determineWinner(results) {
    const successful = results.filter(r => r.status === 'SUCCESS');
    if (successful.length === 0) return null;

    successful.sort((a, b) => {
      const qualityA = a.validationErrors?.length || 0;
      const qualityB = b.validationErrors?.length || 0;
      if (qualityA !== qualityB) return qualityA - qualityB;
      return a.duration - b.duration;
    });

    return successful[0].agent;
  }

  _buildComparisonTable(results) {
    return results.map(r => ({
      agent: r.agent,
      name: r.name,
      status: r.status,
      duration: `${r.duration}ms`,
      outputSize: r.outputSize ? `${(r.outputSize / 1024).toFixed(1)}KB` : 'N/A',
      errors: r.validationErrors?.length || (r.error ? 1 : 0)
    }));
  }

  _generateReport(results, winner, task) {
    let report = `# Benchmark Report\n\n`;
    report += `**Task:** ${task.title || 'Untitled'}\n`;
    report += `**Date:** ${new Date().toISOString()}\n`;
    report += `**Agents tested:** ${results.length}\n\n`;

    if (winner) {
      report += `## Winner\n\n**${results.find(r => r.agent === winner)?.name}** (${winner})\n\n`;
    }

    report += `## Results\n\n`;
    report += `| Agent | Status | Duration | Output | Errors |\n`;
    report += `|-------|--------|----------|--------|--------|\n`;

    for (const r of results) {
      report += `| ${r.name} | ${r.status} | ${r.duration}ms | ${r.outputSize || 'N/A'} | ${r.validationErrors?.length || (r.error ? 1 : 0)} |\n`;
    }

    report += `\n## Details\n\n`;
    for (const r of results) {
      report += `### ${r.name} (${r.agent})\n\n`;
      report += `Status: **${r.status}**\n\n`;
      if (r.duration) report += `Duration: ${r.duration}ms\n\n`;
      if (r.validationErrors?.length) {
        report += `Validation Errors:\n`;
        for (const e of r.validationErrors) {
          report += `- ${e}\n`;
        }
        report += `\n`;
      }
      if (r.error) {
        report += `Error: ${r.error}\n\n`;
      }
    }

    return report;
  }
}

module.exports = { BenchmarkEngine };

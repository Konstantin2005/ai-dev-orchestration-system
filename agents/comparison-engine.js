class ComparisonEngine {
  constructor(registry) {
    this.registry = registry;
  }

  compare(results) {
    if (!results || results.length === 0) {
      return { results: [], winner: null, report: 'No results to compare' };
    }

    const scored = results.map(r => ({
      ...r,
      scores: this._calculateScores(r)
    }));

    scored.sort((a, b) => {
      const totalA = Object.values(a.scores).reduce((s, v) => s + v, 0);
      const totalB = Object.values(b.scores).reduce((s, v) => s + v, 0);
      return totalB - totalA;
    });

    const winner = scored.length > 0 ? {
      agent: scored[0].agent,
      name: scored[0].name,
      totalScore: Object.values(scored[0].scores).reduce((s, v) => s + v, 0)
    } : null;

    return {
      results: scored,
      winner,
      comparison: this._buildComparisonTable(scored),
      report: this._generateReport(scored, winner)
    };
  }

  _calculateScores(result) {
    const descriptor = this.registry.get(result.agent);
    const manifest = descriptor || {};

    const speed = this._scoreSpeed(result.duration, manifest);
    const correctness = this._scoreCorrectness(result);
    const determinism = this._scoreDeterminism(result, manifest);
    const cost = this._scoreCost(result, manifest);
    const codeQuality = this._scoreCodeQuality(result);
    const stability = this._scoreStability(result, manifest);

    return { speed, correctness, determinism, cost, codeQuality, stability };
  }

  _scoreSpeed(duration, manifest) {
    if (!duration) return 0.5;
    const expected = manifest.speed?.avgExecutionMs || 10000;
    if (duration < expected * 0.5) return 1.0;
    if (duration < expected) return 0.8;
    if (duration < expected * 2) return 0.5;
    return 0.2;
  }

  _scoreCorrectness(result) {
    if (result.status === 'ERROR') return 0;
    if (result.status === 'SKIPPED') return 0;
    if (result.status === 'COMPLETED') {
      const files = result.output?.files || result.files || [];
      if (files.length > 0) return 1.0;
      return 0.5;
    }
    return 0.3;
  }

  _scoreDeterminism(result, manifest) {
    const reliability = manifest.reliability?.score || 0.5;
    const hasFallback = manifest.reliability?.fallbackImplemented ? 0.1 : 0;
    return Math.min(reliability + hasFallback, 1);
  }

  _scoreCost(result, manifest) {
    const costMap = { low: 1.0, medium: 0.6, high: 0.3, variable: 0.5 };
    return costMap[manifest.cost?.perTask] || 0.5;
  }

  _scoreCodeQuality(result) {
    const files = result.output?.files || result.files || [];
    if (files.length === 0) return 0.3;

    const hasStructure = files.some(f => f.path && f.content);
    const pathsValid = files.every(f => f.path && !f.path.includes('..'));
    const contentNotEmpty = files.every(f => f.content && f.content.length > 10);

    let score = 0.3;
    if (hasStructure) score += 0.3;
    if (pathsValid) score += 0.2;
    if (contentNotEmpty) score += 0.2;
    return Math.min(score, 1);
  }

  _scoreStability(result, manifest) {
    if (result.status === 'ERROR') return 0;
    if (result.status === 'SKIPPED') return 0.1;
    if (result.error) return 0.3;
    return manifest.reliability?.score || 0.7;
  }

  _buildComparisonTable(scored) {
    return scored.map(r => ({
      agent: r.agent,
      name: r.name || r.agent,
      type: r.type || 'unknown',
      status: r.status,
      duration: `${r.duration}ms`,
      scores: r.scores,
      totalScore: Object.values(r.scores).reduce((s, v) => s + v, 0).toFixed(2)
    }));
  }

  _generateReport(scored, winner) {
    let report = `# Agent Comparison Report\n\n`;
    report += `**Date:** ${new Date().toISOString()}\n`;
    report += `**Agents compared:** ${scored.length}\n\n`;

    if (winner) {
      report += `## Winner\n\n**${winner.name}** (${winner.agent}) — Total Score: ${winner.totalScore.toFixed(2)}\n\n`;
    }

    report += `## Comparison Table\n\n`;
    report += `| Agent | Type | Status | Duration | Speed | Correctness | Determinism | Cost | Code Quality | Stability | Total |\n`;
    report += `|------|------|--------|----------|-------|-------------|-------------|------|-------------|-----------|-------|\n`;

    for (const r of this._buildComparisonTable(scored)) {
      const s = r.scores;
      report += `| ${r.name} | ${r.type} | ${r.status} | ${r.duration} | ${s.speed.toFixed(2)} | ${s.correctness.toFixed(2)} | ${s.determinism.toFixed(2)} | ${s.cost.toFixed(2)} | ${s.codeQuality.toFixed(2)} | ${s.stability.toFixed(2)} | **${r.totalScore}** |\n`;
    }

    report += `\n## Score Breakdown\n\n`;
    for (const r of scored) {
      const total = Object.values(r.scores).reduce((s, v) => s + v, 0);
      report += `### ${r.name}\n\n`;
      report += `Total Score: **${total.toFixed(2)}**\n\n`;
      report += `| Criteria | Score |\n|----------|-------|\n`;
      for (const [criterion, score] of Object.entries(r.scores)) {
        report += `| ${criterion} | ${score.toFixed(2)} |\n`;
      }
      report += `\n`;
    }

    return report;
  }
}

module.exports = { ComparisonEngine };

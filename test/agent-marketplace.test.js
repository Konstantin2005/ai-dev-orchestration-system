const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('AgentMarketplace', () => {
  let AgentMarketplace;
  let AgentRegistry;

  before(() => {
    AgentMarketplace = require('../agents/marketplace').AgentMarketplace;
    AgentRegistry = require('../agents/registry').AgentRegistry;
  });

  async function createRegistry(agents) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mkt-'));
    for (const a of agents) {
      fs.writeFileSync(path.join(tempDir, `${a.id}.json`), JSON.stringify({
        id: a.id, name: a.name, type: a.type || 'graph',
        capabilities: a.capabilities || ['code'],
        strengths: a.strengths || ['general'],
        bestUseCases: a.bestUseCases || ['general'],
        speed: a.speed || { latency: 'low', avgExecutionMs: 1000 },
        cost: a.cost || { perTask: 'low' },
        reliability: a.reliability || { score: 0.8, fallbackImplemented: true },
        language: a.language || 'javascript',
        runtime: a.runtime || 'node'
      }));
    }
    const registry = new AgentRegistry(tempDir);
    await registry.init();
    return { registry, tempDir };
  }

  it('single mode runs 1 agent', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'custom', name: 'Custom Agent' }
    ]);
    const marketplace = new AgentMarketplace(registry);
    const result = await marketplace.execute({ title: 'test' }, ['custom'], 'single');
    assert.equal(result.mode, 'single');
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].agent, 'custom');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('marketplace mode runs multiple agents', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'custom', name: 'Custom Agent', type: 'conversational' },
      { id: 'sweep', name: 'Sweep AI', type: 'hybrid' }
    ]);
    const marketplace = new AgentMarketplace(registry);
    const result = await marketplace.execute({ title: 'test' }, ['custom', 'sweep'], 'marketplace');
    assert.equal(result.mode, 'marketplace');
    assert.ok(result.results.length >= 1);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('handles unknown agent gracefully', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'known', name: 'Known Agent' }
    ]);
    const marketplace = new AgentMarketplace(registry);
    const result = await marketplace.execute({ title: 'test' }, ['nonexistent'], 'single');
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].status, 'SKIPPED');
    assert.ok(result.results[0].reason);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns empty for marketplace with no matching adapters', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'no-adapter-a', name: 'No Adapter A' },
      { id: 'no-adapter-b', name: 'No Adapter B' }
    ]);
    const marketplace = new AgentMarketplace(registry);
    const result = await marketplace.execute({ title: 'test' }, ['no-adapter-a', 'no-adapter-b'], 'marketplace');
    assert.equal(result.mode, 'marketplace');
    assert.equal(result.results.length, 0);
    assert.equal(result.bestResult, null);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('single mode defaults to langgraph when no agentId given, then skips cleanly', async () => {
    const { registry, tempDir } = await createRegistry([]);
    const marketplace = new AgentMarketplace(registry);
    const result = await marketplace.execute({ title: 'test' }, [], 'single');
    assert.equal(result.requestedAgents[0], 'langgraph');
    assert.equal(result.results[0].status, 'SKIPPED');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('ComparisonEngine', () => {
  let ComparisonEngine;
  let AgentRegistry;

  before(() => {
    ComparisonEngine = require('../agents/comparison-engine').ComparisonEngine;
    AgentRegistry = require('../agents/registry').AgentRegistry;
  });

  function createEngine(agents) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmp-'));
    for (const a of agents) {
      fs.writeFileSync(path.join(tempDir, `${a.id}.json`), JSON.stringify(a));
    }
    const registry = new AgentRegistry(tempDir);
    registry.init();
    const engine = new ComparisonEngine(registry);
    return { engine, tempDir };
  }

  it('handles empty results', () => {
    const { engine, tempDir } = createEngine([
      { id: 'test', name: 'Test', speed: { latency: 'low' }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true } }
    ]);
    const result = engine.compare([]);
    assert.equal(result.winner, null);
    assert.ok(result.report.includes('No results'));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('scores speed correctly', () => {
    const { engine, tempDir } = createEngine([
      { id: 'fast', name: 'Fast', speed: { latency: 'low', avgExecutionMs: 1000 }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true } }
    ]);
    const result = engine.compare([
      { agent: 'fast', name: 'Fast', type: 'graph', status: 'COMPLETED', duration: 500, output: { files: [{ path: 'a.js', content: 'x' }] } }
    ]);
    assert.ok(result.winner);
    assert.ok(result.results[0].scores.speed >= 0.8);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('scores correctness by file count', () => {
    const { engine, tempDir } = createEngine([
      { id: 'test', name: 'Test', speed: { latency: 'low' }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true } }
    ]);
    const result = engine.compare([
      { agent: 'test', name: 'Test', status: 'COMPLETED', duration: 1000, output: { files: [{ path: 'a.js', content: 'content' }] } }
    ]);
    assert.equal(result.results[0].scores.correctness, 1.0);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('picks winner with highest total', () => {
    const { engine, tempDir } = createEngine([
      { id: 'good', name: 'Good', speed: { latency: 'low' }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true } },
      { id: 'bad', name: 'Bad', speed: { latency: 'high' }, cost: { perTask: 'high' }, reliability: { score: 0.3, fallbackImplemented: false } }
    ]);
    const result = engine.compare([
      { agent: 'good', name: 'Good', status: 'COMPLETED', duration: 500, output: { files: [{ path: 'a.js', content: 'content' }] } },
      { agent: 'bad', name: 'Bad', status: 'ERROR', duration: 60000, output: null }
    ]);
    assert.equal(result.winner.agent, 'good');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates markdown report', () => {
    const { engine, tempDir } = createEngine([
      { id: 'a', name: 'Agent A', speed: { latency: 'low' }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true } }
    ]);
    const result = engine.compare([
      { agent: 'a', name: 'Agent A', type: 'graph', status: 'COMPLETED', duration: 1000, output: { files: [] } }
    ]);
    assert.ok(result.report.includes('# Agent Comparison Report'));
    assert.ok(result.report.includes('Agent A'));
    assert.ok(result.report.includes('speed'));
    assert.ok(result.report.includes('correctness'));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('AiderAdapter', () => {
  let AiderAdapter;

  before(() => {
    AiderAdapter = require('../agents/adapters/aider-adapter').AiderAdapter;
  });

  it('init() executes without error', async () => {
    const adapter = new AiderAdapter({ aiderPath: 'echo' });
    await adapter.init();
    assert.ok(true);
  });

  it('execute() returns structured output when CLI succeeds', async () => {
    const adapter = new AiderAdapter({ aiderPath: 'echo' });
    const result = await adapter.execute({ title: 'test', body: 'test body' }, {});
    assert.ok(result.status);
    assert.ok(Array.isArray(result.files));
    assert.ok(result.logs);
  });

  it('exposes correct metadata', () => {
    const adapter = new AiderAdapter();
    const meta = adapter.getMetadata();
    assert.equal(meta.id, 'aider');
    assert.equal(meta.type, 'code');
    assert.ok(meta.capabilities.includes('code'));
  });

  it('validate() checks output structure', () => {
    const adapter = new AiderAdapter();
    assert.ok(adapter.validate({ files: [] }).valid);
    assert.ok(!adapter.validate(null).valid);
  });
});

describe('SweepAIAdapter', () => {
  let SweepAIAdapter;

  before(() => {
    SweepAIAdapter = require('../agents/adapters/sweep-adapter').SweepAIAdapter;
  });

  it('init() executes without error', async () => {
    const adapter = new SweepAIAdapter();
    await adapter.init();
    assert.ok(true);
  });

  it('execute() returns plan + files', async () => {
    const adapter = new SweepAIAdapter();
    const result = await adapter.execute({ title: 'test task', body: 'do something' }, {});
    assert.equal(result.status, 'COMPLETED');
    assert.ok(result.files.length > 0);
    assert.ok(result.logs.sweep);
  });

  it('exposes correct metadata', () => {
    const adapter = new SweepAIAdapter();
    const meta = adapter.getMetadata();
    assert.equal(meta.id, 'sweep');
    assert.equal(meta.type, 'hybrid');
    assert.ok(meta.capabilities.includes('pr'));
  });
});

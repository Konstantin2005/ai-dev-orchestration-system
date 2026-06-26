const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('AgentRegistry', () => {
  let AgentRegistry;

  before(() => {
    AgentRegistry = require('../agents/registry').AgentRegistry;
  });

  it('count() returns 0 for empty directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-'));
    const registry = new AgentRegistry(tempDir);
    await registry.init();
    assert.equal(registry.count(), 0);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads manifests from directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-'));
    fs.writeFileSync(path.join(tempDir, 'test-agent.json'), JSON.stringify({
      id: 'test-agent', name: 'Test Agent', framework: 'test', strengths: ['testing']
    }));

    const registry = new AgentRegistry(tempDir);
    await registry.init();
    assert.equal(registry.count(), 1);
    assert.equal(registry.get('test-agent').name, 'Test Agent');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('skips invalid JSON files', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-'));
    fs.writeFileSync(path.join(tempDir, 'valid.json'), JSON.stringify({ id: 'valid', name: 'Valid' }));
    fs.writeFileSync(path.join(tempDir, 'broken.json'), '{invalid json');

    const registry = new AgentRegistry(tempDir);
    await registry.init();
    assert.equal(registry.count(), 1);
    assert.ok(registry.get('valid'));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('list() returns agents without internal fields', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-'));
    fs.writeFileSync(path.join(tempDir, 'a1.json'), JSON.stringify({ id: 'a1', name: 'A1' }));
    fs.writeFileSync(path.join(tempDir, 'a2.json'), JSON.stringify({ id: 'a2', name: 'A2' }));

    const registry = new AgentRegistry(tempDir);
    await registry.init();
    const agents = registry.list();
    assert.equal(agents.length, 2);
    for (const a of agents) {
      assert.equal(a._manifestPath, undefined);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('get(id) returns null for unknown agent', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-'));
    const registry = new AgentRegistry(tempDir);
    await registry.init();
    assert.equal(registry.get('nonexistent'), null);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('find() searches across multiple fields', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-'));
    fs.writeFileSync(path.join(tempDir, 'da.json'), JSON.stringify({
      id: 'docker-agent', name: 'Docker Agent', strengths: ['docker support'], bestUseCases: ['container']
    }));
    fs.writeFileSync(path.join(tempDir, 'other.json'), JSON.stringify({
      id: 'other', name: 'Other', strengths: ['fast'], bestUseCases: ['simple']
    }));

    const registry = new AgentRegistry(tempDir);
    await registry.init();
    const results = registry.find('docker');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'docker-agent');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('compare() returns selected agents', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-'));
    fs.writeFileSync(path.join(tempDir, 'a.json'), JSON.stringify({ id: 'a', name: 'A' }));
    fs.writeFileSync(path.join(tempDir, 'b.json'), JSON.stringify({ id: 'b', name: 'B' }));
    fs.writeFileSync(path.join(tempDir, 'c.json'), JSON.stringify({ id: 'c', name: 'C' }));

    const registry = new AgentRegistry(tempDir);
    await registry.init();
    const result = registry.compare(['a', 'c']);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, 'a');
    assert.equal(result[1].id, 'c');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('SelectionEngine', () => {
  let SelectionEngine;

  before(() => {
    SelectionEngine = require('../agents/selection-engine').SelectionEngine;
  });

  async function createRegistry(agents) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sel-'));
    for (const a of agents) {
      fs.writeFileSync(path.join(tempDir, `${a.id}.json`), JSON.stringify(a));
    }
    const AgentRegistry = require('../agents/registry').AgentRegistry;
    const registry = new AgentRegistry(tempDir);
    await registry.init();
    return { registry, tempDir };
  }

  it('selects backend agent for API task', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'backend-agent', name: 'Backend Pro', strengths: ['backend', 'api', 'code generation'], bestUseCases: ['backend tasks'], speed: { latency: 'low' }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true }, language: 'javascript' },
      { id: 'research-agent', name: 'Research Pro', strengths: ['research', 'analysis'], bestUseCases: ['research tasks'], speed: { latency: 'medium' }, cost: { perTask: 'medium' }, reliability: { score: 0.8, fallbackImplemented: false }, language: 'python' }
    ]);
    const engine = new SelectionEngine(registry);
    const result = await engine.selectAgent(
      { title: 'Create REST API endpoint', body: 'Build a new API endpoint' },
      { language: 'javascript' }
    );
    assert.ok(result.selected);
    assert.equal(result.selected.id, 'backend-agent');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('selects research agent for research task', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'backend-agent', name: 'Backend Pro', strengths: ['backend'], bestUseCases: ['backend'], speed: { latency: 'low' }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true }, language: 'javascript' },
      { id: 'research-agent', name: 'Research Pro', strengths: ['research', 'analysis'], bestUseCases: ['research'], speed: { latency: 'medium' }, cost: { perTask: 'medium' }, reliability: { score: 0.8, fallbackImplemented: false }, language: 'python' }
    ]);
    const engine = new SelectionEngine(registry);
    const result = await engine.selectAgent(
      { title: 'Research best practices', body: 'Analyze and compare different approaches' },
      {}
    );
    assert.ok(result.selected);
    assert.equal(result.selected.id, 'research-agent');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns fallback different from selected', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'agent-a', name: 'Agent A', strengths: ['code'], bestUseCases: ['general'], speed: { latency: 'low' }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true }, language: 'javascript' },
      { id: 'agent-b', name: 'Agent B', strengths: ['research'], bestUseCases: ['research'], speed: { latency: 'medium' }, cost: { perTask: 'medium' }, reliability: { score: 0.8, fallbackImplemented: false }, language: 'python' }
    ]);
    const engine = new SelectionEngine(registry);
    const result = await engine.selectAgent({ title: 'Some task' }, {});
    assert.ok(result.fallback);
    assert.notEqual(result.fallback.id, result.selected.id);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns comparison table with scores', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'agent-a', name: 'Agent A', strengths: ['general'], bestUseCases: ['general'], speed: { latency: 'low' }, cost: { perTask: 'low' }, reliability: { score: 0.9, fallbackImplemented: true }, language: 'javascript' },
      { id: 'agent-b', name: 'Agent B', strengths: ['general'], bestUseCases: ['general'], speed: { latency: 'medium' }, cost: { perTask: 'medium' }, reliability: { score: 0.8, fallbackImplemented: false }, language: 'python' }
    ]);
    const engine = new SelectionEngine(registry);
    const result = await engine.selectAgent({ title: 'Test' }, {});
    assert.ok(result.comparisonTable.length >= 2);
    assert.ok(result.comparisonTable[0].totalScore !== undefined);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('analyzes risks for docker agents', async () => {
    const { registry, tempDir } = await createRegistry([
      { id: 'docker-agent', name: 'Docker', strengths: ['docker', 'container'], bestUseCases: ['docker tasks'], speed: { latency: 'high' }, cost: { perTask: 'high' }, reliability: { score: 0.7, fallbackImplemented: false }, language: 'python', runtime: 'docker' }
    ]);
    const engine = new SelectionEngine(registry);
    const result = await engine.selectAgent({ title: 'Run container task using Docker', body: 'Need to run something in Docker' }, {});
    assert.ok(result.riskAnalysis.length > 0);
    const hasDockerRisk = result.riskAnalysis.some(r => r.type === 'docker_dependency');
    assert.ok(hasDockerRisk);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('handles empty registry', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
    const AgentRegistry = require('../agents/registry').AgentRegistry;
    const emptyReg = new AgentRegistry(tempDir);
    await emptyReg.init();
    const engine = new SelectionEngine(emptyReg);
    const result = await engine.selectAgent({ title: 'test' }, {});
    assert.equal(result.selected, null);
    assert.ok(result.reasoning.includes('No agents'));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('BenchmarkEngine', () => {
  let BenchmarkEngine;

  before(() => {
    BenchmarkEngine = require('../agents/benchmark').BenchmarkEngine;
  });

  it('run() returns results array', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-'));
    const AgentRegistry = require('../agents/registry').AgentRegistry;
    const registry = new AgentRegistry(tempDir);
    fs.writeFileSync(path.join(tempDir, 'langgraph.json'), JSON.stringify({
      id: 'langgraph', name: 'LangGraph', strengths: ['code generation'],
      bestUseCases: ['backend tasks'], speed: { latency: 'low' }, cost: { perTask: 'low' },
      reliability: { score: 0.9, fallbackImplemented: true }, language: 'javascript'
    }));
    await registry.init();
    const bench = new BenchmarkEngine(registry);
    const result = await bench.run({ title: 'test' }, ['langgraph']);
    assert.ok(result.results.length >= 1);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('handles agent without adapter as SKIPPED', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-'));
    const AgentRegistry = require('../agents/registry').AgentRegistry;
    const registry = new AgentRegistry(tempDir);
    fs.writeFileSync(path.join(tempDir, 'no-adapter.json'), JSON.stringify({
      id: 'no-adapter', name: 'No Adapter Agent', strengths: ['test'],
      bestUseCases: ['test'], speed: { latency: 'low' }, cost: { perTask: 'low' },
      reliability: { score: 0.5, fallbackImplemented: false }, language: 'any'
    }));
    await registry.init();
    const bench = new BenchmarkEngine(registry);
    const result = await bench.run({ title: 'test' }, ['no-adapter']);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].status, 'SKIPPED');
    assert.ok(result.results[0].reason);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates markdown report', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-'));
    const AgentRegistry = require('../agents/registry').AgentRegistry;
    const registry = new AgentRegistry(tempDir);
    fs.writeFileSync(path.join(tempDir, 'langgraph.json'), JSON.stringify({
      id: 'langgraph', name: 'LangGraph', strengths: ['code'],
      bestUseCases: ['backend'], speed: { latency: 'low' }, cost: { perTask: 'low' },
      reliability: { score: 0.9, fallbackImplemented: true }, language: 'javascript'
    }));
    await registry.init();
    const bench = new BenchmarkEngine(registry);
    const result = await bench.run({ title: 'benchmark test' }, ['langgraph']);
    assert.ok(result.report.includes('# Benchmark Report'));
    assert.ok(result.report.includes('benchmark test'));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

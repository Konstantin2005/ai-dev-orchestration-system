const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('runtime/index.js', () => {
  it('loads all exports', () => {
    const mod = require('../runtime/index');
    assert.ok(mod.execute);
    assert.ok(mod.buildGraph);
    assert.ok(mod.formatOutput);
    assert.ok(mod.createOrchestrator);
    assert.ok(mod.UnifiedOrchestrator);
    assert.ok(mod.CentralLogger);
    assert.ok(mod.ZeroTrustValidator);
    assert.ok(mod.GitHubRepoAdapter);
    assert.ok(mod.ObsidianRepoAdapter);
    assert.ok(mod.GenericRepoAdapter);
    assert.ok(mod.UnifiedAgent);
  });

  it('createOrchestrator returns UnifiedOrchestrator', () => {
    const { createOrchestrator, UnifiedOrchestrator } = require('../runtime/index');
    const orchestrator = createOrchestrator('/tmp/test');
    assert.ok(orchestrator instanceof UnifiedOrchestrator);
    assert.ok(orchestrator.scheduler);
    assert.ok(orchestrator.stateManager);
    assert.ok(orchestrator.validator);
    assert.ok(orchestrator.logger);
  });

  it('execute function exists and returns expected shape', async () => {
    const { execute } = require('../runtime/index');
    const issue = { id: 999, title: 'test', body: 'test body', labels: [] };
    const result = await execute(issue, { projectRoot: process.cwd() });
    assert.ok(result);
    assert.ok('status' in result);
    assert.ok('trace' in result);
    assert.ok('runId' in result);
  });

  it('control-plane module loads independently', () => {
    const cp = require('../runtime/control-plane/index');
    assert.ok(cp.UnifiedOrchestrator);
    assert.ok(cp.StateManager);
    assert.ok(cp.Scheduler);
    assert.ok(cp.CentralLogger);
    assert.ok(cp.ZeroTrustValidator);
    assert.ok(cp.createDefaultOrchestrator);
  });

  it('UnifiedAgent can be instantiated', () => {
    const { UnifiedAgent } = require('../runtime/index');
    const agent = new UnifiedAgent('test-agent', 'Tester');
    assert.equal(agent.name, 'test-agent');
    assert.equal(agent.role, 'Tester');
  });

  it('Scheduler queues and dequeues tasks', () => {
    const { Scheduler } = require('../runtime/control-plane/index');
    const s = new Scheduler(10);
    const id = s.enqueue({ priority: 'high', data: 'test' });
    assert.ok(id.startsWith('task-'));
    const task = s.dequeue();
    assert.equal(task.id, id);
    assert.equal(task.state, 'running');
  });

  it('CentralLogger starts and stops without error', () => {
    const { CentralLogger } = require('../runtime/index');
    const logger = new CentralLogger();
    logger.start();
    logger.log('test', { event: 'ping' });
    logger.stop();
  });
});

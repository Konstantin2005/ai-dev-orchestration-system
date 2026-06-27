const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const {
  MODEL_ROUTES,
  getModelForAgent,
  buildAgentPayload,
  validatePayload,
  resolveModelForAgent
} = require('../runtime/orchestration/model-router');

describe('orchestration/model-router.js', () => {
  const originalMode = process.env.AI_ORCHESTRATOR_MODE;

  before(() => { process.env.AI_ORCHESTRATOR_MODE = 'full'; });
  after(() => { process.env.AI_ORCHESTRATOR_MODE = originalMode; });

  describe('MODEL_ROUTES', () => {
    it('has routes for all agent types', () => {
      assert.ok(MODEL_ROUTES.backend);
      assert.ok(MODEL_ROUTES.frontend);
      assert.ok(MODEL_ROUTES.research);
      assert.ok(MODEL_ROUTES.architect);
      assert.ok(MODEL_ROUTES.qa);
      assert.ok(MODEL_ROUTES.reviewer);
    });

    it('backend uses anthropic/claude-sonnet', () => {
      assert.equal(MODEL_ROUTES.backend.provider, 'anthropic');
      assert.equal(MODEL_ROUTES.backend.model, 'claude-sonnet');
    });

    it('frontend uses google/gemini-2.5-pro', () => {
      assert.equal(MODEL_ROUTES.frontend.provider, 'google');
      assert.equal(MODEL_ROUTES.frontend.model, 'gemini-2.5-pro');
    });
  });

  describe('resolveModelForAgent', () => {
    it('respects full mode routing', () => {
      const route = resolveModelForAgent('backend');
      assert.equal(route.provider, 'anthropic');
      assert.equal(route.model, 'claude-sonnet');
    });

    it('returns default for unknown agent type', () => {
      const route = resolveModelForAgent('unknown-agent');
      assert.equal(route.provider, 'openai');
      assert.equal(route.model, 'gpt-4o-mini');
    });

    it('returns a copy not a reference', () => {
      const route1 = resolveModelForAgent('backend');
      const route2 = resolveModelForAgent('backend');
      route1.model = 'modified';
      assert.equal(route2.model, 'claude-sonnet');
    });
  });

  describe('getModelForAgent (mode-aware)', () => {
    it('returns openai-only by default', () => {
      delete process.env.AI_ORCHESTRATOR_MODE;
      const route = getModelForAgent('backend');
      assert.equal(route.provider, 'openai');
      assert.equal(route.model, 'gpt-4o-mini');
      process.env.AI_ORCHESTRATOR_MODE = 'full';
    });

    it('returns configured providers in full mode', () => {
      const route = getModelForAgent('frontend');
      assert.equal(route.provider, 'google');
      assert.equal(route.model, 'gemini-2.5-pro');
    });

    it('returns mock in mock mode', () => {
      process.env.AI_ORCHESTRATOR_MODE = 'mock';
      const route = getModelForAgent('backend');
      assert.equal(route.provider, 'mock');
      assert.equal(route.model, 'mock');
      process.env.AI_ORCHESTRATOR_MODE = 'full';
    });
  });

  describe('buildAgentPayload', () => {
    it('builds complete payload with all fields', () => {
      const payload = buildAgentPayload(
        'TASK-1',
        'https://github.com/owner/repo/issues/1',
        'target-repo',
        'feat/auth',
        'backend',
        'Implement JWT auth',
        { codebaseSummary: 'Express app', dependencies: ['express'], constraints: ['no breaking changes'] },
        { must_write_tests: true }
      );

      assert.equal(payload.task_id, 'TASK-1');
      assert.equal(payload.agent_type, 'backend');
      assert.equal(payload.objective, 'Implement JWT auth');
      assert.equal(payload.context.codebase_summary, 'Express app');
      assert.deepEqual(payload.context.dependencies, ['express']);
      assert.deepEqual(payload.context.constraints, ['no breaking changes']);
      assert.equal(payload.execution_rules.must_plan_before_code, true);
      assert.equal(payload.execution_rules.must_write_tests, true);
      assert.equal(payload.execution_rules.must_create_pr, true);
    });

    it('handles minimal context', () => {
      const payload = buildAgentPayload('T-1', '', 'repo', 'main', 'backend', 'do something', {}, {});
      assert.ok(payload.task_id);
      assert.deepEqual(payload.context.dependencies, []);
      assert.deepEqual(payload.context.constraints, []);
    });
  });

  describe('validatePayload', () => {
    it('passes valid payload', () => {
      const payload = {
        task_id: 'T-1',
        agent_type: 'backend',
        objective: 'build feature',
        repository: 'target-repo',
        branch: 'feat/x'
      };
      const result = validatePayload(payload);
      assert.equal(result.valid, true);
    });

    it('fails when required fields missing', () => {
      const result = validatePayload({});
      assert.equal(result.valid, false);
      assert.ok(result.errors.length >= 5);
    });

    it('reports specific missing fields', () => {
      const result = validatePayload({ task_id: 'T-1' });
      const errorMessages = result.errors.join(' ');
      assert.ok(errorMessages.includes('agent_type'));
      assert.ok(errorMessages.includes('objective'));
    });
  });
});

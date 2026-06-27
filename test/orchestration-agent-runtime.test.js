const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { __setMockOctokit } = require('../runtime/github/client');

function setupMock() {
  __setMockOctokit(() => ({
    rest: {
      issues: {
        create: async () => ({ data: { id: 1, number: 1, html_url: '' } }),
        createComment: async () => ({ data: { id: 1, html_url: '' } }),
        update: async () => ({ data: {} }),
        setLabels: async () => ({ data: [] }),
        addLabels: async () => ({ data: [] })
      }
    }
  }));
}

function resetMock() {
  __setMockOctokit(null);
}

describe('orchestration/agent-runtime.js', () => {
  let AgentRuntime;

  before(() => {
    AgentRuntime = require('../runtime/orchestration/agent-runtime').AgentRuntime;
  });

  describe('constructor', () => {
    it('initializes with empty state', () => {
      const rt = new AgentRuntime();
      assert.equal(rt.state.status, 'initialized');
      assert.deepEqual(rt.logs, []);
    });

    it('accepts owner and repo', () => {
      const rt = new AgentRuntime({ owner: 'test', repo: 'repo' });
      assert.equal(rt.owner, 'test');
      assert.equal(rt.repo, 'repo');
    });
  });

  describe('_initState', () => {
    it('initializes state from payload', () => {
      const rt = new AgentRuntime();
      rt._initState({
        task_id: 'TASK-1',
        issue_url: 'https://github.com/o/r/issues/42',
        agent_type: 'backend',
        repository: 'target-repo',
        branch: 'feat/auth',
        objective: 'Implement auth'
      });

      assert.equal(rt.state.taskId, 'TASK-1');
      assert.equal(rt.state.issueNumber, 42);
      assert.equal(rt.state.agentType, 'backend');
      assert.equal(rt.state.repository, 'target-repo');
      assert.equal(rt.state.branch, 'feat/auth');
      assert.equal(rt.state.objective, 'Implement auth');
      assert.equal(rt.state.status, 'running');
    });
  });

  describe('execution steps', () => {
    it('_stepAnalyze updates state and creates log', async () => {
      setupMock();
      const rt = new AgentRuntime();
      rt._initState({ task_id: 'T-1', issue_url: '', agent_type: 'test', repository: 'r', branch: 'b', objective: 'o' });

      const result = await rt._stepAnalyze({});
      assert.equal(result.step, 'analyze');
      assert.equal(result.status, 'completed');
      assert.ok(rt.logs.length > 0);
      resetMock();
    });

    it('_stepPlan creates log entry', async () => {
      setupMock();
      const rt = new AgentRuntime();
      rt._initState({ task_id: 'T-1', issue_url: '', agent_type: 'test', repository: 'r', branch: 'b', objective: 'o' });

      const result = await rt._stepPlan({});
      assert.equal(result.step, 'plan');
      assert.ok(rt.logs.length > 0);
      resetMock();
    });

    it('_stepReport completes pipeline', async () => {
      setupMock();
      const rt = new AgentRuntime();
      rt._initState({ task_id: 'T-1', issue_url: '', agent_type: 'test', repository: 'r', branch: 'b', objective: 'o' });

      const result = await rt._stepReport({});
      assert.equal(result.step, 'report');
      assert.equal(result.status, 'completed');
      resetMock();
    });
  });

  describe('execute', () => {
    it('runs full pipeline and returns result', async () => {
      setupMock();
      const rt = new AgentRuntime({ owner: 'o', repo: 'r' });

      const payload = {
        task_id: 'T-1',
        issue_url: '',
        agent_type: 'backend',
        repository: 'target-repo',
        branch: 'feat/x',
        objective: 'do something',
        context: {},
        execution_rules: {}
      };

      const result = await rt.execute(payload);
      assert.equal(result.status, 'completed');
      assert.ok(result.actions.length >= 7);
      assert.ok(rt.getLogs().length > 0);
      resetMock();
    });

    it('handles errors gracefully', async () => {
      setupMock();
      const rt = new AgentRuntime({ owner: 'o', repo: 'r' });

      const payload = {
        task_id: 'T-1',
        issue_url: '',
        agent_type: 'backend',
        repository: 'target-repo',
        branch: 'feat/x',
        objective: 'do something',
        context: {},
        execution_rules: {}
      };

      rt._stepAnalyze = async () => { throw new Error('simulated failure'); };

      const result = await rt.execute(payload);
      assert.equal(result.status, 'failed');
      assert.ok(result.error);
      resetMock();
    });
  });

  describe('getLogs / getState', () => {
    it('returns copies of internal state', () => {
      const rt = new AgentRuntime();
      rt._initState({ task_id: 'T-1', issue_url: '', agent_type: 'a', repository: 'r', branch: 'b', objective: 'o' });

      const state = rt.getState();
      assert.equal(state.taskId, 'T-1');

      const logs = rt.getLogs();
      assert.deepEqual(logs, []);
    });
  });
});

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  stateChannels,
  createInitialState,
  defaultIssue,
  defaultArchitecture,
  defaultValidation,
  defaultExecution,
  defaultLogs
} = require('../runtime/graph/state');

describe('state.js', () => {
  it('createInitialState with full issue', () => {
    const issue = { id: 9, title: 'Test', slug: 'test', body: 'Body' };
    const state = createInitialState(issue);
    assert.equal(state.issue.id, 9);
    assert.equal(state.issue.title, 'Test');
    assert.equal(state.issue.slug, 'test');
    assert.equal(state.issue.body, 'Body');
    assert.deepEqual(state.architecture, defaultArchitecture());
    assert.deepEqual(state.files, []);
    assert.deepEqual(state.logs, defaultLogs());
    assert.deepEqual(state.validation, defaultValidation());
    assert.deepEqual(state.execution, defaultExecution());
  });

  it('createInitialState with empty issue fills defaults', () => {
    const state = createInitialState({});
    assert.equal(state.issue.id, null);
    assert.equal(state.issue.title, '');
    assert.equal(state.issue.slug, '');
    assert.equal(state.issue.body, '');
  });

  it('createInitialState with null id', () => {
    const state = createInitialState({ title: 'No ID' });
    assert.equal(state.issue.id, null);
    assert.equal(state.issue.title, 'No ID');
  });

  it('defaultArchitecture returns correct structure', () => {
    const arch = defaultArchitecture();
    assert.equal(arch.summary, null);
    assert.equal(arch.flow, null);
    assert.deepEqual(arch.decisions, []);
    assert.equal(arch.status, 'pending');
  });

  it('defaultValidation returns correct structure', () => {
    const v = defaultValidation();
    assert.equal(v.status, 'pending');
    assert.deepEqual(v.errors, []);
  });

  it('defaultExecution returns correct structure', () => {
    const e = defaultExecution();
    assert.equal(e.status, 'idle');
    assert.equal(e.current_node, null);
    assert.equal(e.attempts, 0);
    assert.deepEqual(e.trace, []);
  });

  it('defaultLogs returns empty strings', () => {
    const logs = defaultLogs();
    for (const key of ['orchestrator', 'architect', 'backend', 'frontend', 'qa', 'reviewer']) {
      assert.equal(logs[key], '');
    }
  });

  it('stateChannels have correct reducers', () => {
    const channel = stateChannels.issue;
    const result = channel.value({ id: 1 }, { id: 2 });
    assert.equal(result.id, 2);

    const noUpdate = channel.value({ id: 1 }, undefined);
    assert.equal(noUpdate.id, 1);
  });

  it('stateChannels provide default values', () => {
    const issueChannel = stateChannels.issue;
    const archChannel = stateChannels.architecture;
    const filesChannel = stateChannels.files;
    const logsChannel = stateChannels.logs;
    const validationChannel = stateChannels.validation;
    const executionChannel = stateChannels.execution;

    assert.deepEqual(issueChannel.default(), defaultIssue());
    assert.deepEqual(archChannel.default(), defaultArchitecture());
    assert.deepEqual(filesChannel.default(), []);
    assert.deepEqual(logsChannel.default(), defaultLogs());
    assert.deepEqual(validationChannel.default(), defaultValidation());
    assert.deepEqual(executionChannel.default(), defaultExecution());
  });
});

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { formatOutput } = require('../runtime/graph/index');

describe('index.js formatOutput', () => {
  it('returns _output when present', () => {
    const state = { _output: { status: 'READY_FOR_PR', files: [], logs: {}, architecture: {} } };
    const result = formatOutput(state);
    assert.equal(result.status, 'READY_FOR_PR');
  });

  it('generates READY_FOR_PR when execution completed and log contains READY_FOR_PR', () => {
    const state = {
      architecture: { summary: 'Test', flow: 'linear', decisions: ['dec1'] },
      files: [{ path: 'test.md', content: 'hello' }],
      logs: { orchestrator: '', architect: '', backend: '', frontend: '', qa: '', reviewer: 'READY_FOR_PR' },
      validation: { status: 'valid', errors: [] },
      execution: { status: 'completed', current_node: 'reviewer', attempts: 0, trace: [] }
    };
    const result = formatOutput(state);
    assert.equal(result.status, 'READY_FOR_PR');
    assert.equal(result.architecture.summary, 'Test');
    assert.equal(result.files.length, 1);
  });

  it('generates CHANGES_REQUESTED when reviewer log does not indicate ready', () => {
    const state = {
      architecture: { summary: null, flow: null, decisions: [] },
      files: [],
      logs: { orchestrator: '', architect: '', backend: '', frontend: '', qa: '', reviewer: 'Need changes' },
      validation: { status: 'pending', errors: [] },
      execution: { status: 'running', current_node: 'reviewer', attempts: 0, trace: [] }
    };
    const result = formatOutput(state);
    assert.equal(result.status, 'CHANGES_REQUESTED');
  });

  it('handles empty state gracefully', () => {
    const state = {
      architecture: undefined,
      files: undefined,
      logs: {},
      validation: undefined,
      execution: {}
    };
    const result = formatOutput(state);
    assert.equal(result.status, 'CHANGES_REQUESTED');
    assert.deepEqual(result.architecture.decisions, []);
    assert.deepEqual(result.files, []);
  });

  it('includes all required keys in output', () => {
    const state = {
      architecture: { summary: 's', flow: 'f', decisions: ['d'] },
      files: [{ path: 'a.md', content: 'b' }],
      logs: { orchestrator: 'o', architect: 'a', backend: 'b', frontend: 'f', qa: 'q', reviewer: 'r READY_FOR_PR' },
      validation: { status: 'valid' },
      execution: { status: 'completed' }
    };
    const result = formatOutput(state);
    assert.ok(result.architecture);
    assert.ok(result.files);
    assert.ok(result.logs);
    assert.ok(result.status);
    assert.ok('orchestrator' in result.logs);
    assert.ok('architect' in result.logs);
    assert.ok('backend' in result.logs);
    assert.ok('frontend' in result.logs);
    assert.ok('qa' in result.logs);
    assert.ok('reviewer' in result.logs);
  });
});

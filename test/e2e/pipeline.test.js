const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');

const { createInitialState } = require('../../runtime/graph/state');
const { formatOutput } = require('../../runtime/graph/index');
const { validateOutput } = require('../../runtime/graph/nodes/validation');
const { writeFiles } = require('../../runtime/graph/writers/file-writer');

function createMockState(overrides) {
  const state = {
    architecture: { summary: 'Test API', flow: 'CRUD', decisions: ['Use REST'], status: 'done' },
    files: [
      { path: '01-backend-engineer/api.js', content: '// API test' },
      { path: '02-frontend-engineer/App.js', content: '// App test' },
      { path: '03-qa-engineer/test.js', content: '// Test' }
    ],
    logs: {
      orchestrator: 'Started',
      architect: 'Planned',
      backend: 'Done',
      frontend: 'Done',
      qa: 'Passed',
      reviewer: 'READY_FOR_PR'
    },
    status: 'READY_FOR_PR',
    execution: { status: 'completed', current_node: 'reviewer', attempts: 0, trace: [] },
    validation: { status: 'valid', errors: [] },
    _output: { status: 'READY_FOR_PR', architecture: {}, files: [], logs: {} },
    ...overrides
  };
  return state;
}

describe('E2E: Pipeline Integration', () => {
  let tmpDir;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ai-e2e-'));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    mkdirSync(join(tmpDir, 'tests'), { recursive: true });
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('C4: Input Sanitization', () => {
    it('truncates long body to 10KB', () => {
      const longBody = 'x'.repeat(20000);
      const state = createInitialState({ id: 1, title: 'Test', body: longBody });
      assert.ok(state.issue.body.length <= 10240);
      assert.equal(state.issue.body.length, 10240);
    });

    it('truncates long title to 200 chars', () => {
      const longTitle = 'x'.repeat(500);
      const state = createInitialState({ id: 1, title: longTitle });
      assert.ok(state.issue.title.length <= 200);
      assert.equal(state.issue.title.length, 200);
    });

    it('removes control characters from input', () => {
      const dirtyBody = 'hello\x00world\x1Ftest\nnormal';
      const state = createInitialState({ id: 1, title: 'Test', body: dirtyBody });
      assert.ok(!state.issue.body.includes('\x00'));
      assert.ok(!state.issue.body.includes('\x1F'));
      assert.ok(state.issue.body.includes('\n'));
      assert.ok(state.issue.body.includes('normal'));
    });

    it('handles null/undefined issue gracefully', () => {
      const state = createInitialState(null);
      assert.equal(state.issue.id, null);
      assert.equal(state.issue.title, '');
      assert.equal(state.issue.body, '');
    });

    it('handles missing fields', () => {
      const state = createInitialState({});
      assert.equal(state.issue.id, null);
      assert.equal(state.issue.title, '');
      assert.equal(state.issue.body, '');
    });
  });

  describe('C2: Validation Node', () => {
    it('passes valid output', () => {
      const state = createMockState();
      const result = validateOutput(state);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it('rejects missing architecture', () => {
      const state = createMockState({ architecture: undefined });
      const result = validateOutput(state);
      assert.equal(result.valid, false);
    });

    it('rejects empty files', () => {
      const state = createMockState({ files: [] });
      const result = validateOutput(state);
      assert.equal(result.valid, false);
    });

    it('rejects forbidden path patterns', () => {
      const state = createMockState({
        files: [{ path: '../escape.md', content: 'x' }]
      });
      const result = validateOutput(state);
      assert.equal(result.valid, false);
    });

    it('rejects bad file extensions', () => {
      const state = createMockState({
        files: [{ path: '01-backend-engineer/virus.exe', content: 'x' }]
      });
      const result = validateOutput(state);
      assert.equal(result.valid, false);
    });

    it('rejects invalid status', () => {
      const state = createMockState({ status: 'INVALID' });
      const result = validateOutput(state);
      assert.equal(result.valid, false);
    });

    it('rejects content over limit', () => {
      const state = createMockState({
        files: [{ path: '01-backend-engineer/big.js', content: 'x'.repeat(50001) }]
      });
      const result = validateOutput(state);
      assert.equal(result.valid, false);
    });

    it('rejects missing log keys', () => {
      const state = createMockState({
        logs: {}
      });
      const result = validateOutput(state);
      assert.equal(result.valid, false);
    });

    it('accepts CHANGES_REQUESTED as valid status', () => {
      const state = createMockState({
        status: 'CHANGES_REQUESTED',
        _output: { status: 'CHANGES_REQUESTED' }
      });
      const result = validateOutput(state);
      assert.equal(result.valid, true);
    });
  });

  describe('C1: File Writer', () => {
    it('writes files to disk', async () => {
      const files = [
        { path: '01-backend-engineer/api.js', content: 'module.exports = {};' },
        { path: '02-frontend-engineer/App.js', content: 'export default {};' }
      ];
      const state = createMockState({ files });
      const result = await writeFiles(state, tmpDir);
      assert.equal(result.written.length, 2);
      assert.equal(result.errors.length, 0);
      assert.ok(existsSync(join(tmpDir, 'api.js')));
      assert.ok(existsSync(join(tmpDir, 'App.js')));
    });

    it('writes qa files to tests/ by default', async () => {
      const files = [
        { path: '03-qa-engineer/test.js', content: '// test' }
      ];
      const state = createMockState({ files });
      const result = await writeFiles(state, tmpDir);
      assert.equal(result.written.length, 1);
      const written = readFileSync(result.written[0].resolved, 'utf-8');
      assert.equal(written, '// test');
    });

    it('rejects writing to .ai-system/', async () => {
      const files = [
        { path: '01-backend-engineer/hack.js', content: '// bad' }
      ];
      const aiSystemDir = resolve(__dirname, '..', '..', 'runtime', 'graph', 'writers', '..', '..', '..');
      const state = createMockState({ files });
      const result = await writeFiles(state, aiSystemDir);
      assert.equal(result.errors.length, 1);
    });

    it('handles empty files array', async () => {
      const state = createMockState({ files: [] });
      const result = await writeFiles(state, tmpDir);
      assert.equal(result.written.length, 0);
      assert.equal(result.errors.length, 1);
    });
  });

  describe('Full Pipeline Flow', () => {
    it('simulates issue → state → validation → write', async () => {
      const issue = { id: 999, title: 'E2E Test', body: 'Full pipeline validation' };
      const initialState = createInitialState(issue);

      assert.equal(initialState.issue.id, 999);
      assert.equal(initialState.issue.title, 'E2E Test');
      assert.equal(initialState.issue.body, 'Full pipeline validation');

      const mockFiles = [
        { path: '01-backend-engineer/api.js', content: '// API' },
        { path: '02-frontend-engineer/ui.js', content: '// UI' },
        { path: '03-qa-engineer/test.js', content: '// Tests' }
      ];

      const finalState = {
        ...initialState,
        architecture: { summary: 'Test', flow: 'linear', decisions: ['REST'], status: 'done' },
        files: mockFiles,
        logs: { orchestrator: 'OK', architect: 'OK', backend: 'OK', frontend: 'OK', qa: 'OK', reviewer: 'READY_FOR_PR' },
        status: 'READY_FOR_PR',
        _output: { status: 'READY_FOR_PR', architecture: {}, files: mockFiles, logs: {} }
      };

      const validationResult = validateOutput(finalState);
      assert.equal(validationResult.valid, true);

      const writeResult = await writeFiles(finalState, tmpDir);
      assert.equal(writeResult.written.length, 3);
      assert.equal(writeResult.errors.length, 0);

      const output = formatOutput(finalState);
      assert.equal(output.status, 'READY_FOR_PR');
      assert.equal(output.files.length, 3);
    });

    it('stops on invalid state', () => {
      const badState = createMockState({ files: [], status: 'INVALID' });
      const result = validateOutput(badState);
      assert.equal(result.valid, false);
    });
  });
});

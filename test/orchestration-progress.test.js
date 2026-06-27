const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildProgressBody,
  updateProgress
} = require('../runtime/orchestration/progress');

describe('orchestration/progress.js', () => {

  describe('buildProgressBody', () => {
    it('builds complete progress body', () => {
      const body = buildProgressBody(
        ['Analyzed codebase', 'Created plan'],
        ['Implementing auth'],
        ['Waiting for API key'],
        ['Create PR', 'Report results'],
        { agentId: 'backend-1', taskId: 'TASK-5', duration: '30m', repository: 'target-repo', branch: 'feat/auth' }
      );
      assert.ok(body.includes('/progress'));
      assert.ok(body.includes('Analyzed codebase'));
      assert.ok(body.includes('Implementing auth'));
      assert.ok(body.includes('Waiting for API key'));
      assert.ok(body.includes('Create PR'));
      assert.ok(body.includes('backend-1'));
      assert.ok(body.includes('TASK-5'));
      assert.ok(body.includes('target-repo'));
      assert.ok(body.includes('feat/auth'));
    });

    it('shows _None_ for empty lists', () => {
      const body = buildProgressBody([], [], ['Blocking issue'], []);
      assert.ok(body.includes('_None_'));
      assert.ok(body.includes('Blocking issue'));
    });

    it('handles all empty lists', () => {
      const body = buildProgressBody([], [], [], []);
      const noneCount = (body.match(/_None_/g) || []).length;
      assert.equal(noneCount, 4);
    });

    it('excludes metadata section when not provided', () => {
      const body = buildProgressBody(['done'], [], [], []);
      assert.ok(!body.includes('**Agent:**'));
    });

    it('includes partial metadata', () => {
      const body = buildProgressBody([], [], [], [], { agentId: 'a1' });
      assert.ok(body.includes('a1'));
      assert.ok(!body.includes('TASK'));
    });
  });

  describe('updateProgress', () => {
    it('merges completed items without duplicates', () => {
      const existing = { completed: ['Step 1'], working: [], blocked: [], next: ['Step 3'] };
      const updated = updateProgress(existing, ['Step 1', 'Step 2'], ['Step 3'], [], ['Step 4']);
      assert.deepEqual(updated.completed, ['Step 1', 'Step 2']);
      assert.deepEqual(updated.working, ['Step 3']);
      assert.deepEqual(updated.next, ['Step 4']);
    });

    it('replaces working and blocked lists when explicitly provided', () => {
      const existing = { completed: ['A'], working: ['B'], blocked: ['C'], next: ['D'] };
      const updated = updateProgress(existing, ['A'], ['X', 'Y'], ['Z'], undefined);
      assert.deepEqual(updated.working, ['X', 'Y']);
      assert.deepEqual(updated.blocked, ['Z']);
      assert.deepEqual(updated.next, ['D']);
    });

    it('clears next when empty array is provided', () => {
      const existing = { completed: ['A'], working: ['B'], blocked: ['C'], next: ['D'] };
      const updated = updateProgress(existing, undefined, undefined, undefined, []);
      assert.deepEqual(updated.next, []);
    });

    it('preserves existing completed when no new ones', () => {
      const existing = { completed: ['Old'], working: [], blocked: [], next: [] };
      const updated = updateProgress(existing, undefined, undefined, undefined, undefined);
      assert.deepEqual(updated.completed, ['Old']);
    });

    it('handles empty existing progress', () => {
      const existing = { completed: [], working: [], blocked: [], next: [] };
      const updated = updateProgress(existing, ['New'], undefined, undefined, undefined);
      assert.deepEqual(updated.completed, ['New']);
    });
  });
});

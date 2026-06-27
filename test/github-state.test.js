const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  LABEL_PREFIX,
  STATUS,
  STEPS,
  PIPELINE_STEPS,
  makeLabel,
  parseLabel,
  extractStateFromLabels,
  labelsForStep,
  buildContextFromIssue,
  buildChildIssueTitle,
  buildChildIssueBody,
  isStepDone,
  isStepFailed,
  allStepsDone,
  getCurrentStep
} = require('../runtime/github/state');

describe('state.js — GitHub pipeline state', () => {

  describe('makeLabel / parseLabel', () => {
    it('makeLabel creates correct label string', () => {
      assert.equal(makeLabel('architect', 'done'), 'status:architect:done');
      assert.equal(makeLabel('backend', 'pending'), 'status:backend:pending');
    });

    it('parseLabel parses valid label', () => {
      const result = parseLabel('status:architect:done');
      assert.deepEqual(result, { step: 'architect', status: 'done' });
    });

    it('parseLabel returns null for non-status label', () => {
      assert.equal(parseLabel('bug'), null);
      assert.equal(parseLabel('enhancement'), null);
    });

    it('parseLabel returns null for malformed label', () => {
      assert.equal(parseLabel('status:'), null);
      assert.equal(parseLabel('status:abc'), null);
    });

    it('parseLabel returns null for non-string input', () => {
      assert.equal(parseLabel(null), null);
      assert.equal(parseLabel(undefined), null);
      assert.equal(parseLabel(123), null);
    });
  });

  describe('extractStateFromLabels', () => {
    it('returns PENDING for all steps when no status labels exist', () => {
      const state = extractStateFromLabels(['bug', 'enhancement']);
      for (const step of PIPELINE_STEPS) {
        assert.equal(state[step], STATUS.PENDING);
      }
    });

    it('extracts correct status from labels', () => {
      const labels = [
        'status:architect:done',
        'status:backend:in-progress',
        'bug'
      ];
      const state = extractStateFromLabels(labels);
      assert.equal(state.architect, 'done');
      assert.equal(state.backend, 'in-progress');
      assert.equal(state.frontend, STATUS.PENDING);
      assert.equal(state.qa, STATUS.PENDING);
      assert.equal(state.reviewer, STATUS.PENDING);
    });

    it('handles label objects with .name property', () => {
      const labels = [
        { name: 'status:architect:done', color: 'green' },
        { name: 'bug', color: 'red' }
      ];
      const state = extractStateFromLabels(labels);
      assert.equal(state.architect, 'done');
      assert.equal(state.backend, STATUS.PENDING);
    });

    it('handles mixed string and object labels', () => {
      const labels = [
        { name: 'status:architect:done' },
        'status:backend:failed'
      ];
      const state = extractStateFromLabels(labels);
      assert.equal(state.architect, 'done');
      assert.equal(state.backend, 'failed');
    });
  });

  describe('labelsForStep', () => {
    it('returns array with single label', () => {
      const result = labelsForStep('architect', 'done');
      assert.deepEqual(result, ['status:architect:done']);
    });
  });

  describe('buildContextFromIssue', () => {
    it('builds context object from GitHub issue', () => {
      const issue = {
        number: 42,
        title: 'Test issue',
        body: 'Issue body',
        labels: [{ name: 'status:architect:done' }],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        html_url: 'https://github.com/owner/repo/issues/42',
        user: { login: 'testuser' }
      };

      const ctx = buildContextFromIssue(issue);
      assert.equal(ctx.issueId, 42);
      assert.equal(ctx.title, 'Test issue');
      assert.equal(ctx.body, 'Issue body');
      assert.equal(ctx.state.architect, 'done');
      assert.equal(ctx.htmlUrl, 'https://github.com/owner/repo/issues/42');
      assert.equal(ctx.user, 'testuser');
    });

    it('handles issue without user', () => {
      const issue = { number: 1, title: 't', body: '', labels: [] };
      const ctx = buildContextFromIssue(issue);
      assert.equal(ctx.user, null);
    });

    it('handles issue without labels', () => {
      const issue = { number: 1, title: 't', body: '', labels: [] };
      const ctx = buildContextFromIssue(issue);
      assert.deepEqual(ctx.state.architect, STATUS.PENDING);
    });
  });

  describe('buildChildIssueTitle', () => {
    it('builds correct title for architect step', () => {
      const title = buildChildIssueTitle('architect', 'Add login', 1);
      assert.equal(title, '[ARCH] Add login (for #1)');
    });

    it('builds correct title for backend step', () => {
      const title = buildChildIssueTitle('backend', 'Add login', 1);
      assert.equal(title, '[BE] Add login (for #1)');
    });

    it('builds correct title for qa step', () => {
      const title = buildChildIssueTitle('qa', 'Add login', 1);
      assert.equal(title, '[QA] Add login (for #1)');
    });
  });

  describe('buildChildIssueBody', () => {
    it('builds body with parent issue info', () => {
      const parent = { number: 1, title: 'Add login', body: 'Need login page' };
      const body = buildChildIssueBody('backend', parent, null);
      assert.ok(body.includes('#1'));
      assert.ok(body.includes('Add login'));
      assert.ok(body.includes('Need login page'));
      assert.ok(body.includes('Backend Task'));
    });

    it('includes architecture context when provided', () => {
      const parent = { number: 1, title: 'Add login', body: '' };
      const context = {
        architecture: {
          summary: 'Simple auth system',
          flow: 'Login -> Token -> Access',
          decisions: ['Use JWT', 'Store in DB']
        }
      };
      const body = buildChildIssueBody('backend', parent, context);
      assert.ok(body.includes('Simple auth system'));
      assert.ok(body.includes('Login -> Token -> Access'));
      assert.ok(body.includes('Use JWT'));
      assert.ok(body.includes('Store in DB'));
    });
  });

  describe('isStepDone / isStepFailed', () => {
    it('isStepDone returns true for done status', () => {
      assert.equal(isStepDone({ architect: 'done' }, 'architect'), true);
    });

    it('isStepDone returns false for non-done status', () => {
      assert.equal(isStepDone({ architect: 'pending' }, 'architect'), false);
      assert.equal(isStepDone({ architect: 'failed' }, 'architect'), false);
    });

    it('isStepFailed returns true for failed status', () => {
      assert.equal(isStepFailed({ backend: 'failed' }, 'backend'), true);
    });
  });

  describe('allStepsDone', () => {
    it('returns true when all pipeline steps are done', () => {
      const state = {};
      for (const step of PIPELINE_STEPS) {
        state[step] = 'done';
      }
      assert.equal(allStepsDone(state), true);
    });

    it('returns false when any step is not done', () => {
      const state = {};
      for (const step of PIPELINE_STEPS) {
        state[step] = step === 'architect' ? 'done' : 'pending';
      }
      assert.equal(allStepsDone(state), false);
    });

    it('respects custom step list', () => {
      const state = { backend: 'done', frontend: 'done' };
      assert.equal(allStepsDone(state, ['backend', 'frontend']), true);
    });
  });

  describe('getCurrentStep', () => {
    it('returns first pending step', () => {
      const state = {
        architect: 'done',
        backend: 'in-progress',
        frontend: 'pending',
        qa: 'pending',
        reviewer: 'pending'
      };
      assert.equal(getCurrentStep(state), 'backend');
    });

    it('returns null when all steps done', () => {
      const state = {};
      for (const step of PIPELINE_STEPS) {
        state[step] = 'done';
      }
      assert.equal(getCurrentStep(state), null);
    });
  });
});

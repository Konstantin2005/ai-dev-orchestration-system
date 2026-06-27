const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  TASK_LABEL_PREFIX,
  TASK_STATUS,
  TASK_TYPE_LABELS,
  makeTaskLabel,
  parseTaskLabel,
  extractTaskStatus,
  buildTaskBody
} = require('../runtime/orchestration/task');

describe('orchestration/task.js', () => {

  describe('makeTaskLabel / parseTaskLabel', () => {
    it('makeTaskLabel creates correct label', () => {
      assert.equal(makeTaskLabel('created'), 'task:created');
      assert.equal(makeTaskLabel('completed'), 'task:completed');
    });

    it('parseTaskLabel parses valid label', () => {
      assert.equal(parseTaskLabel('task:assigned'), 'assigned');
      assert.equal(parseTaskLabel('task:pr-created'), 'pr-created');
    });

    it('parseTaskLabel returns null for non-task label', () => {
      assert.equal(parseTaskLabel('bug'), null);
      assert.equal(parseTaskLabel('status:architect:done'), null);
    });

    it('parseTaskLabel handles non-string input', () => {
      assert.equal(parseTaskLabel(null), null);
      assert.equal(parseTaskLabel(undefined), null);
    });
  });

  describe('extractTaskStatus', () => {
    it('extracts status from string labels', () => {
      const labels = ['bug', 'task:implementing'];
      assert.equal(extractTaskStatus(labels), 'implementing');
    });

    it('extracts status from object labels', () => {
      const labels = [{ name: 'task:analyzing' }, { name: 'enhancement' }];
      assert.equal(extractTaskStatus(labels), 'analyzing');
    });

    it('returns CREATED when no task label found', () => {
      assert.equal(extractTaskStatus(['bug', 'feature']), 'created');
      assert.equal(extractTaskStatus([]), 'created');
    });
  });

  describe('TASK_STATUS', () => {
    it('includes all lifecycle statuses', () => {
      const expectedStatuses = [
        'created', 'assigned', 'analyzing', 'planning',
        'implementing', 'testing', 'reviewing', 'pr-created',
        'completed', 'failed', 'blocked'
      ];
      const values = Object.values(TASK_STATUS);
      for (const s of expectedStatuses) {
        assert.ok(values.includes(s), `TASK_STATUS should include '${s}'`);
      }
      assert.equal(values.length, expectedStatuses.length);
    });
  });

  describe('TASK_TYPE_LABELS', () => {
    it('maps type constants to labels', () => {
      assert.equal(TASK_TYPE_LABELS.FEATURE, 'type:feature');
      assert.equal(TASK_TYPE_LABELS.BUG, 'type:bug');
      assert.equal(TASK_TYPE_LABELS.RESEARCH, 'type:research');
    });
  });

  describe('buildTaskBody', () => {
    it('includes parent issue info', () => {
      const parent = { number: 5, title: 'Add auth' };
      const body = buildTaskBody(parent, 'https://github.com/owner/target-repo.git', 'feature');
      assert.ok(body.includes('#5'));
      assert.ok(body.includes('Add auth'));
      assert.ok(body.includes('target-repo'));
      assert.ok(body.includes('### Lifecycle'));
    });

    it('handles missing body in parent', () => {
      const parent = { number: 1, title: 'Test' };
      const body = buildTaskBody(parent, 'https://github.com/owner/repo.git');
      assert.ok(body.includes('No description provided'));
    });
  });
});

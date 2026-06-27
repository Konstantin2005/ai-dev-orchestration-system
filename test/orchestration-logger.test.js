const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  LOG_FIELDS,
  makeLogEntry,
  formatLogEntry,
  formatLogEntryCompact,
  validateLogEntry,
  logsToReport
} = require('../runtime/orchestration/logger');

describe('orchestration/logger.js', () => {

  describe('makeLogEntry', () => {
    it('creates entry with all required fields', () => {
      const entry = makeLogEntry({
        agentId: 'architect-1',
        taskId: 'TASK-1',
        action: 'Generate plan',
        result: 'Success'
      });
      assert.ok(entry.timestamp);
      assert.equal(entry.agentId, 'architect-1');
      assert.equal(entry.taskId, 'TASK-1');
      assert.equal(entry.action, 'Generate plan');
      assert.equal(entry.result, 'Success');
      assert.equal(entry.duration, null);
      assert.equal(entry.nextStep, null);
    });

    it('uses provided timestamp', () => {
      const ts = '2026-06-27T12:00:00Z';
      const entry = makeLogEntry({ timestamp: ts, agentId: 'a', taskId: 't', action: 'x' });
      assert.equal(entry.timestamp, ts);
    });

    it('fills optional fields', () => {
      const entry = makeLogEntry({
        agentId: 'agent-1', taskId: 'T-1', action: 'test',
        parentTask: 'PARENT-1', repository: 'target-repo',
        branch: 'feat/test', duration: '5m', nextStep: 'Create PR'
      });
      assert.equal(entry.parentTask, 'PARENT-1');
      assert.equal(entry.repository, 'target-repo');
      assert.equal(entry.branch, 'feat/test');
      assert.equal(entry.duration, '5m');
      assert.equal(entry.nextStep, 'Create PR');
    });

    it('defaults unknown agentId', () => {
      const entry = makeLogEntry({ taskId: 'T', action: 'x' });
      assert.equal(entry.agentId, 'unknown');
    });
  });

  describe('formatLogEntry', () => {
    it('formats entry as readable text', () => {
      const entry = {
        timestamp: '2026-06-27T12:00:00Z',
        agentId: 'backend-1',
        taskId: 'TASK-5',
        repository: 'target',
        branch: 'feat/api',
        action: 'Implement JWT middleware',
        result: 'Success',
        duration: '14m',
        nextStep: 'Add integration tests'
      };
      const formatted = formatLogEntry(entry);
      assert.ok(formatted.includes('2026-06-27T12:00:00Z'));
      assert.ok(formatted.includes('backend-1'));
      assert.ok(formatted.includes('TASK-5'));
      assert.ok(formatted.includes('Implement JWT middleware'));
      assert.ok(formatted.includes('14m'));
    });

    it('handles missing optional fields', () => {
      const entry = { timestamp: 'T', agentId: 'a', taskId: 't', action: 'x', result: 'ok' };
      const formatted = formatLogEntry(entry);
      assert.ok(formatted.includes('a'));
      assert.ok(formatted.includes('t'));
    });
  });

  describe('formatLogEntryCompact', () => {
    it('formats single-line compact entry', () => {
      const entry = {
        timestamp: 'T1', agentId: 'a1', taskId: 'T-1',
        repository: 'repo', branch: 'main',
        action: 'build', result: 'ok'
      };
      const line = formatLogEntryCompact(entry);
      assert.ok(line.includes('T1'));
      assert.ok(line.includes('a1'));
      assert.ok(line.includes('T-1'));
      assert.ok(line.includes('repo/main'));
      assert.ok(line.includes('build → ok'));
    });
  });

  describe('validateLogEntry', () => {
    it('passes valid entry', () => {
      const entry = { agentId: 'a', taskId: 't', action: 'build' };
      const result = validateLogEntry(entry);
      assert.equal(result.valid, true);
    });

    it('fails when action is missing', () => {
      const entry = { agentId: 'a', taskId: 't' };
      const result = validateLogEntry(entry);
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it('fails when agentId is missing', () => {
      const entry = { taskId: 't', action: 'x' };
      const result = validateLogEntry(entry);
      assert.equal(result.valid, false);
    });

    it('fails when taskId is missing', () => {
      const entry = { agentId: 'a', action: 'x' };
      const result = validateLogEntry(entry);
      assert.equal(result.valid, false);
    });
  });

  describe('logsToReport', () => {
    it('joins compact entries with newlines', () => {
      const entries = [
        { timestamp: 'T1', agentId: 'a1', taskId: 'T1', action: 'build', result: 'ok' },
        { timestamp: 'T2', agentId: 'a2', taskId: 'T2', action: 'test', result: 'fail' }
      ];
      const report = logsToReport(entries);
      assert.ok(report.includes('T1'));
      assert.ok(report.includes('T2'));
      assert.ok(report.includes('\n'));
    });
  });

  describe('LOG_FIELDS', () => {
    it('contains all required fields', () => {
      assert.ok(LOG_FIELDS.includes('timestamp'));
      assert.ok(LOG_FIELDS.includes('agentId'));
      assert.ok(LOG_FIELDS.includes('taskId'));
      assert.ok(LOG_FIELDS.includes('action'));
      assert.ok(LOG_FIELDS.includes('result'));
      assert.ok(LOG_FIELDS.includes('repository'));
      assert.ok(LOG_FIELDS.includes('branch'));
      assert.ok(LOG_FIELDS.includes('duration'));
      assert.ok(LOG_FIELDS.includes('nextStep'));
    });
  });
});

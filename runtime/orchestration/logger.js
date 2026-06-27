const { createComment } = require('../github/client');

const LOG_FIELDS = ['timestamp', 'agentId', 'taskId', 'parentTask', 'repository', 'branch', 'action', 'result', 'duration', 'nextStep'];

function makeLogEntry(fields) {
  const entry = {
    timestamp: fields.timestamp || new Date().toISOString(),
    agentId: fields.agentId || 'unknown',
    taskId: fields.taskId || null,
    parentTask: fields.parentTask || null,
    repository: fields.repository || null,
    branch: fields.branch || null,
    action: fields.action || null,
    result: fields.result || null,
    duration: fields.duration || null,
    nextStep: fields.nextStep || null
  };
  return entry;
}

function formatLogEntry(entry) {
  const lines = [
    `[${entry.timestamp}]`,
    `Agent: ${entry.agentId}`,
    `Task: ${entry.taskId || '—'}`,
    `Repository: ${entry.repository || '—'}`,
    `Branch: ${entry.branch || '—'}`,
    `Action: ${entry.action || '—'}`,
    `Result: ${entry.result || '—'}`
  ];
  if (entry.duration) lines.push(`Duration: ${entry.duration}`);
  if (entry.nextStep) lines.push(`Next: ${entry.nextStep}`);
  if (entry.parentTask) lines.push(`Parent: ${entry.parentTask}`);
  return lines.join('\n');
}

function formatLogEntryCompact(entry) {
  const ts = entry.timestamp || '';
  const agent = entry.agentId || '?';
  const task = entry.taskId || '?';
  const repo = entry.repository || '?';
  const branch = entry.branch || '?';
  const action = entry.action || '?';
  const result = entry.result || '?';
  const duration = entry.duration ? ` (${entry.duration})` : '';
  return `[${ts}] ${agent} | ${task} | ${repo}/${branch} | ${action} → ${result}${duration}`;
}

function validateLogEntry(entry) {
  const errors = [];
  if (!entry.action) errors.push('action is required');
  if (!entry.agentId) errors.push('agentId is required');
  if (!entry.taskId) errors.push('taskId is required');
  return { valid: errors.length === 0, errors };
}

async function postLogEntry(owner, repo, issueNumber, entry, options = {}) {
  const body = [
    '## Log Entry',
    '',
    '```',
    formatLogEntry(entry),
    '```'
  ].join('\n');
  return createComment(owner, repo, issueNumber, body, options);
}

async function postLogBatch(owner, repo, issueNumber, entries, options = {}) {
  const body = [
    '## Log Batch',
    '',
    ...entries.map(e => `\`\`\`\n${formatLogEntry(e)}\n\`\`\``),
    ''
  ].join('\n');
  return createComment(owner, repo, issueNumber, body, options);
}

function logsToReport(entries) {
  return entries.map(e => formatLogEntryCompact(e)).join('\n');
}

module.exports = {
  LOG_FIELDS,
  makeLogEntry,
  formatLogEntry,
  formatLogEntryCompact,
  validateLogEntry,
  postLogEntry,
  postLogBatch,
  logsToReport
};

const { createIssue, createComment, closeIssue, addIssueLabels, updateIssueLabels } = require('../github/client');
const { makeLabel, extractStateFromLabels, STATUS, STEPS, PIPELINE_STEPS } = require('../github/state');

const TASK_LABEL_PREFIX = 'task:';

const TASK_STATUS = {
  CREATED: 'created',
  ASSIGNED: 'assigned',
  ANALYZING: 'analyzing',
  PLANNING: 'planning',
  IMPLEMENTING: 'implementing',
  TESTING: 'testing',
  REVIEWING: 'reviewing',
  PR_CREATED: 'pr-created',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

function makeTaskLabel(status) {
  return `${TASK_LABEL_PREFIX}${status}`;
}

function parseTaskLabel(label) {
  if (typeof label !== 'string') return null;
  if (!label.startsWith(TASK_LABEL_PREFIX)) return null;
  return label.slice(TASK_LABEL_PREFIX.length);
}

function extractTaskStatus(labels) {
  const labelNames = labels.map(l => typeof l === 'string' ? l : l.name);
  for (const label of labelNames) {
    const status = parseTaskLabel(label);
    if (status) return status;
  }
  return TASK_STATUS.CREATED;
}

const TASK_TYPE_LABELS = {
  FEATURE: 'type:feature',
  BUG: 'type:bug',
  REFACTOR: 'type:refactor',
  RESEARCH: 'type:research',
  TESTING: 'type:testing',
  MIGRATION: 'type:migration'
};

async function createTask(owner, repo, title, body, taskType, options = {}) {
  const labels = [makeTaskLabel(TASK_STATUS.CREATED)];
  if (taskType && TASK_TYPE_LABELS[taskType]) {
    labels.push(TASK_TYPE_LABELS[taskType]);
  }
  return createIssue(owner, repo, title, body, labels, options);
}

async function transitionTask(owner, repo, issueNumber, newStatus, commentBody, options = {}) {
  const labels = [makeTaskLabel(newStatus)];
  await updateIssueLabels(owner, repo, issueNumber, labels, options);
  if (commentBody) {
    await createComment(owner, repo, issueNumber, commentBody, options);
  }
  return { issueNumber, status: newStatus };
}

async function assignAgentToTask(owner, repo, issueNumber, agentId, options = {}) {
  await addIssueLabels(owner, repo, issueNumber, [makeTaskLabel(TASK_STATUS.ASSIGNED)], options);
  const body = `## Agent Assigned\n\n**Agent:** \`${agentId}\`\n\nStarting work on this task.`;
  await createComment(owner, repo, issueNumber, body, options);
  return { issueNumber, agentId };
}

async function completeTask(owner, repo, issueNumber, resultComment, options = {}) {
  await updateIssueLabels(owner, repo, issueNumber, [makeTaskLabel(TASK_STATUS.COMPLETED)], options);
  if (resultComment) {
    await createComment(owner, repo, issueNumber, resultComment, options);
  }
  await closeIssue(owner, repo, issueNumber, options);
  return { issueNumber, status: TASK_STATUS.COMPLETED };
}

async function failTask(owner, repo, issueNumber, errorComment, options = {}) {
  await updateIssueLabels(owner, repo, issueNumber, [makeTaskLabel(TASK_STATUS.FAILED)], options);
  if (errorComment) {
    await createComment(owner, repo, issueNumber, errorComment, options);
  }
  return { issueNumber, status: TASK_STATUS.FAILED };
}

function buildTaskBody(parentIssue, targetRepoUrl, taskType) {
  const lines = [
    `## Task`,
    '',
    `**Parent:** #${parentIssue.number} — ${parentIssue.title}`,
    `**Repository:** ${targetRepoUrl}`,
    `**Type:** ${taskType || 'feature'}`,
    '',
    '---',
    '',
    '### Description',
    '',
    parentIssue.body || '_No description provided_',
    '',
    '---',
    '',
    '### Lifecycle',
    '',
    '- [ ] Analyze',
    '- [ ] Plan',
    '- [ ] Implement',
    '- [ ] Test',
    '- [ ] Create PR',
    '- [ ] Report',
    '- [ ] Close'
  ];
  return lines.join('\n');
}

module.exports = {
  TASK_LABEL_PREFIX,
  TASK_STATUS,
  TASK_TYPE_LABELS,
  makeTaskLabel,
  parseTaskLabel,
  extractTaskStatus,
  createTask,
  transitionTask,
  assignAgentToTask,
  completeTask,
  failTask,
  buildTaskBody
};

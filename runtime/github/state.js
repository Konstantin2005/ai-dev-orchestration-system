const LABEL_PREFIX = 'status:';

const STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

const STEPS = {
  ARCHITECT: 'architect',
  BACKEND: 'backend',
  FRONTEND: 'frontend',
  QA: 'qa',
  REVIEWER: 'reviewer'
};

const PIPELINE_STEPS = [
  STEPS.ARCHITECT,
  STEPS.BACKEND,
  STEPS.FRONTEND,
  STEPS.QA,
  STEPS.REVIEWER
];

function makeLabel(step, status) {
  return `${LABEL_PREFIX}${step}:${status}`;
}

function parseLabel(label) {
  if (typeof label !== 'string') return null;
  if (!label.startsWith(LABEL_PREFIX)) return null;
  const rest = label.slice(LABEL_PREFIX.length);
  const colonIdx = rest.indexOf(':');
  if (colonIdx === -1) return null;
  return {
    step: rest.slice(0, colonIdx),
    status: rest.slice(colonIdx + 1)
  };
}

function extractStateFromLabels(labels) {
  const state = {};
  for (const step of PIPELINE_STEPS) {
    state[step] = STATUS.PENDING;
  }

  const labelNames = labels.map(l => typeof l === 'string' ? l : l.name);

  for (const label of labelNames) {
    const parsed = parseLabel(label);
    if (parsed && PIPELINE_STEPS.includes(parsed.step)) {
      state[parsed.step] = parsed.status;
    }
  }

  return state;
}

function labelsForStep(step, status) {
  return [makeLabel(step, status)];
}

function buildContextFromIssue(issue) {
  return {
    issueId: issue.number,
    title: issue.title,
    body: issue.body || '',
    state: extractStateFromLabels(issue.labels || []),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    htmlUrl: issue.html_url,
    user: issue.user ? issue.user.login : null
  };
}

function buildChildIssueTitle(step, parentTitle, parentNumber) {
  const prefix = {
    [STEPS.ARCHITECT]: '[ARCH]',
    [STEPS.BACKEND]: '[BE]',
    [STEPS.FRONTEND]: '[FE]',
    [STEPS.QA]: '[QA]',
    [STEPS.REVIEWER]: '[REVIEW]'
  }[step] || `[${step.toUpperCase()}]`;
  return `${prefix} ${parentTitle} (for #${parentNumber})`;
}

function buildChildIssueBody(step, parentIssue, context) {
  const lines = [
    `## ${step.charAt(0).toUpperCase() + step.slice(1)} Task`,
    '',
    `This is a subtask of #${parentIssue.number}: **${parentIssue.title}**`,
    '',
    '---',
    '',
    `### Parent Issue`,
    `**Title:** ${parentIssue.title}`,
    `**Body:**`,
    parentIssue.body || '_No description provided_',
    ''
  ];

  if (context && context.architecture) {
    lines.push(
      '---',
      '',
      '### Architecture Context',
      `**Summary:** ${context.architecture.summary || '_pending_'}`,
      `**Flow:** ${context.architecture.flow || '_pending_'}`,
      `**Decisions:**`,
      ...(context.architecture.decisions || []).map(d => `- ${d}`)
    );
  }

  return lines.join('\n');
}

function isStepDone(state, step) {
  return state[step] === STATUS.DONE;
}

function isStepFailed(state, step) {
  return state[step] === STATUS.FAILED;
}

function allStepsDone(state, steps) {
  return (steps || PIPELINE_STEPS).every(s => isStepDone(state, s));
}

function getCurrentStep(state) {
  for (const step of PIPELINE_STEPS) {
    if (state[step] === STATUS.IN_PROGRESS) return step;
  }
  for (const step of PIPELINE_STEPS) {
    if (state[step] === STATUS.PENDING) return step;
  }
  return null;
}

module.exports = {
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
};

function defaultIssue() {
  return { id: null, title: '', slug: '', body: '' };
}

function defaultArchitecture() {
  return { summary: null, flow: null, decisions: [], status: 'pending' };
}

function defaultValidation() {
  return { status: 'pending', errors: [] };
}

function defaultExecution() {
  return { status: 'idle', current_node: null, attempts: 0, trace: [] };
}

function defaultLogs() {
  return { orchestrator: '', architect: '', backend: '', frontend: '', qa: '', reviewer: '' };
}

function defaultPR() {
  return { url: null, status: 'none', fixAttempts: 0 };
}

function defaultReview() {
  return { status: 'pending', verdict: null, issues: [] };
}

const stateChannels = {
  issue: {
    value: (left, right) => right !== undefined ? right : left,
    default: defaultIssue
  },
  architecture: {
    value: (left, right) => right !== undefined ? right : left,
    default: defaultArchitecture
  },
  files: {
    value: (left, right) => right !== undefined ? right : left,
    default: () => []
  },
  logs: {
    value: (left, right) => right !== undefined ? right : left,
    default: defaultLogs
  },
  validation: {
    value: (left, right) => right !== undefined ? right : left,
    default: defaultValidation
  },
  execution: {
    value: (left, right) => right !== undefined ? right : left,
    default: defaultExecution
  },
  pr: {
    value: (left, right) => right !== undefined ? right : left,
    default: defaultPR
  },
  review: {
    value: (left, right) => right !== undefined ? right : left,
    default: defaultReview
  }
};

const MAX_BODY_LENGTH = 10240;
const MAX_TITLE_LENGTH = 200;

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function truncate(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function createInitialState(issue) {
  return {
    issue: {
      id: (issue && issue.id) || null,
      title: truncate(sanitize((issue && issue.title) || ''), MAX_TITLE_LENGTH),
      slug: truncate(sanitize((issue && issue.slug) || ''), 80),
      body: truncate(sanitize((issue && issue.body) || ''), MAX_BODY_LENGTH)
    },
    architecture: defaultArchitecture(),
    files: [],
    logs: defaultLogs(),
    validation: defaultValidation(),
    execution: defaultExecution()
  };
}

module.exports = { stateChannels, createInitialState, defaultIssue, defaultArchitecture, defaultValidation, defaultExecution, defaultLogs, defaultPR, defaultReview };

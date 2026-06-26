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
  }
};

function createInitialState(issue) {
  return {
    issue: {
      id: issue.id || null,
      title: issue.title || '',
      slug: issue.slug || '',
      body: issue.body || ''
    },
    architecture: defaultArchitecture(),
    files: [],
    logs: defaultLogs(),
    validation: defaultValidation(),
    execution: defaultExecution()
  };
}

module.exports = { stateChannels, createInitialState, defaultIssue, defaultArchitecture, defaultValidation, defaultExecution, defaultLogs };

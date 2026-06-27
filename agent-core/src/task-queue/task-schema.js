import crypto from 'crypto';

export const TASK_STATES = {
  ERROR: 'error',
  NORMALIZED: 'normalized',
  QUEUED: 'queued',
  PICKED: 'picked',
  EXECUTING: 'executing',
  VALIDATING: 'validating',
  DONE: 'done',
  FAILED: 'failed',
  ARCHIVED: 'archived',
};

export const VALID_TRANSITIONS = {
  [TASK_STATES.ERROR]: [TASK_STATES.NORMALIZED],
  [TASK_STATES.NORMALIZED]: [TASK_STATES.QUEUED],
  [TASK_STATES.QUEUED]: [TASK_STATES.PICKED, TASK_STATES.ARCHIVED],
  [TASK_STATES.PICKED]: [TASK_STATES.EXECUTING, TASK_STATES.FAILED],
  [TASK_STATES.EXECUTING]: [TASK_STATES.VALIDATING, TASK_STATES.FAILED],
  [TASK_STATES.VALIDATING]: [TASK_STATES.DONE, TASK_STATES.FAILED],
  [TASK_STATES.DONE]: [TASK_STATES.ARCHIVED],
  [TASK_STATES.FAILED]: [TASK_STATES.QUEUED, TASK_STATES.ARCHIVED],
  [TASK_STATES.ARCHIVED]: [],
};

export function canTransition(from, to) {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function createTaskId() {
  return `task-${crypto.randomUUID().slice(0, 8)}`;
}

export function createTask(error, source) {
  const dedupKey = `${source}:${error.name || 'Unknown'}:${(error.message || '').slice(0, 60)}`;

  return {
    id: createTaskId(),
    title: `${source}: ${error.name} — ${(error.message || '').slice(0, 80)}`,
    problem: error.message || String(error),
    context: {
      source,
      error_type: error.name || 'UnknownError',
      stack: error.stack || '',
      workspace: error.context?.workspace,
      severity: error.severity || 'error',
    },
    reproduction: [`Error occurred in ${source}`, `Type: ${error.name}`, error.message],
    expected_fix: '',
    constraints: ['No external deps', 'Must be async'],
    severity: error.severity || 'error',
    readiness_score: computeReadiness(error),
    state: TASK_STATES.ERROR,
    created_at: new Date().toISOString(),
    retry_count: 0,
    max_retries: 3,
    dedup_key: dedupKey,
  };
}

function computeReadiness(error) {
  let score = 0.5;
  if (error.message) score += 0.2;
  if (error.stack) score += 0.1;
  if (error.context?.workspace) score += 0.1;
  if (error.name !== 'Error') score += 0.1;
  return Math.min(score, 1.0);
}

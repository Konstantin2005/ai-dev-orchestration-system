const PR_STATE_LABEL_PREFIX = 'pr:';

const PR_STATES = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  FAILED: 'failed',
  FIX_REQUIRED: 'fix-required',
  PASSED: 'passed',
  MERGE_READY: 'merge-ready',
  MERGED: 'merged',
};

const VALID_TRANSITIONS = {
  [PR_STATES.OPEN]: [PR_STATES.REVIEWING],
  [PR_STATES.REVIEWING]: [PR_STATES.PASSED, PR_STATES.FAILED, PR_STATES.FIX_REQUIRED],
  [PR_STATES.FAILED]: [PR_STATES.REVIEWING],
  [PR_STATES.FIX_REQUIRED]: [PR_STATES.REVIEWING],
  [PR_STATES.PASSED]: [PR_STATES.MERGE_READY],
  [PR_STATES.MERGE_READY]: [PR_STATES.MERGED],
};

function makePrLabel(state) {
  return `${PR_STATE_LABEL_PREFIX}${state}`;
}

function parsePrLabel(label) {
  if (typeof label !== 'string') return null;
  if (!label.startsWith(PR_STATE_LABEL_PREFIX)) return null;
  return label.slice(PR_STATE_LABEL_PREFIX.length);
}

function canTransition(from, to) {
  const valid = VALID_TRANSITIONS[from];
  if (!valid) return false;
  return valid.includes(to);
}

function extractPrState(labels) {
  const labelNames = labels.map(l => typeof l === 'string' ? l : l.name);
  for (const label of labelNames) {
    const state = parsePrLabel(label);
    if (state) return state;
  }
  return PR_STATES.OPEN;
}

async function transitionPrState(octokit, owner, repo, prNumber, newState) {
  const currentLabels = await octokit.rest.issues.listLabelsOnIssue({
    owner, repo, issue_number: prNumber
  });
  let prLabels = currentLabels.data.map(l => l.name).filter(l => !l.startsWith(PR_STATE_LABEL_PREFIX));

  if (!prLabels.includes(makePrLabel(newState))) {
    prLabels.push(makePrLabel(newState));
  }

  await octokit.rest.issues.setLabels({
    owner, repo, issue_number: prNumber, labels: prLabels
  });

  return { prNumber, state: newState };
}

module.exports = {
  PR_STATES,
  PR_STATE_LABEL_PREFIX,
  makePrLabel,
  parsePrLabel,
  canTransition,
  extractPrState,
  transitionPrState,
  VALID_TRANSITIONS,
};

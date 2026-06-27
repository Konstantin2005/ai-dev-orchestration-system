const {
  createIssue,
  createComment,
  getIssue,
  getIssueComments,
  updateIssueLabels,
  closeIssue
} = require('./client');

const {
  STATUS,
  STEPS,
  PIPELINE_STEPS,
  makeLabel,
  extractStateFromLabels,
  labelsForStep,
  buildChildIssueTitle,
  buildChildIssueBody,
  isStepDone,
  isStepFailed,
  allStepsDone,
  getCurrentStep
} = require('./state');

function parseRepoFromIssue(issue) {
  if (issue._repo) return issue._repo;
  const url = issue.html_url || '';
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\//);
  if (match) return { owner: match[1], repo: match[2] };
  const { GITHUB_REPOSITORY } = process.env;
  if (GITHUB_REPOSITORY) {
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    return { owner, repo };
  }
  throw new Error('Cannot determine owner/repo from issue or GITHUB_REPOSITORY env');
}

async function createSubIssue(parentIssue, step, context, options = {}) {
  const repo = options.repo || parseRepoFromIssue(parentIssue);
  const title = buildChildIssueTitle(step, parentIssue.title, parentIssue.number);
  const body = buildChildIssueBody(step, parentIssue, context);
  const labels = [makeLabel(step, STATUS.PENDING)];

  const newIssue = await createIssue(repo.owner, repo.repo, title, body, labels, options);

  await createComment(
    repo.owner, repo.repo, parentIssue.number,
    `Created subtask #${newIssue.number}: **${title}**`,
    options
  );

  return newIssue;
}

async function transitionStep(issue, step, newStatus, commentBody, options = {}) {
  const repo = options.repo || parseRepoFromIssue(issue);
  const labels = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name);
  const filtered = labels.filter(l => !l.startsWith(`status:${step}:`));
  filtered.push(makeLabel(step, newStatus));

  await updateIssueLabels(repo.owner, repo.repo, issue.number, filtered, options);

  if (commentBody) {
    await createComment(repo.owner, repo.repo, issue.number, commentBody, options);
  }

  return { step, status: newStatus };
}

async function getPipelineState(issue, options = {}) {
  const repo = options.repo || parseRepoFromIssue(issue);
  const fresh = await getIssue(repo.owner, repo.repo, issue.number, options);
  return {
    issue: fresh,
    state: extractStateFromLabels(fresh.labels || [])
  };
}

async function handleIssueOpened(event, options = {}) {
  const issue = event.issue || event;
  const repo = options.repo || parseRepoFromIssue(issue);

  await createComment(
    repo.owner, repo.repo, issue.number,
    `## Pipeline Started\n\nThe AI orchestration pipeline has been initialized for this issue.\n\n**Next step:** Creating architecture plan...`,
    options
  );

  const archIssue = await createSubIssue(issue, STEPS.ARCHITECT, null, options);

  return {
    parentIssue: issue,
    childIssues: [{ step: STEPS.ARCHITECT, issue: archIssue }],
    currentStep: STEPS.ARCHITECT,
    state: { [STEPS.ARCHITECT]: STATUS.PENDING }
  };
}

async function handleIssueComment(event, options = {}) {
  const comment = event.comment;
  const issue = event.issue;
  const repo = options.repo || parseRepoFromIssue(issue);

  const labelNames = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name);
  const state = extractStateFromLabels(labelNames);
  const currentStep = getCurrentStep(state);

  if (!currentStep) {
    if (allStepsDone(state)) {
      return { action: 'all_done', issue };
    }
    return { action: 'noop', issue, state };
  }

  return { action: 'continue', issue, state, currentStep };
}

async function completePipeline(issue, options = {}) {
  const repo = options.repo || parseRepoFromIssue(issue);

  await createComment(
    repo.owner, repo.repo, issue.number,
    `## Pipeline Complete\n\nAll steps have been completed. Ready to create a Pull Request.`,
    options
  );

  const allLabels = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name);
  const filtered = allLabels.filter(l => !l.startsWith('status:'));
  filtered.push(makeLabel('pipeline', 'completed'));
  await updateIssueLabels(repo.owner, repo.repo, issue.number, filtered, options);

  return { status: 'completed', issue };
}

module.exports = {
  parseRepoFromIssue,
  createSubIssue,
  transitionStep,
  getPipelineState,
  handleIssueOpened,
  handleIssueComment,
  completePipeline
};

const { Octokit } = require('@octokit/rest');

let _mockOctokitFactory = null;

function __setMockOctokit(factory) {
  _mockOctokitFactory = factory;
}

function getOctokit(token) {
  if (_mockOctokitFactory) {
    return _mockOctokitFactory(token);
  }
  const resolvedToken = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!resolvedToken) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN environment variable is required');
  }
  return new Octokit({ auth: resolvedToken });
}

async function createIssue(owner, repo, title, body, labels, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.issues.create({
    owner,
    repo,
    title,
    body,
    labels: labels || []
  });
  return data;
}

async function createComment(owner, repo, issueNumber, body, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body
  });
  return data;
}

async function getIssue(owner, repo, issueNumber, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber
  });
  return data;
}

async function getIssueComments(owner, repo, issueNumber, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  });
  return data;
}

async function updateIssueLabels(owner, repo, issueNumber, labels, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.issues.setLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels
  });
  return data;
}

async function addIssueLabels(owner, repo, issueNumber, labels, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels
  });
  return data;
}

async function removeIssueLabel(owner, repo, issueNumber, label, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.issues.removeLabel({
    owner,
    repo,
    issue_number: issueNumber,
    name: label
  });
  return data;
}

async function closeIssue(owner, repo, issueNumber, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: 'closed'
  });
  return data;
}

async function createPR(owner, repo, head, base, title, body, options = {}) {
  const octokit = getOctokit(options.token);
  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    head,
    base,
    title,
    body
  });
  return data;
}

async function createIssueComment(owner, repo, issueNumber, body, options = {}) {
  return createComment(owner, repo, issueNumber, body, options);
}

async function linkIssues(owner, repo, issueNumber, linkedIssueNumber, relationship, options = {}) {
  const body = relationship === 'blocks'
    ? `Blocks #${linkedIssueNumber}`
    : `Blocked by #${linkedIssueNumber}`;
  return createComment(owner, repo, issueNumber, body, options);
}

module.exports = {
  getOctokit,
  __setMockOctokit,
  createIssue,
  createComment,
  getIssue,
  getIssueComments,
  updateIssueLabels,
  addIssueLabels,
  removeIssueLabel,
  closeIssue,
  createPR,
  createIssueComment,
  linkIssues
};

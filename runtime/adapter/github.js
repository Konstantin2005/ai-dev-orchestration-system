const { RepositoryAdapter } = require('./interface');
const {
  getOctokit,
  createIssue,
  createComment,
  getIssue,
  getIssueComments,
  updateIssueLabels,
  closeIssue,
  createPR
} = require('../github/client');

const { execSync } = require('child_process');

const { cloneRepo, createBranch, commitAndPush, analyzeRepo, getGitInfo, repoExists } = require('../target-repo/manager');

class GitHubAdapter extends RepositoryAdapter {
  constructor(owner, repo, options = {}) {
    super();
    this._owner = owner;
    this._repo = repo;
    this._token = options.token;
    this._workDir = options.workDir || process.cwd();
    this._repoUrl = options.repoUrl || `https://github.com/${owner}/${repo}.git`;
  }

  get name() { return 'github'; }

  async clone(repoUrl, workDir) {
    const url = repoUrl || this._repoUrl;
    const dir = workDir || this._workDir;
    return cloneRepo(url, dir);
  }

  async createBranch(branchName) {
    const { createBranch: gitCreateBranch } = require('../target-repo/manager');
    return gitCreateBranch(this._workDir, branchName);
  }

  async commit(message) {
    return commitAndPush(this._workDir, message);
  }

  async push() {
    const { execSync } = require('child_process');
    execSync(`git -C "${this._workDir}" push origin HEAD`, { stdio: 'pipe' });
    return { pushed: true };
  }

  async createPR(title, body, head, base) {
    return createPR(this._owner, this._repo, head, base, title, body, { token: this._token });
  }

  async readIssues(state, labels) {
    const octokit = getOctokit(this._token);
    const params = { owner: this._owner, repo: this._repo, state: state || 'open', per_page: 100 };
    if (labels && labels.length > 0) params.labels = labels.join(',');
    const { data } = await octokit.rest.issues.listForRepo(params);
    return data;
  }

  async writeComment(issueNumber, body) {
    return createComment(this._owner, this._repo, issueNumber, body, { token: this._token });
  }

  async readFile(filePath) {
    const fs = require('fs');
    const path = require('path');
    const full = path.resolve(this._workDir, filePath);
    return fs.readFileSync(full, 'utf-8');
  }

  async writeFile(filePath, content) {
    const fs = require('fs');
    const path = require('path');
    const full = path.resolve(this._workDir, filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
    return { path: full };
  }

  async analyze() {
    return analyzeRepo(this._workDir);
  }

  async getInfo() {
    return getGitInfo(this._workDir);
  }

  async repoExists() {
    return repoExists(this._workDir);
  }

  async createIssue(title, body, labels) {
    return createIssue(this._owner, this._repo, title, body, labels, { token: this._token });
  }

  async updateLabels(issueNumber, { add, remove }) {
    const octokit = getOctokit(this._token);
    const { data: current } = await octokit.rest.issues.get({
      owner: this._owner, repo: this._repo, issue_number: issueNumber
    });
    const existing = current.labels.map(l => l.name);
    const newLabels = [...existing.filter(l => !(remove || []).includes(l)), ...(add || [])];
    return updateIssueLabels(this._owner, this._repo, issueNumber, newLabels, { token: this._token });
  }
}

module.exports = { GitHubAdapter };

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class GitHubRepoAdapter {
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.repos = options.repos || {};
  }

  async readIssue(issueId) {
    try {
      const { stdout } = await execAsync(
        `gh issue view ${issueId} --json title,body,labels,state`,
        { cwd: this.baseDir }
      );
      return JSON.parse(stdout);
    } catch {
      return { id: issueId, title: `Issue #${issueId}`, body: '', labels: [], state: 'open' };
    }
  }

  async fetchContext(repoName) {
    const repoDir = this.repos[repoName];
    if (!repoDir) return { repo: repoName, files: [] };
    return { repo: repoName, dir: repoDir };
  }

  async writeFile(filePath, content, repoName) {
    const repoDir = this.repos[repoName];
    if (!repoDir) throw new Error(`Unknown repo: ${repoName}`);
    const fullPath = path.join(repoDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async createPR(options) {
    try {
      await execAsync(`git checkout -b ${options.branch}`, { cwd: this.baseDir });
      await execAsync('git add -A', { cwd: this.baseDir });
      await execAsync(`git commit -m "${options.title}" --allow-empty`, { cwd: this.baseDir });
      await execAsync(`git push origin ${options.branch}`, { cwd: this.baseDir });

      const { stdout } = await execAsync(
        `gh pr create --title "${options.title}" --body "Automated by Unified AI OS" --base main`,
        { cwd: this.baseDir }
      );

      return { url: stdout.trim() };
    } catch (err) {
      return { url: null, error: err.message };
    }
  }
}

module.exports = { GitHubRepoAdapter };

const fs = require('fs');
const path = require('path');

class GenericRepoAdapter {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  async readIssue(issueId) {
    return { id: issueId, title: `Issue #${issueId}`, body: '', labels: [] };
  }

  async fetchContext(repoName) {
    return { repo: repoName, dir: this.baseDir, type: 'generic' };
  }

  async writeFile(filePath, content) {
    const fullPath = path.join(this.baseDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  async createPR() {
    return { url: null, error: 'Generic adapter does not support PR creation' };
  }
}

module.exports = { GenericRepoAdapter };

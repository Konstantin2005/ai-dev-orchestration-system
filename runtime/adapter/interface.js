class RepositoryAdapter {
  get name() { return 'abstract'; }

  async clone(repoUrl, workDir) {
    throw new Error('clone() must be implemented by subclass');
  }

  async createBranch(branchName) {
    throw new Error('createBranch() must be implemented by subclass');
  }

  async commit(message) {
    throw new Error('commit() must be implemented by subclass');
  }

  async push(remote, branch) {
    throw new Error('push() must be implemented by subclass');
  }

  async createPR(title, body, head, base) {
    throw new Error('createPR() must be implemented by subclass');
  }

  async readIssues(state, labels) {
    throw new Error('readIssues() must be implemented by subclass');
  }

  async writeComment(issueNumber, body) {
    throw new Error('writeComment() must be implemented by subclass');
  }

  async readFile(path) {
    throw new Error('readFile() must be implemented by subclass');
  }

  async writeFile(path, content) {
    throw new Error('writeFile() must be implemented by subclass');
  }

  async analyze() {
    throw new Error('analyze() must be implemented by subclass');
  }

  async getInfo() {
    throw new Error('getInfo() must be implemented by subclass');
  }
}

function validateAdapter(adapter) {
  const methods = ['clone', 'createBranch', 'commit', 'push', 'createPR', 'readIssues', 'writeComment', 'readFile', 'writeFile', 'analyze', 'getInfo'];
  const missing = methods.filter(m => typeof adapter[m] !== 'function');
  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = { RepositoryAdapter, validateAdapter };

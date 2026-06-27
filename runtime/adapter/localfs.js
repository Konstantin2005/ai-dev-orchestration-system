const fs = require('fs');
const path = require('path');
const { RepositoryAdapter } = require('./interface');

class LocalFSAdapter extends RepositoryAdapter {
  constructor(rootDir, options = {}) {
    super();
    this._rootDir = path.resolve(rootDir || process.cwd());
    this._name = options.name || 'local';
    this._branch = options.branch || 'main';
  }

  get name() { return 'localfs'; }

  async clone(repoUrl, workDir) {
    const dir = workDir || this._rootDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return { path: path.resolve(dir), cloned: false, adapter: 'localfs' };
  }

  async createBranch(branchName) {
    this._branch = branchName || this._branch;
    return { branch: this._branch };
  }

  async commit(message) {
    return { committed: true, message, adapter: 'localfs' };
  }

  async push() {
    return { pushed: true, adapter: 'localfs' };
  }

  async createPR(title, body, head, base) {
    return {
      number: null,
      html_url: null,
      title,
      body,
      adapter: 'localfs',
      note: 'LocalFSAdapter does not support PR creation'
    };
  }

  async readIssues(state, labels) {
    return [];
  }

  async writeComment(issueNumber, body) {
    return { issueNumber, adapter: 'localfs', note: 'LocalFSAdapter does not support comments' };
  }

  async readFile(filePath) {
    const full = path.resolve(this._rootDir, filePath);
    return fs.readFileSync(full, 'utf-8');
  }

  async writeFile(filePath, content) {
    const full = path.resolve(this._rootDir, filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
    return { path: full };
  }

  async analyze() {
    const structure = { files: [], dirs: [], languages: {} };

    function walk(dir, relativePath) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          structure.dirs.push(rel);
          walk(full, rel);
        } else {
          structure.files.push(rel);
          const ext = path.extname(entry.name).toLowerCase();
          if (ext) structure.languages[ext] = (structure.languages[ext] || 0) + 1;
        }
      }
    }

    walk(this._rootDir, '');
    return structure;
  }

  async getInfo() {
    return {
      adapter: 'localfs',
      root: this._rootDir,
      branch: this._branch,
      type: 'local'
    };
  }
}

module.exports = { LocalFSAdapter };

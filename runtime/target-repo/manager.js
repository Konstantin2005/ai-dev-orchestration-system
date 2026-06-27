const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createPR: githubCreatePR } = require('../github/client');

const WORKSPACE_ROOT = process.env.WORKSPACE_DIR || path.resolve(process.cwd(), 'workspace', 'target-repos');

function cloneRepo(repoUrl, workDir) {
  const targetDir = workDir || path.join(WORKSPACE_ROOT, _repoNameFromUrl(repoUrl));
  if (fs.existsSync(targetDir)) {
    execSync(`git -C "${targetDir}" pull --ff-only`, { stdio: 'pipe' });
    return { path: targetDir, cloned: false };
  }
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  execSync(`git clone "${repoUrl}" "${targetDir}"`, { stdio: 'pipe' });
  return { path: targetDir, cloned: true };
}

function _repoNameFromUrl(url) {
  const match = url.match(/\/([^/]+?)(\.git)?$/);
  return match ? match[1] : 'target';
}

function createBranch(repoDir, branchName) {
  execSync(`git -C "${repoDir}" checkout -b "${branchName}"`, { stdio: 'pipe' });
  return { repoDir, branch: branchName };
}

function checkoutBranch(repoDir, branchName) {
  execSync(`git -C "${repoDir}" checkout "${branchName}"`, { stdio: 'pipe' });
  return { repoDir, branch: branchName };
}

function commitAndPush(repoDir, message) {
  const result = { filesChanged: 0, pushed: false };

  const status = execSync(`git -C "${repoDir}" status --porcelain`, { encoding: 'utf-8' });
  result.filesChanged = status.split('\n').filter(l => l.trim()).length;

  if (result.filesChanged === 0) {
    return { ...result, pushed: false, reason: 'nothing to commit' };
  }

  execSync(`git -C "${repoDir}" add -A`, { stdio: 'pipe' });
  execSync(`git -C "${repoDir}" commit -F -`, { input: message, stdio: ['pipe', 'pipe', 'pipe'] });
  execSync(`git -C "${repoDir}" push origin HEAD`, { stdio: 'pipe' });
  result.pushed = true;
  return result;
}

function _escapeShell(str) {
  return str.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

async function createTargetPR(owner, repo, head, base, title, body, options = {}) {
  return githubCreatePR(owner, repo, head, base, title, body, options);
}

function analyzeRepo(repoDir) {
  const structure = { files: [], dirs: [], languages: {} };

  function walk(dir, relativePath) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
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
        if (ext) {
          structure.languages[ext] = (structure.languages[ext] || 0) + 1;
        }
      }
    }
  }

  walk(repoDir, '');
  return structure;
}

function getGitInfo(repoDir) {
  try {
    const url = execSync(`git -C "${repoDir}" remote get-url origin`, { encoding: 'utf-8' }).trim();
    const branch = execSync(`git -C "${repoDir}" rev-parse --abbrev-ref HEAD`, { encoding: 'utf-8' }).trim();
    const hash = execSync(`git -C "${repoDir}" rev-parse HEAD`, { encoding: 'utf-8' }).trim();
    return { url, branch, hash };
  } catch {
    return { url: null, branch: null, hash: null };
  }
}

function repoExists(repoDir) {
  try {
    return fs.existsSync(path.join(repoDir, '.git'));
  } catch {
    return false;
  }
}

module.exports = {
  cloneRepo,
  createBranch,
  checkoutBranch,
  commitAndPush,
  createTargetPR,
  analyzeRepo,
  getGitInfo,
  repoExists,
  _repoNameFromUrl
};

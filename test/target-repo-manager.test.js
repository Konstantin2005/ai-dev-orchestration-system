const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('target-repo/manager.js', () => {
  let manager;
  let testDir;

  before(() => {
    manager = require('../runtime/target-repo/manager');
    testDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'target-repo-test-'));
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.git'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'index.js'), 'console.log("hello");');
    fs.writeFileSync(path.join(testDir, 'src', 'utils.js'), 'export const add = (a,b) => a+b;');
    fs.writeFileSync(path.join(testDir, 'tests', 'test.js'), '// test');
    fs.writeFileSync(path.join(testDir, 'package.json'), '{"name":"test"}');
    fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
  });

  after(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('analyzeRepo', () => {
    it('returns structure with files, dirs, and languages', () => {
      const structure = manager.analyzeRepo(testDir);
      assert.ok(structure.files.length >= 4);
      assert.ok(structure.dirs.includes('src'));
      assert.ok(structure.dirs.includes('tests'));
      assert.ok(structure.languages['.js'] >= 3);
      assert.ok(structure.languages['.md'] >= 1);
      assert.ok(structure.languages['.json'] >= 1);
    });

    it('skips node_modules and dot files', () => {
      fs.mkdirSync(path.join(testDir, 'node_modules'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'node_modules', 'dep.js'), 'hidden');
      const structure = manager.analyzeRepo(testDir);
      const nodeModulesEntry = structure.dirs.find(d => d.includes('node_modules'));
      assert.equal(nodeModulesEntry, undefined);
      const hiddenEntry = structure.files.find(f => f.startsWith('.'));
      assert.equal(hiddenEntry, undefined);
    });

    it('handles empty directory gracefully', () => {
      const emptyDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'empty-repo-'));
      const structure = manager.analyzeRepo(emptyDir);
      assert.deepEqual(structure.files, []);
      assert.deepEqual(structure.dirs, []);
      assert.deepEqual(structure.languages, {});
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });

  describe('repoExists', () => {
    it('returns true when .git exists', () => {
      assert.equal(manager.repoExists(testDir), true);
    });

    it('returns false when .git does not exist', () => {
      const noGitDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'no-git-'));
      assert.equal(manager.repoExists(noGitDir), false);
      fs.rmSync(noGitDir, { recursive: true, force: true });
    });
  });

  describe('_repoNameFromUrl', () => {
    it('extracts name from HTTPS URL', () => {
      assert.equal(manager._repoNameFromUrl('https://github.com/owner/my-repo.git'), 'my-repo');
    });

    it('extracts name from SSH URL', () => {
      assert.equal(manager._repoNameFromUrl('git@github.com:owner/my-repo.git'), 'my-repo');
    });

    it('extracts name from URL without .git', () => {
      assert.equal(manager._repoNameFromUrl('https://github.com/owner/repo'), 'repo');
    });

    it('returns fallback for unrecognized URL', () => {
      assert.equal(manager._repoNameFromUrl(''), 'target');
    });
  });
});

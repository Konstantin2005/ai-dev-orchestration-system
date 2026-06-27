const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  cmdHelp,
  cmdInit,
  cmdConnect
} = require('../runtime/cli');

describe('cli/index.js', () => {
  let testDir;
  const originalCwd = process.cwd;

  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });

  after(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('cmdInit', () => {
    it('creates config in specified directory', () => {
      const result = cmdInit([testDir]);
      assert.ok(result.configDir.endsWith('.ai-orchestrator'));
      assert.ok(fs.existsSync(path.join(testDir, '.ai-orchestrator')));
    });
  });

  describe('cmdConnect', () => {
    it('registers repository', () => {
      const repoUrl = 'https://github.com/owner/test-repo';
      const connection = cmdConnect([repoUrl, 'github', testDir]);
      assert.equal(connection.repositories.length, 1);
      assert.equal(connection.repositories[0].url, repoUrl);
    });

    it('defaults to github adapter', () => {
      const repoUrl = 'https://github.com/owner/another-repo';
      const connection = cmdConnect([repoUrl, undefined, testDir]);
      const last = connection.repositories[connection.repositories.length - 1];
      assert.equal(last.adapter, 'github');
    });
  });

  describe('cmdHelp', () => {
    it('outputs help without error', () => {
      cmdHelp();
    });
  });
});

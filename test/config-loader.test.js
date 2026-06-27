const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  CONFIG_DIR,
  CONFIG_FILES,
  configDir,
  initConfig,
  readConfig,
  addRepository,
  getRepositories
} = require('../runtime/config/loader');

describe('config/loader.js', () => {
  let testDir;

  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
  });

  after(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('configDir returns path under root', () => {
    const dir = configDir(testDir);
    assert.ok(dir.endsWith(CONFIG_DIR));
  });

  it('initConfig creates all config files', () => {
    const result = initConfig(testDir);
    assert.ok(result.configDir.endsWith(CONFIG_DIR));

    for (const file of result.files) {
      const filePath = path.join(result.configDir, file);
      assert.ok(fs.existsSync(filePath), `File ${file} should exist`);
    }
  });

  it('readConfig reads back all configs', () => {
    const config = readConfig(testDir);
    assert.ok(config.agents);
    assert.ok(config.runtime);
    assert.ok(config.connection);
    assert.equal(config.agents.version, 1);
    assert.equal(config.runtime.version, 1);
    assert.deepEqual(config.connection.repositories, []);
  });

  it('readConfig returns nulls when config dir missing', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-config-'));
    const config = readConfig(emptyDir);
    assert.equal(config.agents, null);
    assert.equal(config.runtime, null);
    assert.equal(config.connection, null);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('addRepository registers a repository', () => {
    const connection = addRepository(testDir, 'https://github.com/owner/repo.git', 'github');
    assert.equal(connection.repositories.length, 1);
    assert.equal(connection.repositories[0].url, 'https://github.com/owner/repo.git');
  });

  it('getRepositories returns registered repos', () => {
    const repos = getRepositories(testDir);
    assert.ok(repos.length >= 1);
    assert.equal(repos[0].url, 'https://github.com/owner/repo.git');
  });

  it('addRepository appends multiple repos', () => {
    addRepository(testDir, 'https://github.com/owner/repo2.git', 'localfs');
    const repos = getRepositories(testDir);
    assert.equal(repos.length, 2);
  });

  it('getRepositories returns empty for missing config', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
    const repos = getRepositories(emptyDir);
    assert.deepEqual(repos, []);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});

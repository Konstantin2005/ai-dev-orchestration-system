const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { LocalFSAdapter } = require('../runtime/adapter/localfs');

describe('adapter/localfs.js', () => {
  let testDir;
  let adapter;

  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'localfs-test-'));
    fs.writeFileSync(path.join(testDir, 'test.js'), 'console.log("hello");');
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'index.js'), '// main');
    adapter = new LocalFSAdapter(testDir);
  });

  after(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('getInfo returns adapter metadata', async () => {
    const info = await adapter.getInfo();
    assert.equal(info.adapter, 'localfs');
    assert.equal(info.root, testDir);
  });

  it('analyze scans directory structure', async () => {
    const structure = await adapter.analyze();
    assert.ok(structure.files.includes('test.js'));
    assert.ok(structure.files.includes('src/index.js'));
    assert.ok(structure.dirs.includes('src'));
  });

  it('readFile reads file content', async () => {
    const content = await adapter.readFile('test.js');
    assert.equal(content, 'console.log("hello");');
  });

  it('writeFile creates file', async () => {
    const result = await adapter.writeFile('newfile.txt', 'new content');
    assert.ok(result.path);
    const content = fs.readFileSync(path.join(testDir, 'newfile.txt'), 'utf-8');
    assert.equal(content, 'new content');
  });

  it('createBranch sets branch name', async () => {
    const result = await adapter.createBranch('feature/test');
    assert.equal(result.branch, 'feature/test');
  });

  it('commit returns success without actual git', async () => {
    const result = await adapter.commit('test commit');
    assert.equal(result.committed, true);
  });

  it('push returns success without actual git', async () => {
    const result = await adapter.push();
    assert.equal(result.pushed, true);
  });

  it('createPR returns note about no PR support', async () => {
    const result = await adapter.createPR('title', 'body', 'head', 'base');
    assert.equal(result.adapter, 'localfs');
    assert.ok(result.note);
  });

  it('readIssues returns empty array', async () => {
    const issues = await adapter.readIssues();
    assert.deepEqual(issues, []);
  });

  it('writeComment returns note', async () => {
    const result = await adapter.writeComment(1, 'body');
    assert.equal(result.adapter, 'localfs');
  });

  it('clone creates directory', async () => {
    const newDir = fs.mkdtempSync(path.join(os.tmpdir(), 'localfs-clone-'));
    const result = await adapter.clone(null, newDir);
    assert.ok(result.path);
    fs.rmSync(newDir, { recursive: true, force: true });
  });
});

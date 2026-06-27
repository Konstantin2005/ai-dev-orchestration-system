const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { RepositoryAdapter, validateAdapter } = require('../runtime/adapter/interface');

describe('adapter/interface.js', () => {
  it('RepositoryAdapter throws on abstract methods', async () => {
    const adapter = new RepositoryAdapter();
    await assert.rejects(async () => adapter.clone(), /must be implemented/);
    await assert.rejects(async () => adapter.createBranch(), /must be implemented/);
    await assert.rejects(async () => adapter.commit(), /must be implemented/);
    await assert.rejects(async () => adapter.push(), /must be implemented/);
    await assert.rejects(async () => adapter.createPR(), /must be implemented/);
    await assert.rejects(async () => adapter.readIssues(), /must be implemented/);
  });

  it('validateAdapter returns true for abstract adapter (all methods defined)', () => {
    const result = validateAdapter(new RepositoryAdapter());
    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  });

  it('validateAdapter returns true for valid adapter', () => {
    const mock = {
      clone: async () => {},
      createBranch: async () => {},
      commit: async () => {},
      push: async () => {},
      createPR: async () => {},
      readIssues: async () => {},
      writeComment: async () => {},
      readFile: async () => {},
      writeFile: async () => {},
      analyze: async () => {},
      getInfo: async () => {}
    };
    const result = validateAdapter(mock);
    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  });
});

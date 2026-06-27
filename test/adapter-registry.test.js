const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  createAdapter,
  listAdapters,
  GitHubAdapter,
  LocalFSAdapter,
  ADAPTER_REGISTRY
} = require('../runtime/adapter');

describe('adapter/index.js', () => {
  describe('createAdapter', () => {
    it('creates GitHubAdapter for github type', () => {
      const adapter = createAdapter('github', 'owner', 'repo');
      assert.ok(adapter instanceof GitHubAdapter);
      assert.equal(adapter.name, 'github');
    });

    it('creates LocalFSAdapter for localfs type', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-test-'));
      const adapter = createAdapter('localfs', tmp);
      assert.ok(adapter instanceof LocalFSAdapter);
      assert.equal(adapter.name, 'localfs');
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('throws for unknown adapter type', () => {
      assert.throws(() => createAdapter('gitlab'), /Unknown adapter type/);
    });
  });

  describe('listAdapters', () => {
    it('returns all registered adapter types', () => {
      const adapters = listAdapters();
      assert.ok(adapters.includes('github'));
      assert.ok(adapters.includes('localfs'));
    });
  });

  describe('ADAPTER_REGISTRY', () => {
    it('contains github and localfs', () => {
      assert.ok(ADAPTER_REGISTRY.github);
      assert.ok(ADAPTER_REGISTRY.localfs);
    });
  });
});

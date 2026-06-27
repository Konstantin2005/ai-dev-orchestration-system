const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXECUTION_STEPS,
  _parseRepoUrl
} = require('../runtime/orchestration/execution-loop');

describe('orchestration/execution-loop.js', () => {

  describe('EXECUTION_STEPS', () => {
    it('has exactly 7 steps in order', () => {
      assert.deepEqual(EXECUTION_STEPS, [
        'analyze', 'plan', 'implement', 'test', 'commit', 'pr', 'report'
      ]);
    });
  });

  describe('_parseRepoUrl', () => {
    it('parses HTTPS URL', () => {
      const result = _parseRepoUrl('https://github.com/owner/target-repo.git');
      assert.equal(result.owner, 'owner');
      assert.equal(result.repo, 'target-repo');
    });

    it('parses HTTPS URL without .git', () => {
      const result = _parseRepoUrl('https://github.com/my-org/my-repo');
      assert.equal(result.owner, 'my-org');
      assert.equal(result.repo, 'my-repo');
    });

    it('parses SSH URL', () => {
      const result = _parseRepoUrl('git@github.com:owner/target-repo.git');
      assert.equal(result.owner, 'owner');
      assert.equal(result.repo, 'target-repo');
    });

    it('throws on invalid URL', () => {
      assert.throws(() => _parseRepoUrl('not-a-url'), /Cannot parse/);
      assert.throws(() => _parseRepoUrl(''), /Cannot parse/);
    });
  });
});

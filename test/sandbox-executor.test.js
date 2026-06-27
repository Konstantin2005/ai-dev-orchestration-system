const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { executeCode, executeCommand, createSandboxDir, destroySandboxDir } = require('../runtime/sandbox/executor');

describe('sandbox/executor.js', () => {
  describe('createSandboxDir / destroySandboxDir', () => {
    it('creates and destroys sandbox directory', () => {
      const dir = createSandboxDir();
      assert.ok(fs.existsSync(dir));
      assert.ok(dir.startsWith(path.join(os.tmpdir(), 'ai-sandbox-')));
      destroySandboxDir(dir);
      assert.ok(!fs.existsSync(dir));
    });
  });

  describe('executeCode', () => {
    it('executes JavaScript code and returns stdout', () => {
      const result = executeCode('console.log("hello from sandbox")', { language: 'js' });
      assert.ok(result.success);
      assert.match(result.stdout, /hello from sandbox/);
      assert.equal(result.exitCode, 0);
      destroySandboxDir(result.sandboxDir);
    });

    it('captures stderr on error', () => {
      const result = executeCode('throw new Error("test error")', { language: 'js' });
      assert.ok(!result.success);
      assert.ok(result.stderr.includes('test error') || result.error.includes('test error'));
      assert.notEqual(result.exitCode, 0);
    });

    it('handles syntax errors', () => {
      const result = executeCode('if (true {', { language: 'js' });
      assert.ok(!result.success);
      destroySandboxDir(result.sandboxDir);
    });

    it('enforces timeout', () => {
      const result = executeCode('while(true) {}', { language: 'js', timeout: 100 });
      assert.ok(!result.success);
      assert.ok(result.error);
    });

    it('supports python (if available)', () => {
      const result = executeCode('print("hello python")', { language: 'py', timeout: 5000 });
      if (!result.success && result.error.includes('ENOENT')) {
        return; // python not installed, skip
      }
      assert.ok(result.success);
      assert.match(result.stdout, /hello python/);
    });
  });

  describe('executeCommand', () => {
    it('executes shell command and returns output', () => {
      const result = executeCommand('echo hello', { timeout: 5000 });
      assert.ok(result.success);
      assert.match(result.stdout, /hello/);
    });

    it('captures command failure', () => {
      const result = executeCommand('exit 1', { timeout: 5000 });
      assert.ok(!result.success);
      assert.notEqual(result.exitCode, 0);
    });
  });
});

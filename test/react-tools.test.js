const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { tools, getTool, listTools, executeTool } = require('../runtime/agents/react-tools');

const TEST_WORKSPACE = process.cwd();

describe('agents/react-tools.js', () => {
  describe('listTools', () => {
    it('returns all 6 tools', () => {
      const toolList = listTools();
      assert.equal(toolList.length, 6);
      const names = toolList.map(t => t.name);
      assert.ok(names.includes('file_read'));
      assert.ok(names.includes('file_write'));
      assert.ok(names.includes('run_command'));
      assert.ok(names.includes('run_tests'));
      assert.ok(names.includes('search_codebase'));
      assert.ok(names.includes('fetch_repo_state'));
    });
  });

  describe('getTool', () => {
    it('returns tool by name', () => {
      const tool = getTool('file_read');
      assert.ok(tool);
      assert.equal(tool.name, 'file_read');
    });

    it('returns null for unknown tool', () => {
      assert.equal(getTool('nonexistent'), null);
    });
  });

  describe('executeTool', () => {
    it('file_read reads a file', () => {
      const result = executeTool('file_read', { filePath: 'package.json' }, { workspace: TEST_WORKSPACE });
      assert.ok(result.success);
      assert.ok(result.data.length > 0);
    });

    it('file_read rejects path traversal', () => {
      const result = executeTool('file_read', { filePath: '../../../etc/passwd' }, { workspace: TEST_WORKSPACE });
      assert.ok(!result.success);
      assert.ok(result.error.includes('Path traversal'));
    });

    it('file_read returns error for missing file', () => {
      const result = executeTool('file_read', { filePath: 'nonexistent-file-xyz.js' }, { workspace: TEST_WORKSPACE });
      assert.ok(!result.success);
      assert.ok(result.error.includes('File not found'));
    });

    it('file_write creates a file', () => {
      const result = executeTool('file_write', { filePath: '_test_write.txt', content: 'hello' }, { workspace: TEST_WORKSPACE });
      assert.ok(result.success);
    });

    it('run_command executes and returns output', () => {
      const result = executeTool('run_command', { command: 'echo hello-world' }, { workspace: TEST_WORKSPACE });
      assert.ok(result.success);
      assert.match(result.stdout, /hello-world/);
    });

    it('run_tests runs custom test command', () => {
      const result = executeTool('run_tests', { testCommand: 'node --version', timeout: 10000 }, { workspace: TEST_WORKSPACE });
      assert.ok(result.success);
    });

    it('search_codebase finds patterns', () => {
      const result = executeTool('search_codebase', { pattern: 'function' }, { workspace: TEST_WORKSPACE });
      assert.ok(result.success);
    });
  });
});

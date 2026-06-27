const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

function runValidator(input, prefix) {
  const args = ['validators/validate-output.js'];
  if (prefix) args.push(prefix);
  const proc = spawnSync('node', args, {
    cwd: join(__dirname, '..'),
    input: JSON.stringify(input),
    encoding: 'utf-8'
  });
  return { stdout: proc.stdout.trim(), stderr: proc.stderr.trim(), status: proc.status };
}

describe('validate-output.js', () => {
  const prefix = 'workspace/issues/9-test/';

  it('accepts valid output', () => {
    const input = {
      architecture: { summary: 'Test', flow: 'linear', decisions: ['dec1'] },
      files: [{ path: `${prefix}00-architect/plan.md`, content: 'hello' }],
      logs: { architect: 'a', backend: 'b', frontend: 'f', qa: 'q', reviewer: 'r' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'VALID');
  });

  it('rejects invalid JSON', () => {
    const proc = spawnSync('node', ['runtime/validate-output.js'], {
      cwd: join(__dirname, '..'),
      input: 'not-json{{{',
      encoding: 'utf-8'
    });
    assert.equal(proc.status, 1);
    assert.equal(proc.stdout.trim(), 'INVALID');
  });

  it('rejects missing required top-level keys', () => {
    const input = { files: [], logs: {}, status: 'READY_FOR_PR' };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects missing architecture sub-keys', () => {
    const input = {
      architecture: {},
      files: [{ path: `${prefix}test.md`, content: 'x' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects empty files array', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects invalid status', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}test.md`, content: 'x' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'INVALID_STATUS'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects path outside workspace', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: '/etc/passwd', content: 'x' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects forbidden path patterns', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}../escape.md`, content: 'x' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects bad file extensions', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}malware.exe`, content: 'x' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects too many files', () => {
    const files = Array.from({ length: 51 }, (_, i) => ({
      path: `${prefix}file-${i}.md`,
      content: 'x'
    }));
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files,
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects content exceeding max length', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}test.md`, content: 'x'.repeat(50001) }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects missing required log keys', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}test.md`, content: 'x' }],
      logs: { architect: '', backend: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('accepts CHANGES_REQUESTED as valid status', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}test.md`, content: 'x' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'CHANGES_REQUESTED'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'VALID');
  });

  it('rejects file with missing path', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ content: 'x' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
  });

  it('rejects file with missing content', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}test.md` }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
  });

  it('rejects content with eval() call', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}test.js`, content: 'eval("dangerous")' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, 'INVALID');
  });

  it('rejects content with exec() call', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}test.js`, content: 'exec("rm -rf /")' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
  });

  it('rejects content with require(fs) and process.env', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}test.js`, content: 'require("fs"); process.env.SECRET' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 1);
  });

  it('accepts safe content with allowed patterns', () => {
    const input = {
      architecture: { summary: 's', flow: 'f', decisions: [] },
      files: [{ path: `${prefix}safe.js`, content: 'const x = 1; console.log(x);' }],
      logs: { architect: '', backend: '', frontend: '', qa: '', reviewer: '' },
      status: 'READY_FOR_PR'
    };
    const result = runValidator(input, prefix);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'VALID');
  });
});

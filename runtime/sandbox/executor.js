const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const DEFAULT_TIMEOUT = 30000;
const SANDBOX_PREFIX = 'ai-sandbox-';

function createSandboxDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), SANDBOX_PREFIX));
  return dir;
}

function destroySandboxDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    console.error(`[SANDBOX] Failed to clean up ${dir}: ${err.message}`);
  }
}

function executeCode(code, options = {}) {
  const {
    language = 'js',
    timeout = DEFAULT_TIMEOUT,
    args = [],
    stdin = ''
  } = options;

  const sandboxDir = createSandboxDir();
  const startTime = Date.now();

  try {
    let command;
    let filename;

    switch (language) {
      case 'js':
      case 'javascript':
        filename = 'script.js';
        command = `node`;
        break;
      case 'py':
      case 'python':
        filename = 'script.py';
        command = `python`;
        break;
      case 'sh':
      case 'bash':
        filename = 'script.sh';
        command = `bash`;
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    const filePath = path.join(sandboxDir, filename);
    fs.writeFileSync(filePath, code, 'utf-8');

    const cmd = `${command} ${filename} ${args.join(' ')}`;

    const output = execSync(cmd, {
      cwd: sandboxDir,
      encoding: 'utf-8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
      input: stdin,
      maxBuffer: 10 * 1024 * 1024
    });

    const duration = Date.now() - startTime;

    return {
      success: true,
      stdout: output,
      stderr: '',
      exitCode: 0,
      duration,
      sandboxDir
    };
  } catch (err) {
    const duration = Date.now() - startTime;

    if (err.stdout === undefined) {
      return {
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: err.status || 1,
        duration,
        error: err.message,
        sandboxDir
      };
    }

    return {
      success: false,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      exitCode: err.status || 1,
      duration,
      error: err.message,
      sandboxDir
    };
  }
}

function executeCommand(command, options = {}) {
  const {
    cwd = process.cwd(),
    timeout = DEFAULT_TIMEOUT,
    stdin = ''
  } = options;

  const startTime = Date.now();

  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
      input: stdin,
      maxBuffer: 10 * 1024 * 1024
    });

    return {
      success: true,
      stdout: output,
      stderr: '',
      exitCode: 0,
      duration: Date.now() - startTime
    };
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      exitCode: err.status || 1,
      duration: Date.now() - startTime,
      error: err.message
    };
  }
}

module.exports = { executeCode, executeCommand, createSandboxDir, destroySandboxDir };

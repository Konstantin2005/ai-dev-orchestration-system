const ALLOWED_EXTENSIONS = ['.md', '.json', '.log', '.txt', '.yml', '.yaml', '.js', '.ts', '.py', '.sh'];
const FORBIDDEN_PATTERNS = ['../', '..\\', '~', '$HOME', '/etc/', '/proc/', '/dev/'];
const MAX_CONTENT_LENGTH = 50000;
const MAX_FILES = 50;
const MIN_FILES = 1;
const MIN_MD_FILE_SIZE = 50;
const REQUIRED_TOP = ['architecture', 'files', 'logs', 'status'];
const REQUIRED_ARCH = ['summary', 'flow', 'decisions'];
const REQUIRED_LOGS = ['architect', 'backend', 'frontend', 'qa', 'reviewer'];
const FORBIDDEN_CONTENT_PATTERNS = [
  { pattern: /eval\s*\(/g, description: 'eval() call' },
  { pattern: /require\s*\(['"`]fs['"`]\)/g, description: 'require(fs)' },
  { pattern: /require\s*\(['"`]child_process['"`]\)/g, description: 'require(child_process)' },
  { pattern: /process\.env/g, description: 'process.env access' },
  { pattern: /exec(?:Sync)?\s*\(/g, description: 'exec() call' },
  { pattern: /spawn(?:Sync)?\s*\(/g, description: 'spawn() call' },
  { pattern: /import\s+{\s*.*\s*}\s+from\s+['"`]fs['"`]/g, description: 'import fs' },
  { pattern: /import\s+{\s*.*\s*}\s+from\s+['"`]child_process['"`]/g, description: 'import child_process' },
  { pattern: /rm\s+-rf\s+/g, description: 'rm -rf command' },
  { pattern: />\s*\/dev\//g, description: 'write to /dev/' }
];

function validateOutput(state) {
  const errors = [];

  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['State must be an object'] };
  }

  for (const key of REQUIRED_TOP) {
    if (!(key in state)) errors.push(`Missing top-level key: ${key}`);
  }

  const arch = state.architecture || {};
  for (const key of REQUIRED_ARCH) {
    if (!(key in arch)) errors.push(`Missing architecture.${key}`);
  }

  if (!Array.isArray(state.files)) {
    errors.push('files must be an array');
  } else {
    if (state.files.length === 0) errors.push('files must be non-empty array');
    if (state.files.length < MIN_FILES) errors.push(`Too few files: ${state.files.length} (minimum ${MIN_FILES})`);
    if (state.files.length > MAX_FILES) errors.push(`Too many files: ${state.files.length}`);

    for (let i = 0; i < state.files.length; i++) {
      const f = state.files[i];
      if (!f || !f.path || !f.content) { errors.push(`File ${i}: missing path/content`); continue; }

      for (const p of FORBIDDEN_PATTERNS) {
        if (f.path.includes(p)) errors.push(`File ${i}: forbidden pattern "${p}" in path`);
      }

      const ext = f.path.slice(f.path.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(ext)) errors.push(`File ${i}: bad extension "${ext}"`);

      if (f.content.length > MAX_CONTENT_LENGTH) errors.push(`File ${i}: content too long (${f.content.length})`);

      if (f.path.endsWith('.md') && f.content.length < MIN_MD_FILE_SIZE) {
        errors.push(`File ${i}: stub file (too short: ${f.content.length} bytes) — ${f.path}`);
      }

      if (f.path.endsWith('context.md') && !f.content.includes('state:')) {
        errors.push(`File ${i}: missing state: field in ${f.path}`);
      }

      if (f.content.charCodeAt(0) === 0xFFFD) {
        errors.push(`File ${i}: encoding corruption (replacement char) — ${f.path}`);
      }

      for (const cp of FORBIDDEN_CONTENT_PATTERNS) {
        if (cp.pattern.test(f.content)) errors.push(`File ${i}: forbidden pattern in content — ${cp.description}`);
      }
    }
  }

  if (!['READY_FOR_PR', 'CHANGES_REQUESTED'].includes(state.status)) {
    errors.push(`Invalid status: "${state.status}"`);
  }

  const logs = state.logs || {};
  for (const key of REQUIRED_LOGS) {
    if (!(key in logs)) errors.push(`Missing logs.${key}`);
  }

  return { valid: errors.length === 0, errors };
}

async function validationNode(state) {
  const startTime = Date.now();
  console.error(`[VALIDATION] Validating graph output`);

  const output = {
    architecture: state.architecture,
    files: state.files || [],
    logs: state.logs || {},
    status: state._output ? state._output.status : 'CHANGES_REQUESTED'
  };

  const result = validateOutput(output);

  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] [VALIDATION] ${result.valid ? 'PASSED' : 'FAILED'}${result.errors.length ? '\nErrors: ' + result.errors.join('; ') : ''}`;

  console.error(`[VALIDATION] ${result.valid ? 'PASSED' : 'FAILED'} (${result.errors.length} errors)`);

  if (!result.valid) {
    return {
      validation: { status: 'invalid', errors: result.errors },
      logs: { qa: ((state.logs || {}).qa || '') + '\n' + log },
      execution: { status: 'failed', current_node: 'validation', attempts: (state.execution || {}).attempts || 0 }
    };
  }

  return {
    validation: { status: 'valid', errors: [] },
    logs: { qa: ((state.logs || {}).qa || '') + '\n' + log },
    execution: { status: 'running', current_node: 'validation' }
  };
}

module.exports = { validationNode, validateOutput };

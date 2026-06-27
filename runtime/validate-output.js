/**
 * Zero-Trust JSON Validator for AI Orchestrator output
 * Usage: node validate-output.js <workspace-prefix> < ai-output.json
 */

const WORKSPACE_PREFIX = process.argv[2] || 'workspace/issues/';
const MAX_CONTENT_LENGTH = 50000;
const MAX_FILES = 50;
const ALLOWED_EXTENSIONS = ['.md', '.json', '.log', '.txt', '.yml', '.yaml', '.js', '.ts', '.py', '.sh'];
const FORBIDDEN_PATTERNS = ['../', '..\\', '~', '$HOME', '/etc/', '/proc/', '/dev/'];
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

const REQUIRED_TOP = ['architecture', 'files', 'logs', 'status'];
const REQUIRED_ARCH = ['summary', 'flow', 'decisions'];
const REQUIRED_LOGS = ['architect', 'backend', 'frontend', 'qa', 'reviewer'];

let input = '';
const errors = [];

process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(input); }
  catch (e) { error('PARSE', 'Invalid JSON: ' + e.message); exit(); }

  for (const key of REQUIRED_TOP)
    if (!(key in data)) error('SCHEMA', 'Missing: ' + key);

  for (const key of REQUIRED_ARCH)
    if (!(key in (data.architecture || {}))) error('SCHEMA', 'Missing architecture.' + key);

  if (!Array.isArray(data.files) || data.files.length === 0)
    error('SCHEMA', 'files must be non-empty array');

  if (!['READY_FOR_PR', 'CHANGES_REQUESTED'].includes(data.status))
    error('SCHEMA', 'Invalid status: ' + data.status);

  if (data.files && Array.isArray(data.files)) {
    if (data.files.length > MAX_FILES)
      error('SCHEMA', 'Too many files: ' + data.files.length);
    for (let i = 0; i < data.files.length; i++) {
      const f = data.files[i];
      if (!f.path || !f.content) { error('FILE-' + i, 'Missing path/content'); continue; }
      for (const p of FORBIDDEN_PATTERNS)
        if (f.path.includes(p)) error('FILE-' + i, 'Forbidden pattern: ' + p);
      if (!f.path.startsWith(WORKSPACE_PREFIX))
        error('FILE-' + i, 'Outside workspace: ' + f.path);
      const ext = f.path.slice(f.path.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(ext))
        error('FILE-' + i, 'Bad extension: ' + ext);
      if (f.content.length > MAX_CONTENT_LENGTH)
        error('FILE-' + i, 'Content too long: ' + f.content.length);
      for (const cp of FORBIDDEN_CONTENT_PATTERNS)
        if (cp.pattern.test(f.content)) error('CONTENT-' + i, 'Forbidden pattern in content: ' + cp.description);
    }
  }

  for (const key of REQUIRED_LOGS)
    if (!(key in (data.logs || {}))) error('SCHEMA', 'Missing logs.' + key);

  exit();
});

function error(ctx, msg) { errors.push(`[${ctx}] ${msg}`); }
function exit() {
  if (errors.length) { console.log('INVALID'); errors.forEach(e => console.error(e)); process.exit(1); }
  else { console.log('VALID'); process.exit(0); }
}

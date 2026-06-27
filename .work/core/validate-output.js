/**
 * Zero-Trust JSON Validator for AI Orchestrator output
 * Usage: node validate-output.js < ai-output.json
 * Exits 0 on VALID, 1 on INVALID (with error details)
 */

const WORKSPACE_PREFIX = process.argv[2] || '.work/issues/';
const MAX_FILE_SIZE = 1024 * 100; // 100KB per file
const MAX_FILES = 50;
const MAX_CONTENT_LENGTH = 50000; // 50K chars per file
const ALLOWED_EXTENSIONS = ['.md', '.json', '.log', '.txt', '.yml', '.yaml', '.js', '.ts', '.py', '.sh'];
const FORBIDDEN_PATTERNS = ['../', '..\\', '~', '$HOME', '/etc/', '/proc/', '/dev/', ':\\'];

const REQUIRED_TOP = ['architecture', 'files', 'logs', 'status'];
const REQUIRED_ARCH = ['summary', 'flow', 'decisions'];
const REQUIRED_LOGS = ['architect', 'backend', 'frontend', 'qa', 'reviewer'];
const ALLOWED_STATUS = ['READY_FOR_PR', 'CHANGES_REQUESTED'];

let input = '';
const errors = [];

function addError(context, message) {
  errors.push(`[${context}] ${message}`);
}

process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  // Step 1: Parse JSON
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    addError('PARSE', `Invalid JSON: ${e.message}`);
    printResult();
    process.exit(1);
  }

  // Step 2: Check top-level keys
  for (const key of REQUIRED_TOP) {
    if (!(key in data) || data[key] === null) {
      addError('SCHEMA', `Missing required top-level key: "${key}"`);
    }
  }
  if (errors.length) { printResult(); process.exit(1); }

  // Step 3: Validate architecture
  for (const key of REQUIRED_ARCH) {
    if (!(key in data.architecture)) {
      addError('SCHEMA', `Missing architecture.${key}`);
    }
  }
  if (typeof data.architecture.summary !== 'string' || data.architecture.summary.length > 2000) {
    addError('SCHEMA', 'architecture.summary must be string ≤ 2000 chars');
  }
  if (!Array.isArray(data.architecture.decisions)) {
    addError('SCHEMA', 'architecture.decisions must be an array');
  }

  // Step 4: Validate status
  if (!ALLOWED_STATUS.includes(data.status)) {
    addError('SCHEMA', `Invalid status "${data.status}". Allowed: ${ALLOWED_STATUS.join(', ')}`);
  }

  // Step 5: Validate files array
  if (!Array.isArray(data.files)) {
    addError('SCHEMA', '"files" must be an array');
  } else if (data.files.length === 0) {
    addError('SCHEMA', '"files" array is empty — no output to write');
  } else if (data.files.length > MAX_FILES) {
    addError('SCHEMA', `Too many files: ${data.files.length} > ${MAX_FILES}`);
  } else {
    const seenPaths = new Set();
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      const idx = `files[${i}]`;

      if (!file.path || !file.content) {
        addError(idx, 'Missing "path" or "content"');
        continue;
      }

      if (typeof file.path !== 'string') {
        addError(idx, '"path" must be a string');
        continue;
      }

      if (typeof file.content !== 'string') {
        addError(idx, '"content" must be a string');
        continue;
      }

      // Path traversal check
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (file.path.includes(pattern)) {
          addError(idx, `Path contains forbidden pattern "${pattern}": ${file.path}`);
        }
      }

      // Workspace prefix check
      if (!file.path.startsWith(WORKSPACE_PREFIX)) {
        addError(idx, `Path outside workspace: ${file.path} (must start with ${WORKSPACE_PREFIX})`);
      }

      // File extension check
      const ext = file.path.slice(file.path.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(ext) && ext !== file.path) {
        addError(idx, `Disallowed file extension: ${ext} in ${file.path}`);
      }

      // Content size check
      if (file.content.length > MAX_CONTENT_LENGTH) {
        addError(idx, `Content too long: ${file.content.length} chars > ${MAX_CONTENT_LENGTH}`);
      }

      // Duplicate path check
      if (seenPaths.has(file.path)) {
        addError(idx, `Duplicate path: ${file.path}`);
      }
      seenPaths.add(file.path);
    }
  }

  // Step 6: Validate logs
  for (const key of REQUIRED_LOGS) {
    if (!(key in data.logs)) {
      addError('SCHEMA', `Missing logs.${key}`);
    } else if (typeof data.logs[key] !== 'string') {
      addError('SCHEMA', `logs.${key} must be a string`);
    } else if (data.logs[key].length > 10000) {
      addError('SCHEMA', `logs.${key} too long: ${data.logs[key].length} chars > 10000`);
    }
  }

  // Step 7: Validate no extra top-level keys
  const allowedTop = new Set([...REQUIRED_TOP, 'validation', 'metadata']);
  for (const key of Object.keys(data)) {
    if (!allowedTop.has(key)) {
      addError('SCHEMA', `Unexpected top-level key: "${key}"`);
    }
  }

  printResult();
  if (errors.length) {
    process.exit(1);
  }
  process.exit(0);
});

function printResult() {
  if (errors.length) {
    console.log('INVALID');
    errors.forEach(e => console.error(e));
  } else {
    console.log('VALID');
  }
}

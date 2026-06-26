const fs = require('fs');
const path = require('path');
const { resolveFiles } = require('../../path-resolver');

const AI_SYSTEM_DIR = path.resolve(__dirname, '..', '..', '..');
const WORKSPACE_DIR = path.join(AI_SYSTEM_DIR, 'workspace');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function writeFiles(state, projectRoot) {
  const files = state.files || [];
  if (files.length === 0) {
    return { written: [], errors: ['No files to write'] };
  }

  const config = { output: state._outputConfig || {} };
  const results = resolveFiles(
    files.map(f => f.path),
    projectRoot || AI_SYSTEM_DIR,
    config
  );

  const written = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const r = results[i];

    if (r.error || !r.resolved) {
      errors.push({ path: f.path, error: r.error || 'Resolution failed' });
      continue;
    }

    try {
      const resolvedPath = r.resolved;

      const resolvedReal = path.resolve(resolvedPath);
      const aiSystemReal = path.resolve(AI_SYSTEM_DIR);
      const workspaceReal = path.resolve(WORKSPACE_DIR);

      const isInternal = resolvedReal.startsWith(workspaceReal + path.sep) || resolvedReal === workspaceReal;
      const isAiSystem = (resolvedReal.startsWith(aiSystemReal + path.sep) || resolvedReal === aiSystemReal) && !isInternal;

      if (isAiSystem) {
        errors.push({ path: f.path, error: 'Blocked: cannot write to .ai-system/' });
        continue;
      }

      writeFile(resolvedPath, f.content);
      written.push({ path: f.path, resolved: resolvedPath, size: f.content.length });
    } catch (err) {
      errors.push({ path: f.path, error: err.message });
    }
  }

  return { written, errors };
}

async function fileWriterNode(state) {
  const startTime = Date.now();
  console.error(`[FILE-WRITER] Writing ${(state.files || []).length} files to disk`);

  try {
    const result = await writeFiles(state, state._projectRoot);

    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] [FILE-WRITER] Written: ${result.written.length}, Errors: ${result.errors.length}`;

    if (result.errors.length > 0 && result.written.length === 0) {
      return {
        validation: { status: 'invalid', errors: result.errors.map(e => e.error) },
        logs: { reviewer: ((state.logs || {}).reviewer || '') + '\n' + log + '\nErrors: ' + JSON.stringify(result.errors) },
        execution: { status: 'failed', current_node: 'file-writer' }
      };
    }

    return {
      logs: { reviewer: ((state.logs || {}).reviewer || '') + '\n' + log },
      execution: { status: 'completed', current_node: 'file-writer' }
    };
  } catch (err) {
    console.error(`[FILE-WRITER] Error: ${err.message}`);
    return {
      validation: { status: 'invalid', errors: [err.message] },
      logs: { reviewer: ((state.logs || {}).reviewer || '') + `\n[FILE-WRITER] Failed: ${err.message}` },
      execution: { status: 'failed', current_node: 'file-writer' }
    };
  }
}

module.exports = { writeFiles, fileWriterNode };

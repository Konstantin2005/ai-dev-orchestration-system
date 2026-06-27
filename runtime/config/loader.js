const fs = require('fs');
const path = require('path');

const CONFIG_DIR = '.ai-orchestrator';
const CONFIG_FILES = {
  AGENTS: 'agents.yaml',
  RUNTIME: 'runtime.yaml',
  CONNECTION: 'connection.json'
};

function configDir(rootDir) {
  return path.resolve(rootDir || process.cwd(), CONFIG_DIR);
}

function ensureConfigDir(rootDir) {
  const dir = configDir(rootDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function initConfig(rootDir) {
  const dir = ensureConfigDir(rootDir);

  const agentsConfig = {
    version: '1.0',
    agents: {
      architect: { model: 'gpt-4o-mini', provider: 'openai', enabled: true },
      backend: { model: 'claude-sonnet', provider: 'anthropic', enabled: true },
      frontend: { model: 'gemini-2.5-pro', provider: 'google', enabled: true },
      qa: { model: 'claude-sonnet', provider: 'anthropic', enabled: true },
      reviewer: { model: 'gpt-4o-mini', provider: 'openai', enabled: true }
    },
    routing: {
      strategy: 'model-based'
    }
  };

  const runtimeConfig = {
    version: '1.0',
    scheduler: {
      interval: 60000,
      maxConcurrent: 3
    },
    logging: {
      level: 'info',
      format: 'structured',
      output: ['github', 'file']
    },
    execution: {
      retryAttempts: 3,
      timeoutMs: 300000,
      mustPlanBeforeCode: true,
      mustWriteTests: true
    }
  };

  const connectionConfig = {
    repositories: [],
    defaultAdapter: 'github',
    syncInterval: 30000
  };

  writeConfigFile(dir, CONFIG_FILES.AGENTS, agentsConfig);
  writeConfigFile(dir, CONFIG_FILES.RUNTIME, runtimeConfig);
  writeConfigFile(dir, CONFIG_FILES.CONNECTION, connectionConfig);

  return { configDir: dir, files: Object.values(CONFIG_FILES) };
}

function writeConfigFile(dir, filename, content) {
  const filePath = path.join(dir, filename);
  if (filename.endsWith('.json')) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  } else {
    fs.writeFileSync(filePath, _toYAML(content), 'utf-8');
  }
  return filePath;
}

function readConfig(rootDir) {
  const dir = configDir(rootDir);
  const result = { agents: null, runtime: null, connection: null };

  const agentsPath = path.join(dir, CONFIG_FILES.AGENTS);
  const runtimePath = path.join(dir, CONFIG_FILES.RUNTIME);
  const connectionPath = path.join(dir, CONFIG_FILES.CONNECTION);

  if (fs.existsSync(agentsPath)) result.agents = _parseYAML(fs.readFileSync(agentsPath, 'utf-8'));
  if (fs.existsSync(runtimePath)) result.runtime = _parseYAML(fs.readFileSync(runtimePath, 'utf-8'));
  if (fs.existsSync(connectionPath)) result.connection = JSON.parse(fs.readFileSync(connectionPath, 'utf-8'));

  return result;
}

function addRepository(rootDir, repoUrl, adapterType) {
  const dir = configDir(rootDir);
  const connectionPath = path.join(dir, CONFIG_FILES.CONNECTION);
  let connection = { repositories: [], defaultAdapter: 'github', syncInterval: 30000 };
  if (fs.existsSync(connectionPath)) {
    connection = JSON.parse(fs.readFileSync(connectionPath, 'utf-8'));
  }
  connection.repositories.push({ url: repoUrl, adapter: adapterType || 'github', addedAt: new Date().toISOString() });
  fs.writeFileSync(connectionPath, JSON.stringify(connection, null, 2), 'utf-8');
  return connection;
}

function getRepositories(rootDir) {
  const dir = configDir(rootDir);
  const connectionPath = path.join(dir, CONFIG_FILES.CONNECTION);
  if (!fs.existsSync(connectionPath)) return [];
  const connection = JSON.parse(fs.readFileSync(connectionPath, 'utf-8'));
  return connection.repositories || [];
}

function _toYAML(obj, indent) {
  indent = indent || 0;
  const pad = '  '.repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      lines.push(_toYAML(value, indent + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      for (const item of value) {
        if (typeof item === 'object') {
          lines.push(`${pad}-`);
          lines.push(_toYAML(item, indent + 2));
        } else {
          lines.push(`${pad}- ${_yamlValue(item)}`);
        }
      }
    } else {
      lines.push(`${pad}${key}: ${_yamlValue(value)}`);
    }
  }
  return lines.join('\n');
}

function _yamlValue(value) {
  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('#') || value.includes('"')) {
      return `"${value}"`;
    }
    return value;
  }
  return String(value);
}

function _parseYAML(text) {
  const result = {};
  const lines = text.split('\n');
  const stack = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);
    const isArrayItem = trimmed.startsWith('- ');

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (isArrayItem) {
      const value = trimmed.slice(2).trim();
      const current = stack[stack.length - 1].obj;
      if (!Array.isArray(current._array)) current._array = [];
      current._array.push(_inferValue(value));
    } else {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (value === '') {
        const newObj = {};
        const current = stack[stack.length - 1].obj;
        current[key] = newObj;
        stack.push({ obj: newObj, indent });
      } else {
        const current = stack[stack.length - 1].obj;
        current[key] = _inferValue(value);
      }
    }
  }

  return result;
}

function _inferValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;
  return value.replace(/^"(.*)"$/, '$1');
}

module.exports = {
  CONFIG_DIR,
  CONFIG_FILES,
  configDir,
  ensureConfigDir,
  initConfig,
  readConfig,
  addRepository,
  getRepositories
};

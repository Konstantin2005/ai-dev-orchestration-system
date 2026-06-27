const { RepositoryAdapter, validateAdapter } = require('./interface');
const { GitHubAdapter } = require('./github');
const { LocalFSAdapter } = require('./localfs');

const ADAPTER_REGISTRY = {
  github: GitHubAdapter,
  localfs: LocalFSAdapter
};

function createAdapter(type, ...args) {
  const AdapterClass = ADAPTER_REGISTRY[type];
  if (!AdapterClass) {
    throw new Error(`Unknown adapter type: "${type}". Available: ${Object.keys(ADAPTER_REGISTRY).join(', ')}`);
  }
  const adapter = new AdapterClass(...args);
  const validation = validateAdapter(adapter);
  if (!validation.valid) {
    throw new Error(`Adapter "${type}" is missing methods: ${validation.missing.join(', ')}`);
  }
  return adapter;
}

function listAdapters() {
  return Object.keys(ADAPTER_REGISTRY);
}

module.exports = {
  RepositoryAdapter,
  validateAdapter,
  GitHubAdapter,
  LocalFSAdapter,
  ADAPTER_REGISTRY,
  createAdapter,
  listAdapters
};

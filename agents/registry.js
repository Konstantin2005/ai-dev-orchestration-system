const fs = require('fs');
const path = require('path');

class AgentRegistry {
  constructor(manifestsDir = null) {
    this._agents = new Map();
    this._manifestsDir = manifestsDir || path.join(__dirname, 'manifests');
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    await this._loadManifests();
    this._initialized = true;
  }

  async _loadManifests() {
    if (!fs.existsSync(this._manifestsDir)) {
      console.error(`[REGISTRY] Manifests directory not found: ${this._manifestsDir}`);
      return;
    }

    const files = fs.readdirSync(this._manifestsDir)
      .filter(f => f.endsWith('.json'))
      .sort();

    for (const file of files) {
      try {
        const filePath = path.join(this._manifestsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const manifest = JSON.parse(content);
        const agentId = manifest.id || path.basename(file, '.json');

        this._agents.set(agentId, {
          ...manifest,
          _manifestPath: filePath,
          _loadedAt: new Date().toISOString()
        });

        console.error(`[REGISTRY] Loaded agent: ${agentId} (${manifest.name})`);
      } catch (err) {
        console.error(`[REGISTRY] Failed to load manifest ${file}: ${err.message}`);
      }
    }

    console.error(`[REGISTRY] Loaded ${this._agents.size} agents from ${this._manifestsDir}`);
  }

  list() {
    return Array.from(this._agents.values()).map(a => this._stripInternal(a));
  }

  get(id) {
    const agent = this._agents.get(id);
    if (!agent) return null;
    return this._stripInternal(agent);
  }

  find(query) {
    const q = query.toLowerCase();
    return this.list().filter(a => {
      const searchable = [
        a.id, a.name, a.framework, a.language,
        ...(a.strengths || []),
        ...(a.weaknesses || []),
        ...(a.bestUseCases || [])
      ].join(' ').toLowerCase();
      return searchable.includes(q);
    });
  }

  compare(ids) {
    const agents = ids.map(id => this.get(id)).filter(Boolean);
    return agents;
  }

  count() {
    return this._agents.size;
  }

  _stripInternal(agent) {
    const { _manifestPath, _loadedAt, ...rest } = agent;
    return rest;
  }
}

const _defaultRegistry = new AgentRegistry();

async function initRegistry(manifestsDir) {
  const registry = manifestsDir ? new AgentRegistry(manifestsDir) : _defaultRegistry;
  await registry.init();
  return registry;
}

function getDefaultRegistry() {
  return _defaultRegistry;
}

module.exports = { AgentRegistry, initRegistry, getDefaultRegistry };

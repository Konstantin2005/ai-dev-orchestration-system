const fs = require('fs');
const path = require('path');

class GlobalState {
  constructor(statePath = null) {
    this._statePath = statePath || path.join(__dirname, '..', 'shared', 'global-state.json');
    this._state = {
      repos: {},
      activeIssues: [],
      agentPerformance: [],
      executions: [],
      benchmarks: [],
      routingDecisions: [],
      lastUpdated: null
    };
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    const dir = path.dirname(this._statePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this._statePath)) {
      try {
        const data = fs.readFileSync(this._statePath, 'utf-8');
        this._state = JSON.parse(data);
      } catch (err) {
        console.error(`[GLOBAL-STATE] Failed to load: ${err.message}`);
      }
    }
    this._initialized = true;
    console.error(`[GLOBAL-STATE] Initialized (${Object.keys(this._state.repos).length} repos, ${this._state.executions.length} executions)`);
  }

  getState() {
    return JSON.parse(JSON.stringify(this._state));
  }

  updateRepo(repoName, data) {
    this._state.repos[repoName] = {
      ...(this._state.repos[repoName] || {}),
      ...data,
      lastUpdated: new Date().toISOString()
    };
    this._state.lastUpdated = new Date().toISOString();
  }

  getRepo(repoName) {
    return this._state.repos[repoName] || null;
  }

  logExecution(execution) {
    this._state.executions.push({
      ...execution,
      timestamp: new Date().toISOString()
    });
    if (this._state.executions.length > 1000) {
      this._state.executions = this._state.executions.slice(-500);
    }
    this._state.lastUpdated = new Date().toISOString();
  }

  recordBenchmark(benchmark) {
    this._state.benchmarks.push({
      ...benchmark,
      timestamp: new Date().toISOString()
    });
    this._state.lastUpdated = new Date().toISOString();
  }

  recordAgentPerformance(agentId, metrics) {
    this._state.agentPerformance.push({
      agentId,
      ...metrics,
      timestamp: new Date().toISOString()
    });
    if (this._state.agentPerformance.length > 1000) {
      this._state.agentPerformance = this._state.agentPerformance.slice(-500);
    }
    this._state.lastUpdated = new Date().toISOString();
  }

  getAgentPerformance(agentId) {
    if (agentId) {
      return this._state.agentPerformance.filter(e => e.agentId === agentId);
    }
    return this._state.agentPerformance;
  }

  addActiveIssue(issue) {
    if (!this._state.activeIssues.find(i => i.id === issue.id)) {
      this._state.activeIssues.push({ ...issue, trackedAt: new Date().toISOString() });
    }
    this._state.lastUpdated = new Date().toISOString();
  }

  removeActiveIssue(issueId) {
    this._state.activeIssues = this._state.activeIssues.filter(i => i.id !== issueId);
    this._state.lastUpdated = new Date().toISOString();
  }

  async persist() {
    try {
      const dir = path.dirname(this._statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this._statePath, JSON.stringify(this._state, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[GLOBAL-STATE] Failed to persist: ${err.message}`);
    }
  }
}

module.exports = GlobalState;

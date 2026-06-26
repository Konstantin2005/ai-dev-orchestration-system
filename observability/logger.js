const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logDir = null) {
    this._logDir = logDir || path.join(__dirname, '..', 'observability');
    this._loggers = {};
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    if (!fs.existsSync(this._logDir)) {
      fs.mkdirSync(this._logDir, { recursive: true });
    }

    this._loggers = {
      execution: fs.createWriteStream(path.join(this._logDir, 'execution-trace.log'), { flags: 'a' }),
      agent: fs.createWriteStream(path.join(this._logDir, 'agent-performance.log'), { flags: 'a' }),
      routing: fs.createWriteStream(path.join(this._logDir, 'repo-routing.log'), { flags: 'a' }),
      cost: fs.createWriteStream(path.join(this._logDir, 'cost-tracking.log'), { flags: 'a' })
    };

    this._initialized = true;
    console.error(`[OBSERVABILITY] Logger initialized at ${this._logDir}`);
  }

  _write(loggerName, entry) {
    const stream = this._loggers[loggerName];
    if (!stream) return;
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n';
    stream.write(line);
  }

  logExecution(data) {
    this._write('execution', { type: 'execution', ...data });
  }

  logAgentPerformance(data) {
    this._write('agent', { type: 'agent_performance', ...data });
  }

  logRouting(data) {
    this._write('routing', { type: 'routing', ...data });
  }

  logCost(data) {
    this._write('cost', { type: 'cost', ...data });
  }

  logBenchmark(data) {
    this._write('execution', { type: 'benchmark', ...data });
  }

  logError(data) {
    for (const stream of Object.values(this._loggers)) {
      const line = JSON.stringify({ timestamp: new Date().toISOString(), type: 'error', ...data }) + '\n';
      stream.write(line);
    }
    console.error(`[OBSERVABILITY] Error: ${data.message || JSON.stringify(data)}`);
  }

  async shutdown() {
    for (const [name, stream] of Object.entries(this._loggers)) {
      stream.end();
    }
  }
}

module.exports = Logger;

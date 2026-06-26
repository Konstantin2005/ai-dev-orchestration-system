const { AgentAdapter } = require('../interface');
const { executeGraph, buildGraph, formatOutput } = require('../../runtime/graph/index');

class LangGraphAdapter extends AgentAdapter {
  constructor(config = {}) {
    super(config);
    this._graph = null;
  }

  async init() {
    if (this._initialized) return;
    console.error('[LANGGRAPH-ADAPTER] Building LangGraph...');
    this._graph = buildGraph();
    this._initialized = true;
    console.error('[LANGGRAPH-ADAPTER] LangGraph initialized');
  }

  async execute(task, context = {}) {
    if (!this._initialized) await this.init();

    console.error(`[LANGGRAPH-ADAPTER] Executing task: ${task.title || 'untitled'}`);

    const initialState = this._buildInitialState(task, context);
    const finalState = await this._graph.invoke(initialState);
    const output = formatOutput(finalState);

    console.error(`[LANGGRAPH-ADAPTER] Task completed with status: ${output.status}`);

    return output;
  }

  validate(output) {
    const base = super.validate(output);
    if (!base.valid) return base;

    const errors = [];
    if (!output.files || !Array.isArray(output.files)) {
      errors.push('Output must contain files array');
    }
    if (!output.logs || typeof output.logs !== 'object') {
      errors.push('Output must contain logs object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getMetadata() {
    return {
      id: 'langgraph',
      name: 'LangGraph Agent',
      framework: '@langchain/langgraph',
      language: 'javascript',
      version: '1.0.0'
    };
  }

  _buildInitialState(task, context) {
    return {
      issue: {
        title: task.title || '',
        body: task.body || '',
        number: task.number || 0,
        html_url: task.html_url || ''
      },
      execution: {
        status: 'pending',
        current_node: 'orchestrator',
        attempts: 0
      },
      architecture: {},
      files: [],
      logs: {
        orchestrator: '',
        architect: '',
        backend: '',
        frontend: '',
        qa: '',
        reviewer: ''
      },
      validation: {
        status: 'pending',
        errors: []
      },
      ...context
    };
  }
}

module.exports = { LangGraphAdapter };

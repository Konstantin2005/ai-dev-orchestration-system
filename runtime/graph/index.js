const { StateGraph, START } = require('@langchain/langgraph');

const { stateChannels, createInitialState } = require('./state');
const { orchestratorNode } = require('./nodes/orchestrator');
const { architectNode } = require('./nodes/architect');
const { backendNode } = require('./nodes/backend');
const { frontendNode } = require('./nodes/frontend');
const { qaNode } = require('./nodes/qa');
const { reviewerNode } = require('./nodes/reviewer');
const { validationNode, validateOutput } = require('./nodes/validation');
const { fileWriterNode, writeFiles } = require('./writers/file-writer');
const { legacyFallbackNode } = require('./nodes/legacy-fallback');
const { defineEdges } = require('./edges');

function buildGraph() {
  const graph = new StateGraph({
    channels: stateChannels
  });

  graph.addNode('orchestrator', orchestratorNode);
  graph.addNode('architect', architectNode);
  graph.addNode('backend', backendNode);
  graph.addNode('frontend', frontendNode);
  graph.addNode('qa', qaNode);
  graph.addNode('reviewer', reviewerNode);
  graph.addNode('validation', validationNode);
  graph.addNode('file-writer', fileWriterNode);

  defineEdges(graph);

  graph.addEdge(START, 'orchestrator');

  const app = graph.compile();
  return app;
}

async function executeGraph(issue) {
  const initialState = createInitialState(issue);

  const app = buildGraph();

  try {
    const finalState = await app.invoke(initialState);
    return formatOutput(finalState);
  } catch (err) {
    console.error(`[GRAPH] LangGraph execution error: ${err.message}`);
    throw err;
  }
}

function formatOutput(state) {
  if (state._output) {
    return state._output;
  }

  const reviewLog = state.logs.reviewer || '';
  const hasReadyForPr = reviewLog.includes('READY_FOR_PR');
  const hasChangesRequested = reviewLog.includes('CHANGES_REQUESTED');

  let status = 'CHANGES_REQUESTED';
  if (state.execution?.status === 'completed' && hasReadyForPr) {
    status = 'READY_FOR_PR';
  } else if (state.validation?.status === 'valid' && hasReadyForPr) {
    status = 'READY_FOR_PR';
  }

  return {
    architecture: {
      summary: (state.architecture || {}).summary,
      flow: (state.architecture || {}).flow,
      decisions: (state.architecture || {}).decisions || []
    },
    files: state.files || [],
    logs: {
      orchestrator: state.logs.orchestrator || '',
      architect: state.logs.architect || '',
      backend: state.logs.backend || '',
      frontend: state.logs.frontend || '',
      qa: state.logs.qa || '',
      reviewer: state.logs.reviewer || ''
    },
    status: status
  };
}

async function executeWithFallback(issue, options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  try {
    console.error('[INDEX] Starting LangGraph execution...');
    const result = await executeGraph(issue);
    console.error('[INDEX] LangGraph execution completed successfully');

    const validationResult = validateOutput(result);
    if (!validationResult.valid) {
      console.error(`[INDEX] Validation failed after graph: ${validationResult.errors.join('; ')}`);
      return { ...result, _validationErrors: validationResult.errors };
    }

    const writeResult = await writeFiles({ files: result.files }, projectRoot);
    console.error(`[INDEX] Written ${writeResult.written.length} files, ${writeResult.errors.length} errors`);

    return result;
  } catch (langGraphErr) {
    console.error('[INDEX] LangGraph execution failed, falling back to legacy pipeline');
    console.error(`[INDEX] Error: ${langGraphErr.message}`);

    try {
      const initialState = createInitialState(issue);
      const fallbackResult = await legacyFallbackNode(initialState);
      const output = formatOutput(fallbackResult);
      console.error('[INDEX] Legacy fallback completed');

      const validationResult = validateOutput(output);
      if (!validationResult.valid) {
        console.error(`[INDEX] Validation failed after fallback: ${validationResult.errors.join('; ')}`);
      }

      const writeResult = await writeFiles({ files: output.files }, projectRoot);
      console.error(`[INDEX] Fallback written ${writeResult.written.length} files`);

      return output;
    } catch (legacyErr) {
      console.error(`[INDEX] Legacy fallback also failed: ${legacyErr.message}`);
      throw new Error(`Both LangGraph and legacy pipeline failed: ${langGraphErr.message} | ${legacyErr.message}`);
    }
  }
}

async function execute(issue, options) {
  return executeWithFallback(issue, options);
}

async function execute(issue) {
  return executeWithFallback(issue);
}

module.exports = { buildGraph, execute, executeGraph, formatOutput };

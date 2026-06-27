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
const { prCreateNode } = require('./nodes/pr-create');
const { mergeNode } = require('./nodes/merge');
const { executionLoopNode } = require('./nodes/execution-loop');
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
  graph.addNode('validate-output', validationNode);
  graph.addNode('file-writer', fileWriterNode);
  graph.addNode('pr-create', prCreateNode);
  graph.addNode('merge', mergeNode);
  graph.addNode('execution-loop', executionLoopNode);

  defineEdges(graph);

  graph.addEdge(START, 'orchestrator');

  const app = graph.compile();
  return app;
}

function generateRunId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function executeGraph(issue, runId) {
  const initialState = createInitialState(issue);

  const app = buildGraph();

  try {
    const finalState = await app.invoke(initialState);
    const output = formatOutput(finalState);
    return { output, trace: finalState.execution?.trace || [] };
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

async function execute(issue, options = {}) {
  const runId = generateRunId();
  const projectRoot = options.projectRoot || process.cwd();
  const trace = [];

  console.error(`[INDEX] Run ${runId} started for issue #${issue.id}`);

  const traceEntry = (step, status, startedAt, finishedAt, error) => ({
    step, status, startedAt, finishedAt, error: error || null
  });

  try {
    const stepStarted = new Date().toISOString();

    console.error(`[INDEX] Starting LangGraph execution...`);
    const { output, trace: graphTrace } = await executeGraph(issue, runId);

    const stepFinished = new Date().toISOString();
    trace.push(traceEntry('graph', 'passed', stepStarted, stepFinished));

    console.error(`[INDEX] LangGraph execution completed with status: ${output.status}`);

    const validationStarted = new Date().toISOString();
    const validationResult = validateOutput(output);
    const validationFinished = new Date().toISOString();

    if (!validationResult.valid) {
      trace.push(traceEntry('validation', 'failed', validationStarted, validationFinished,
        validationResult.errors.join('; ')));
      return {
        result: output,
        status: 'FAILED',
        failedStep: 'validation',
        error: validationResult.errors.join('; '),
        trace,
        runId
      };
    }

    trace.push(traceEntry('validation', 'passed', validationStarted, validationFinished));

    const writeStarted = new Date().toISOString();
    const writeResult = await writeFiles({ files: output.files }, projectRoot);
    const writeFinished = new Date().toISOString();

    if (writeResult.errors.length > 0 && writeResult.written.length === 0) {
      trace.push(traceEntry('file-writer', 'failed', writeStarted, writeFinished,
        writeResult.errors.map(e => e.error).join('; ')));
      return {
        result: output,
        status: 'FAILED',
        failedStep: 'file-writer',
        error: writeResult.errors.map(e => e.error).join('; '),
        trace,
        runId
      };
    }

    trace.push(traceEntry('file-writer', 'passed', writeStarted, writeFinished,
      writeResult.errors.length > 0 ? `${writeResult.errors.length} file(s) had errors` : null));

    console.error(`[INDEX] Run ${runId} completed successfully`);

    return {
      result: output,
      status: 'DONE',
      failedStep: null,
      error: null,
      trace,
      runId,
      written: writeResult.written,
      writeErrors: writeResult.errors
    };

  } catch (err) {
    console.error(`[INDEX] Run ${runId} failed: ${err.message}`);
    trace.push(traceEntry('graph', 'failed', null, new Date().toISOString(), err.message));

    return {
      result: null,
      status: 'FAILED',
      failedStep: 'graph',
      error: err.message,
      trace,
      runId
    };
  }
}

module.exports = { buildGraph, execute, executeGraph, formatOutput };

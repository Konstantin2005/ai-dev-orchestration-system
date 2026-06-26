const { END } = require('@langchain/langgraph');

function defineEdges(graph) {
  graph.addEdge('orchestrator', 'architect');

  graph.addEdge('architect', 'backend');
  graph.addEdge('architect', 'frontend');

  graph.addEdge('backend', 'qa');
  graph.addEdge('frontend', 'qa');

  graph.addConditionalEdges('qa', qaRouter);

  graph.addConditionalEdges('reviewer', reviewerRouter);

  return graph;
}

function qaRouter(state) {
  const validation = state.validation || { status: 'pending', errors: [] };
  const execution = state.execution || {};

  if (execution.status === 'failed' && execution.current_node === 'qa') {
    console.error(`[EDGES] QA failed, routing to backend for fix (attempt: ${execution.attempts || 0})`);
    return 'backend';
  }

  if (validation.status === 'invalid' || validation.status === 'failed') {
    const attempts = execution.attempts || 0;
    if (attempts < 2) {
      console.error(`[EDGES] QA invalid (${validation.errors.length} errors), routing to backend for fix (attempt ${attempts + 1})`);
      return 'backend';
    }
    console.error(`[EDGES] QA invalid after max attempts, routing to reviewer anyway`);
    return 'reviewer';
  }

  console.error('[EDGES] QA valid, routing to reviewer');
  return 'reviewer';
}

function reviewerRouter(state) {
  if (state._output && state._output.status === 'READY_FOR_PR') {
    console.error('[EDGES] Reviewer verdict: READY_FOR_PR');
    return END;
  }

  if (state._output && state._output.status === 'CHANGES_REQUESTED') {
    console.error('[EDGES] Reviewer verdict: CHANGES_REQUESTED, routing back to architect');
    return 'architect';
  }

  const logs = state.logs || {};
  const reviewerLog = logs.reviewer || '';

  if (reviewerLog.includes('READY_FOR_PR') || reviewerLog.includes('ready')) {
    console.error('[EDGES] Reviewer log indicates READY_FOR_PR');
    return END;
  }

  if (reviewerLog.includes('CHANGES_REQUESTED') || reviewerLog.includes('changes')) {
    console.error('[EDGES] Reviewer log indicates CHANGES_REQUESTED, routing back to architect');
    return 'architect';
  }

  console.error('[EDGES] Reviewer verdict unclear, defaulting to END');
  return END;
}

module.exports = { defineEdges, qaRouter, reviewerRouter };

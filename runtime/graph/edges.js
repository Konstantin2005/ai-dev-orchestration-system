const { END } = require('@langchain/langgraph');

function defineEdges(graph) {
  graph.addEdge('orchestrator', 'architect');

  graph.addEdge('architect', 'backend');
  graph.addEdge('architect', 'frontend');

  graph.addEdge('backend', 'qa');
  graph.addEdge('frontend', 'qa');

  graph.addConditionalEdges('qa', qaRouter);

  graph.addConditionalEdges('execution-loop', executionLoopRouter);

  graph.addConditionalEdges('reviewer', reviewerRouter);

  graph.addConditionalEdges('validate-output', validationRouter);

  graph.addConditionalEdges('file-writer', fileWriterRouter);

  graph.addConditionalEdges('pr-create', prRouter);

  graph.addConditionalEdges('merge', mergeRouter);

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

  console.error('[EDGES] QA valid, routing to execution-loop');
  return 'execution-loop';
}

function executionLoopRouter(state) {
  const execution = state.execution || {};
  const feedback = state._executionFeedback;

  if (execution.status === 'completed' || execution.status === 'skipped') {
    console.error('[EDGES] Execution passed, routing to reviewer');
    return 'reviewer';
  }

  if (execution.status === 'failed' && feedback) {
    const attempts = state.pr?.fixAttempts || 0;
    if (attempts < 3) {
      console.error(`[EDGES] Execution failed, routing to backend for fix (attempt ${attempts + 1})`);
      return 'backend';
    }
    console.error('[EDGES] Max execution fix attempts reached, routing to reviewer anyway');
    return 'reviewer';
  }

  console.error('[EDGES] Execution status unclear, routing to reviewer');
  return 'reviewer';
}

function reviewerRouter(state) {
  const review = state.review || { status: 'pending', verdict: null };
  const fixAttempts = state.pr?.fixAttempts || 0;

  if (state._output && state._output.status === 'READY_FOR_PR') {
    console.error('[EDGES] Reviewer verdict: READY_FOR_PR → validation');
    return 'validate-output';
  }

  if (state._output && state._output.status === 'CHANGES_REQUESTED') {
    if (fixAttempts < 3) {
      console.error(`[EDGES] CHANGES_REQUESTED, routing to backend for fix (attempt ${fixAttempts + 1})`);
      return 'backend';
    }
    console.error('[EDGES] Max fix attempts reached, routing to validation anyway');
    return 'validate-output';
  }

  const logs = state.logs || {};
  const reviewerLog = logs.reviewer || '';

  if (reviewerLog.includes('READY_FOR_PR') || reviewerLog.includes('ready')) {
    console.error('[EDGES] Reviewer log indicates READY_FOR_PR → validation');
    return 'validate-output';
  }

  if (reviewerLog.includes('CHANGES_REQUESTED') || reviewerLog.includes('changes')) {
    if (fixAttempts < 3) {
      console.error(`[EDGES] CHANGES_REQUESTED, routing to backend for fix (attempt ${fixAttempts + 1})`);
      return 'backend';
    }
    console.error('[EDGES] Max fix attempts reached, routing to validation anyway');
    return 'validate-output';
  }

  console.error('[EDGES] Reviewer verdict unclear, defaulting to validation');
  return 'validate-output';
}

function validationRouter(state) {
  const validation = state.validation || { status: 'pending', errors: [] };

  if (validation.status === 'valid') {
    console.error('[EDGES] Validation PASSED → file-writer');
    return 'file-writer';
  }

  if (validation.status === 'invalid' || validation.status === 'failed') {
    console.error(`[EDGES] Validation FAILED (${validation.errors.length} errors), stopping pipeline`);
    return END;
  }

  console.error('[EDGES] Validation pending, stopping pipeline');
  return END;
}

function fileWriterRouter(state) {
  const pr = state.pr || { status: 'none' };

  console.error(`[EDGES] File-writer done, routing to ${pr.status === 'merged' ? 'end' : 'pr-create'}`);
  return pr.status === 'merged' ? END : 'pr-create';
}

function prRouter(state) {
  const pr = state.pr || { status: 'none' };

  if (pr.status === 'open') {
    console.error('[EDGES] PR open, routing to merge');
    return 'merge';
  }

  console.error('[EDGES] PR failed or unknown, ending pipeline');
  return END;
}

function mergeRouter(state) {
  const pr = state.pr || { status: 'none' };

  if (pr.status === 'merged') {
    console.error('[EDGES] PR merged, pipeline complete');
    return END;
  }

  console.error('[EDGES] Merge failed, ending pipeline');
  return END;
}

module.exports = { defineEdges, qaRouter, executionLoopRouter, reviewerRouter, validationRouter, fileWriterRouter, prRouter, mergeRouter };

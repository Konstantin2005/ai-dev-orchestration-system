async function mergeNode(state) {
  const startTime = Date.now();
  console.error(`[MERGE] Node started at ${new Date().toISOString()}`);

  try {
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'merge',
      timestamp,
      duration: Date.now() - startTime,
      status: 'success'
    };

    console.error(`[MERGE] PR merged: ${state.pr?.url || 'N/A'}`);

    return {
      pr: { url: state.pr?.url, status: 'merged', fixAttempts: state.pr?.fixAttempts || 0 },
      execution: {
        status: 'completed',
        current_node: 'merge',
        attempts: state.execution?.attempts || 0,
        trace: [...(state.execution?.trace || []), executionTrace]
      }
    };
  } catch (err) {
    console.error(`[MERGE] Error: ${err.message}`);
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'merge',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      pr: { url: state.pr?.url, status: 'failed', fixAttempts: state.pr?.fixAttempts || 0 },
      execution: {
        status: 'failed',
        current_node: 'merge',
        attempts: (state.execution?.attempts || 0) + 1,
        trace: [...(state.execution?.trace || []), executionTrace]
      }
    };
  }
}

module.exports = { mergeNode };

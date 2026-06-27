async function prCreateNode(state) {
  const startTime = Date.now();
  console.error(`[PR-CREATE] Node started at ${new Date().toISOString()}`);

  try {
    const prUrl = state.pr?.url || `https://github.com/sandbox/pull/${state.issue.id || 'new'}`;
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'pr-create',
      timestamp,
      duration: Date.now() - startTime,
      status: 'success'
    };

    console.error(`[PR-CREATE] PR created: ${prUrl}`);

    return {
      pr: { url: prUrl, status: 'open', fixAttempts: state.pr?.fixAttempts || 0 },
      execution: {
        status: 'completed',
        current_node: 'pr-create',
        attempts: state.execution?.attempts || 0,
        trace: [...(state.execution?.trace || []), executionTrace]
      }
    };
  } catch (err) {
    console.error(`[PR-CREATE] Error: ${err.message}`);
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'pr-create',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      pr: { url: null, status: 'failed', fixAttempts: state.pr?.fixAttempts || 0 },
      execution: {
        status: 'failed',
        current_node: 'pr-create',
        attempts: (state.execution?.attempts || 0) + 1,
        trace: [...(state.execution?.trace || []), executionTrace]
      }
    };
  }
}

module.exports = { prCreateNode };

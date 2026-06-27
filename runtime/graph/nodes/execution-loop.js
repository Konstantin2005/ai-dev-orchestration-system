const { executeCode, destroySandboxDir } = require('../../sandbox/executor');

const MAX_ITERATIONS = 3;

async function executionLoopNode(state) {
  const startTime = Date.now();
  console.error(`[EXECUTION-LOOP] Node started at ${new Date().toISOString()}`);

  const execution = state.execution || { status: 'idle', current_node: null, attempts: 0, trace: [] };

  if (state.execution && state.execution.status === 'failed' && state.execution.current_node !== 'execution-loop') {
    console.error('[EXECUTION-LOOP] Skipping due to prior node failure');
    return {};
  }

  try {
    const files = state.files || [];
    if (files.length === 0) {
      console.error('[EXECUTION-LOOP] No files to execute');
      const traceEntry = {
        node: 'execution-loop',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        status: 'skipped',
        reason: 'no files'
      };
      return {
        execution: {
          status: 'completed',
          current_node: 'execution-loop',
          attempts: execution.attempts || 0,
          trace: [...(execution.trace || []), traceEntry]
        }
      };
    }

    const targetFiles = files.filter(f => f.path.endsWith('.js') && f.content);
    if (targetFiles.length === 0) {
      console.error('[EXECUTION-LOOP] No executable files found');
      const traceEntry = {
        node: 'execution-loop',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        status: 'skipped',
        reason: 'no executable files'
      };
      return {
        execution: {
          status: 'completed',
          current_node: 'execution-loop',
          attempts: execution.attempts || 0,
          trace: [...(execution.trace || []), traceEntry]
        }
      };
    }

    const results = [];
    let allPassed = false;
    let finalIteration = 0;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      finalIteration = iteration + 1;
      console.error(`[EXECUTION-LOOP] Iteration ${finalIteration}/${MAX_ITERATIONS}`);

      // PLAN: Determine which files to execute this iteration
      console.error(`[EXECUTION-LOOP] Plan: execute ${targetFiles.length} file(s)`);

      // ACT: Execute all target files in sandbox
      const iterResults = [];
      for (const file of targetFiles) {
        console.error(`[EXECUTION-LOOP] Act: running ${file.path}`);
        const result = executeCode(file.content, { language: 'js', timeout: 10000 });
        iterResults.push({
          iteration: finalIteration,
          file: file.path,
          success: result.success,
          stdout: (result.stdout || '').substring(0, 2000),
          stderr: (result.stderr || '').substring(0, 2000),
          exitCode: result.exitCode,
          duration: result.duration
        });
      }
      results.push(...iterResults);

      // OBSERVE: Collect and log results
      const passed = iterResults.filter(r => r.success);
      const failed = iterResults.filter(r => !r.success);
      console.error(`[EXECUTION-LOOP] Observe: ${passed.length} passed, ${failed.length} failed`);

      for (const f of failed) {
        console.error(`[EXECUTION-LOOP] Observe: ${f.file} failed (exit ${f.exitCode}): ${f.stderr.substring(0, 150)}`);
      }

      // REFLECT: Determine if all passed or if retry needed
      allPassed = failed.length === 0;

      if (allPassed) {
        console.error('[EXECUTION-LOOP] Reflect: all files passed, exiting loop');
        break;
      }

      // RETRY: If iterations remain and files failed, loop continues
      if (iteration < MAX_ITERATIONS - 1) {
        console.error(`[EXECUTION-LOOP] Retry: ${failed.length} file(s) failed, retrying (attempt ${finalIteration + 1}/${MAX_ITERATIONS})`);
      } else {
        console.error(`[EXECUTION-LOOP] Retry: max iterations (${MAX_ITERATIONS}) reached`);
      }
    }

    const feedback = results
      .filter(r => !r.success)
      .map(r => ({
        file: r.file,
        error: r.stderr.substring(0, 500),
        exitCode: r.exitCode
      }));

    const timestamp = new Date().toISOString();
    const traceEntry = {
      node: 'execution-loop',
      timestamp,
      duration: Date.now() - startTime,
      status: allPassed ? 'success' : 'failed',
      iterations: finalIteration,
      pattern: {
        plan: true,
        act: results.length,
        observe: results.length,
        reflect: allPassed,
        retry: finalIteration > 1
      },
      results: results.map(r => ({ file: r.file, success: r.success, duration: r.duration }))
    };

    return {
      execution: {
        status: allPassed ? 'completed' : 'failed',
        current_node: 'execution-loop',
        attempts: execution.attempts || 0,
        trace: [...(execution.trace || []), traceEntry],
        executionResults: results
      },
      _executionFeedback: feedback.length > 0 ? feedback : null
    };

  } catch (err) {
    console.error(`[EXECUTION-LOOP] Error: ${err.message}`);
    const timestamp = new Date().toISOString();
    const traceEntry = {
      node: 'execution-loop',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      execution: {
        status: 'failed',
        current_node: 'execution-loop',
        attempts: (execution.attempts || 0) + 1,
        trace: [...(execution.trace || []), traceEntry]
      }
    };
  }
}

module.exports = { executionLoopNode };

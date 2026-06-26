const { execSync } = require('child_process');
const path = require('path');

const LEGACY_SCRIPT = path.resolve(__dirname, '..', '..', 'runtime', 'legacy-pipeline.sh');

async function legacyFallbackNode(state) {
  const startTime = Date.now();

  console.error('[LEGACY-FALLBACK] Node started - invoking legacy curl-based pipeline');
  console.error(`[LEGACY-FALLBACK] Issue: #${state.issue.id} - ${state.issue.title}`);

  try {
    const workspacePrefix = `workspace/issues/${state.issue.id}-${state.issue.slug}`;

    const issuePayload = JSON.stringify({
      id: state.issue.id,
      title: state.issue.title,
      slug: state.issue.slug,
      body: state.issue.body
    });

    let output;
    try {
      output = execSync(
        `bash "${LEGACY_SCRIPT}" "${workspacePrefix}"`,
        {
          input: issuePayload,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
          timeout: 180000,
          env: { ...process.env, ISSUE_PAYLOAD: issuePayload }
        }
      );
    } catch (execErr) {
      if (execErr.stdout) {
        output = execErr.stdout;
      } else {
        throw execErr;
      }
    }

    let result;
    try {
      result = JSON.parse(output.trim());
    } catch (parseErr) {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Legacy pipeline returned invalid JSON: ${parseErr.message}`);
      }
    }

    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] [LEGACY-FALLBACK] Pipeline completed\n  Status: ${result.status || 'unknown'}\n  Files: ${(result.files || []).length}\n  Architecture: ${result.architecture ? 'present' : 'missing'}`;

    const executionTrace = {
      node: 'legacy-fallback',
      timestamp,
      duration: Date.now() - startTime,
      status: 'success',
      filesGenerated: (result.files || []).length
    };

    return {
      architecture: result.architecture || state.architecture,
      files: result.files || state.files || [],
      logs: {
        orchestrator: (state.logs.orchestrator || '') + `\n[${timestamp}] [FALLBACK] Orchestrator completed via legacy pipeline`,
        reviewer: `[${timestamp}] [LEGACY-FALLBACK] Pipeline completed with status: ${result.status || 'unknown'}`
      },
      validation: {
        status: result.status === 'READY_FOR_PR' ? 'valid' : 'invalid',
        errors: result.status === 'CHANGES_REQUESTED' ? ['Reviewer requested changes'] : []
      },
      execution: {
        status: 'completed',
        current_node: 'legacy-fallback',
        attempts: 0,
        trace: [...(state.execution.trace || []), executionTrace]
      },
      _output: result.status ? result : undefined
    };

  } catch (err) {
    console.error(`[LEGACY-FALLBACK] Error: ${err.message}`);

    const timestamp = new Date().toISOString();
    const executionTrace = {
      node: 'legacy-fallback',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      logs: {
        reviewer: `[${timestamp}] [LEGACY-FALLBACK] Critical failure: ${err.message}`
      },
      execution: {
        status: 'failed',
        current_node: 'legacy-fallback',
        attempts: 1,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };
  }
}

module.exports = { legacyFallbackNode };

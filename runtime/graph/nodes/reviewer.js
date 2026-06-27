const { callOpenAIJSON } = require('../openai');
const { PR_STATES, VALID_TRANSITIONS, canTransition } = require('../../github/pr-state');

const REVIEWER_SYSTEM_PROMPT = `You are the Code Reviewer AI — SYSTEM GATEKEEPER for a multi-agent engineering system.
You are the ONLY authority that can approve a merge.

Given the complete execution state, perform a review and return structured JSON ONLY:

{
  "status": "PASSED" | "FAILED" | "FIX_REQUIRED",
  "reviewSummary": "string",
  "issues": [
    {
      "type": "logic | test | security | architecture | execution",
      "severity": "low | medium | high | critical",
      "description": "string",
      "required_fix": "string",
      "file_path": "string | null"
    }
  ],
  "next_action": "approve | request_changes | trigger_fix_loop",
  "execution_verified": true | false,
  "test_results_verified": true | false,
  "files": [
    {
      "path": "04-code-reviewer/review.md",
      "content": "# Code Review\\n..."
    }
  ],
  "log": "Reasoning log"
}

RULES:
- PASSED: All checks pass. execution_verified=true, test_results_verified=true. next_action=approve.
- FAILED: Critical issues. next_action=trigger_fix_loop. System must re-execute.
- FIX_REQUIRED: Minor issues. next_action=request_changes. System must fix then re-review.
- PR without execution data is INVALID — always return FAILED.
- You CANNOT approve if execution_verified=false.
- You CANNOT approve if test_results_verified=false.
- Be thorough: security, architecture, bugs, execution logs, test results, production readiness.`;

async function reviewerNode(state) {
  const startTime = Date.now();
  console.error(`[REVIEWER] Gatekeeper review started at ${new Date().toISOString()}`);

  try {
    const hasExecutionData = state.execution && state.execution.status === 'completed'
      && state._output && state._output._executionLog;

    const filesContext = (state.files || []).map(f =>
      `File: ${f.path}\n\`\`\`\n${f.content.substring(0, 1000)}\n\`\`\``
    ).join('\n\n---\n\n');

    const architectureContext = `Summary: ${state.architecture.summary || 'N/A'}\nFlow: ${state.architecture.flow || 'N/A'}\nDecisions: ${(state.architecture.decisions || []).join(', ')}`;

    const validationContext = `Status: ${state.validation.status}\nErrors: ${(state.validation.errors || []).join('; ') || 'None'}`;

    const executionContext = hasExecutionData
      ? `Execution log: ${state._output._executionLog.substring(0, 2000)}`
      : 'WARNING: No execution data found. PR IS INVALID.';

    const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\nArchitecture:\n${architectureContext}\n\nValidation:\n${validationContext}\n\nExecution:\n${executionContext}\n\nFiles (${(state.files || []).length} total):\n${filesContext}\n\nLogs:\nOrchestrator: ${(state.logs.orchestrator || '').substring(0, 500)}\nArchitect: ${(state.logs.architect || '').substring(0, 500)}\nBackend: ${(state.logs.backend || '').substring(0, 500)}\nFrontend: ${(state.logs.frontend || '').substring(0, 500)}\nQA: ${(state.logs.qa || '').substring(0, 500)}`;

    const result = await callOpenAIJSON(REVIEWER_SYSTEM_PROMPT, userInput, {
      temperature: 0.3,
      maxTokens: 4000
    });

    if (!hasExecutionData) {
      result.status = 'FAILED';
      result.next_action = 'trigger_fix_loop';
      result.execution_verified = false;
      result.test_results_verified = false;
      result.issues = result.issues || [];
      result.issues.unshift({
        type: 'execution',
        severity: 'critical',
        description: 'PR has no execution data. All PRs must include execution logs, test results, and validation report.',
        required_fix: 'Re-run pipeline with sandbox execution enabled. Ensure execution log is captured.'
      });
    }

    const reviewStatus = result.status === 'PASSED' ? 'READY_FOR_PR' : 'CHANGES_REQUESTED';
    const gatekeeperStatus = result.status;
    const nextAction = result.next_action || 'request_changes';

    const reviewFiles = (result.files || []).map(f => ({
      path: f.path.startsWith('04-code-reviewer/') ? f.path : `04-code-reviewer/${f.path}`,
      content: f.content
    }));

    const timestamp = new Date().toISOString();
    const reviewerLog = [
      `[${timestamp}] [REVIEWER] Verdict: ${gatekeeperStatus}`,
      `Execution verified: ${result.execution_verified}`,
      `Tests verified: ${result.test_results_verified}`,
      `Next action: ${nextAction}`,
      '',
      result.reviewSummary || '',
      '',
      'Issues:',
      ...(result.issues || []).map((iss, i) =>
        `  ${i+1}. [${iss.severity}][${iss.type}] ${iss.description} | fix: ${iss.required_fix}`
      ),
      '',
      `Log: ${result.log || ''}`
    ].join('\n');

    const executionTrace = {
      node: 'reviewer-gatekeeper',
      timestamp,
      duration: Date.now() - startTime,
      status: gatekeeperStatus,
      nextAction,
      issueCount: (result.issues || []).length,
      executionVerified: result.execution_verified,
      testsVerified: result.test_results_verified
    };

    const prState = gatekeeperStatus === 'PASSED' ? PR_STATES.PASSED
      : gatekeeperStatus === 'FAILED' ? PR_STATES.FAILED
      : PR_STATES.FIX_REQUIRED;

    const outputSchema = {
      architecture: state.architecture,
      files: [...(state.files || []), ...reviewFiles],
      logs: {
        orchestrator: state.logs.orchestrator || '',
        architect: state.logs.architect || '',
        backend: state.logs.backend || '',
        frontend: state.logs.frontend || '',
        qa: state.logs.qa || '',
        reviewer: reviewerLog
      },
      status: reviewStatus,
      _prState: prState,
      _reviewGate: {
        status: gatekeeperStatus,
        nextAction,
        executionVerified: result.execution_verified,
        testsVerified: result.test_results_verified,
        issueCount: (result.issues || []).length
      }
    };

    return {
      files: [...(state.files || []), ...reviewFiles],
      logs: { reviewer: reviewerLog },
      execution: {
        status: 'completed',
        current_node: 'reviewer',
        attempts: state.execution.attempts || 0,
        trace: [...(state.execution.trace || []), executionTrace]
      },
      _output: outputSchema,
      _prState: prState,
      _reviewGate: outputSchema._reviewGate
    };

  } catch (err) {
    console.error(`[REVIEWER-GATEKEEPER] Error: ${err.message}`);
    const timestamp = new Date().toISOString();
    const executionTrace = {
      node: 'reviewer-gatekeeper',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      logs: { reviewer: `[${timestamp}] [REVIEWER] Failed: ${err.message}` },
      execution: {
        status: 'failed',
        current_node: 'reviewer',
        attempts: (state.execution.attempts || 0) + 1,
        trace: [...(state.execution.trace || []), executionTrace]
      },
      _prState: PR_STATES.FAILED,
      _reviewGate: { status: 'FAILED', nextAction: 'trigger_fix_loop', executionVerified: false, testsVerified: false }
    };
  }
}

function reviewerRouter(state) {
  const prState = state._prState || 'open';
  const reviewGate = state._reviewGate || {};
  const fixAttempts = state.execution?.trace?.find(t => t.node === 'file-writer')?.fixAttempts || 0;

  console.error(`[EDGES] Reviewer router: pr=${prState}, gate=${reviewGate.status}, attempts=${fixAttempts}`);

  if (reviewGate.status === 'FAILED' || reviewGate.status === 'FIX_REQUIRED') {
    if (fixAttempts >= MAX_FIX_ATTEMPTS) {
      console.error(`[EDGES] Max fix attempts reached, ending pipeline`);
      return END;
    }
    console.error(`[EDGES] Submitting to file-writer for fix (attempt ${fixAttempts + 1})`);
    return 'file-writer';
  }

  if (reviewGate.status === 'PASSED' || prState === 'passed' || prState === 'merge-ready') {
    console.error('[EDGES] Review PASSED, routing to merge');
    return 'merge';
  }

  console.error('[EDGES] Reviewer pending, keeping in loop');
  return 'orchestrator';
}

module.exports = { reviewerNode, reviewerRouter };

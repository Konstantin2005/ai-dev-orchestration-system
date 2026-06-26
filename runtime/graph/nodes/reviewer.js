const { callOpenAIJSON } = require('../openai');

const REVIEWER_SYSTEM_PROMPT = `You are the Code Reviewer AI for a multi-agent software engineering system.
Given the complete execution state, perform a final review and provide a verdict.

Respond with JSON ONLY in this exact format:
{
  "status": "READY_FOR_PR" or "CHANGES_REQUESTED",
  "reviewSummary": "Summary of the review findings",
  "issues": [],
  "files": [
    {
      "path": "04-code-reviewer/review.md",
      "content": "# Code Review\\n..."
    }
  ],
  "log": "Reasoning log explaining the final verdict"
}

Rules:
- READY_FOR_PR: All checks pass, code is production-ready
- CHANGES_REQUESTED: Issues found that need addressing before PR
- Include at least 1 review file in 04-code-reviewer/
- Be thorough: security, architecture, bugs, improvements, production readiness`;

async function reviewerNode(state) {
  const startTime = Date.now();

  console.error(`[REVIEWER] Node started at ${new Date().toISOString()}`);

  try {
    const filesContext = (state.files || []).map(f =>
      `File: ${f.path}\n\`\`\`\n${f.content.substring(0, 1000)}\n\`\`\``
    ).join('\n\n---\n\n');

    const architectureContext = `Summary: ${state.architecture.summary || 'N/A'}\nFlow: ${state.architecture.flow || 'N/A'}\nDecisions: ${(state.architecture.decisions || []).join(', ')}`;

    const validationContext = `Status: ${state.validation.status}\nErrors: ${(state.validation.errors || []).join('; ') || 'None'}`;

    const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\nArchitecture:\n${architectureContext}\n\nValidation:\n${validationContext}\n\nFiles (${(state.files || []).length} total):\n${filesContext}\n\nLogs:\nOrchestrator: ${(state.logs.orchestrator || '').substring(0, 500)}\nArchitect: ${(state.logs.architect || '').substring(0, 500)}\nBackend: ${(state.logs.backend || '').substring(0, 500)}\nFrontend: ${(state.logs.frontend || '').substring(0, 500)}\nQA: ${(state.logs.qa || '').substring(0, 500)}`;

    const result = await callOpenAIJSON(REVIEWER_SYSTEM_PROMPT, userInput, {
      temperature: 0.3,
      maxTokens: 4000
    });

    const reviewStatus = result.status === 'READY_FOR_PR' ? 'READY_FOR_PR' : 'CHANGES_REQUESTED';

    const reviewFiles = (result.files || []).map(f => ({
      path: f.path.startsWith('04-code-reviewer/') ? f.path : `04-code-reviewer/${f.path}`,
      content: f.content
    }));

    const timestamp = new Date().toISOString();
    const reviewerLog = `[${timestamp}] [REVIEWER] Verdict: ${reviewStatus}\n${result.reviewSummary || ''}\nIssues: ${(result.issues || []).join('; ') || 'None'}\nLog: ${result.log || 'No additional log'}`;

    const executionTrace = {
      node: 'reviewer',
      timestamp,
      duration: Date.now() - startTime,
      status: reviewStatus === 'READY_FOR_PR' ? 'success' : 'changes_requested',
      reviewSummary: result.reviewSummary
    };

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
      status: reviewStatus
    };

    return {
      files: [...(state.files || []), ...reviewFiles],
      logs: {
        reviewer: reviewerLog
      },
      execution: {
        status: 'completed',
        current_node: 'reviewer',
        attempts: state.execution.attempts || 0,
        trace: [...(state.execution.trace || []), executionTrace]
      },
      _output: outputSchema
    };

  } catch (err) {
    console.error(`[REVIEWER] Error: ${err.message}`);
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'reviewer',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      logs: {
        reviewer: `[${timestamp}] [REVIEWER] Failed: ${err.message}`
      },
      execution: {
        status: 'failed',
        current_node: 'reviewer',
        attempts: (state.execution.attempts || 0) + 1,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };
  }
}

module.exports = { reviewerNode };

const { callOpenAI } = require('../openai');

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Orchestrator AI for a multi-agent software engineering system.
Your role is to initialize the pipeline execution context based on a GitHub Issue.
Generate a concise orchestrator log entry describing:
1. The issue summary
2. The pipeline that will be executed
3. Initial status
Return ONLY a plain text log entry, no JSON.`;

async function orchestratorNode(state) {
  const startTime = Date.now();

  console.error(`[ORCHESTRATOR] Node started at ${new Date().toISOString()}`);
  console.error(`[ORCHESTRATOR] Issue: #${state.issue.id} - ${state.issue.title}`);

  try {
    const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\n${state.issue.body}\n\nSlug: ${state.issue.slug}`;

    const logEntry = await callOpenAI(ORCHESTRATOR_SYSTEM_PROMPT, userInput, {
      temperature: 0.3,
      maxTokens: 1000
    });

    const timestamp = new Date().toISOString();
    const orchestratorLog = `[${timestamp}] [ORCHESTRATOR] Pipeline initiated\n${logEntry}`;

    const executionTrace = {
      node: 'orchestrator',
      timestamp,
      duration: Date.now() - startTime,
      status: 'success'
    };

    return {
      logs: {
        orchestrator: orchestratorLog
      },
      execution: {
        status: 'running',
        current_node: 'orchestrator',
        attempts: 0,
        trace: [executionTrace]
      }
    };

  } catch (err) {
    console.error(`[ORCHESTRATOR] Error: ${err.message}`);
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'orchestrator',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      logs: {
        orchestrator: `[${timestamp}] [ORCHESTRATOR] Failed: ${err.message}`
      },
      execution: {
        status: 'failed',
        current_node: 'orchestrator',
        attempts: 1,
        trace: [executionTrace]
      }
    };
  }
}

module.exports = { orchestratorNode };

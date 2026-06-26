const { callOpenAIJSON } = require('../openai');

const ARCHITECT_SYSTEM_PROMPT = `You are the Architect AI for a multi-agent software engineering system.
Given a GitHub Issue, generate an architecture plan.

Respond with JSON ONLY in this exact format:
{
  "summary": "Brief architecture summary",
  "flow": "Step-by-step execution flow",
  "decisions": ["Decision 1", "Decision 2"],
  "log": "Reasoning log explaining the architecture choices"
}

Rules:
- summary must be 2-3 sentences
- flow must describe the step-by-step process
- decisions must be 2-5 key architectural decisions
- Be specific to the issue, not generic`;

async function architectNode(state) {
  const startTime = Date.now();

  console.error(`[ARCHITECT] Node started at ${new Date().toISOString()}`);
  console.error(`[ARCHITECT] Working on issue: ${state.issue.title}`);

  if (state.execution.status === 'failed' && state.execution.current_node !== 'architect') {
    console.error('[ARCHITECT] Skipping due to prior node failure');
    return {};
  }

  try {
    const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\n${state.issue.body}\n\nSlug: ${state.issue.slug}`;

    const result = await callOpenAIJSON(ARCHITECT_SYSTEM_PROMPT, userInput, {
      temperature: 0.3,
      maxTokens: 2000
    });

    const timestamp = new Date().toISOString();
    const architectLog = `[${timestamp}] [ARCHITECT] Architecture generated\nSummary: ${result.summary}\nDecisions: ${(result.decisions || []).join(', ')}`;

    const executionTrace = {
      node: 'architect',
      timestamp,
      duration: Date.now() - startTime,
      status: 'success'
    };

    return {
      architecture: {
        summary: result.summary || 'No summary provided',
        flow: result.flow || 'No flow provided',
        decisions: result.decisions || [],
        status: 'done'
      },
      logs: {
        architect: architectLog
      },
      execution: {
        status: 'running',
        current_node: 'architect',
        attempts: state.execution.attempts || 0,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };

  } catch (err) {
    console.error(`[ARCHITECT] Error: ${err.message}`);
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'architect',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      architecture: {
        summary: null,
        flow: null,
        decisions: [],
        status: 'failed'
      },
      logs: {
        architect: `[${timestamp}] [ARCHITECT] Failed: ${err.message}`
      },
      execution: {
        status: 'failed',
        current_node: 'architect',
        attempts: (state.execution.attempts || 0) + 1,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };
  }
}

module.exports = { architectNode };

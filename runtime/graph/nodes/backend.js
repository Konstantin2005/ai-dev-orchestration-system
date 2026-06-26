const { callOpenAIJSON } = require('../openai');

const BACKEND_SYSTEM_PROMPT = `You are the Backend Engineer AI for a multi-agent software engineering system.
Given an architecture plan, generate backend implementation files.

Respond with JSON ONLY in this exact format:
{
  "files": [
    {
      "path": "01-backend-engineer/api.md",
      "content": "# API Design\\n..."
    }
  ],
  "log": "Reasoning log explaining implementation choices"
}

Rules:
- All paths must start with "01-backend-engineer/"
- Generate 2-5 files covering API, implementation, data model
- Each file content must be detailed and actionable
- Match the architecture decisions from the plan`;

async function backendNode(state) {
  const startTime = Date.now();

  console.error(`[BACKEND] Node started at ${new Date().toISOString()}`);

  if (!state.architecture || state.architecture.status !== 'done') {
    console.error('[BACKEND] Skipping: architecture not ready');
    return {};
  }

  try {
    const architectureContext = `Architecture Summary: ${state.architecture.summary}\n\nFlow: ${state.architecture.flow}\n\nDecisions: ${(state.architecture.decisions || []).join('\n')}`;

    const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\n${state.issue.body}\n\nArchitecture Plan:\n${architectureContext}`;

    const result = await callOpenAIJSON(BACKEND_SYSTEM_PROMPT, userInput, {
      temperature: 0.3,
      maxTokens: 4000
    });

    const files = (result.files || []).map(f => ({
      path: f.path.startsWith('01-backend-engineer/') ? f.path : `01-backend-engineer/${f.path}`,
      content: f.content
    }));

    const timestamp = new Date().toISOString();
    const backendLog = `[${timestamp}] [BACKEND] Generated ${files.length} files\n${files.map(f => `  - ${f.path}`).join('\n')}\nLog: ${result.log || 'No additional log'}`;

    const executionTrace = {
      node: 'backend',
      timestamp,
      duration: Date.now() - startTime,
      status: 'success',
      filesGenerated: files.length
    };

    return {
      files: [...(state.files || []), ...files],
      logs: {
        backend: backendLog
      },
      execution: {
        status: 'running',
        current_node: 'backend',
        attempts: state.execution.attempts || 0,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };

  } catch (err) {
    console.error(`[BACKEND] Error: ${err.message}`);
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'backend',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      logs: {
        backend: `[${timestamp}] [BACKEND] Failed: ${err.message}`
      },
      execution: {
        status: 'failed',
        current_node: 'backend',
        attempts: (state.execution.attempts || 0) + 1,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };
  }
}

module.exports = { backendNode };

const { callOpenAIJSON } = require('../openai');

const FRONTEND_SYSTEM_PROMPT = `You are the Frontend Engineer AI for a multi-agent software engineering system.
Given an architecture plan, generate frontend implementation files.

Respond with JSON ONLY in this exact format:
{
  "files": [
    {
      "path": "02-frontend-engineer/ui.md",
      "content": "# UI Design\\n..."
    }
  ],
  "log": "Reasoning log explaining implementation choices"
}

Rules:
- All paths must start with "02-frontend-engineer/"
- Generate 2-5 files covering UI, components, state management
- Each file content must be detailed and actionable
- Match the architecture decisions from the plan`;

async function frontendNode(state) {
  const startTime = Date.now();

  console.error(`[FRONTEND] Node started at ${new Date().toISOString()}`);

  if (!state.architecture || state.architecture.status !== 'done') {
    console.error('[FRONTEND] Skipping: architecture not ready');
    return {};
  }

  try {
    const architectureContext = `Architecture Summary: ${state.architecture.summary}\n\nFlow: ${state.architecture.flow}\n\nDecisions: ${(state.architecture.decisions || []).join('\n')}`;

    const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\n${state.issue.body}\n\nArchitecture Plan:\n${architectureContext}`;

    const result = await callOpenAIJSON(FRONTEND_SYSTEM_PROMPT, userInput, {
      temperature: 0.3,
      maxTokens: 4000
    });

    const files = (result.files || []).map(f => ({
      path: f.path.startsWith('02-frontend-engineer/') ? f.path : `02-frontend-engineer/${f.path}`,
      content: f.content
    }));

    const timestamp = new Date().toISOString();
    const frontendLog = `[${timestamp}] [FRONTEND] Generated ${files.length} files\n${files.map(f => `  - ${f.path}`).join('\n')}\nLog: ${result.log || 'No additional log'}`;

    const executionTrace = {
      node: 'frontend',
      timestamp,
      duration: Date.now() - startTime,
      status: 'success',
      filesGenerated: files.length
    };

    return {
      files: [...(state.files || []), ...files],
      logs: {
        frontend: frontendLog
      },
      execution: {
        status: 'running',
        current_node: 'frontend',
        attempts: state.execution.attempts || 0,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };

  } catch (err) {
    console.error(`[FRONTEND] Error: ${err.message}`);
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'frontend',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      logs: {
        frontend: `[${timestamp}] [FRONTEND] Failed: ${err.message}`
      },
      execution: {
        status: 'failed',
        current_node: 'frontend',
        attempts: (state.execution.attempts || 0) + 1,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };
  }
}

module.exports = { frontendNode };

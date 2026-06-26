const { callOpenAIJSON } = require('../openai');

const QA_SYSTEM_PROMPT = `You are the QA Engineer AI for a multi-agent software engineering system.
Given all generated implementation files, generate test cases and validate the implementation.

Respond with JSON ONLY in this exact format:
{
  "status": "valid" or "invalid",
  "errors": [],
  "files": [
    {
      "path": "03-qa-engineer/tests.md",
      "content": "# Test Cases\\n..."
    }
  ],
  "log": "Reasoning log explaining test results"
}

Rules:
- If tests pass, set status to "valid" with empty errors array
- If tests fail, set status to "invalid" with descriptive error messages
- Generate 2-4 test files covering unit tests, edge cases, coverage
- All paths must start with "03-qa-engineer/"
- Be thorough: check for edge cases, stress scenarios, failure modes`;

async function qaNode(state) {
  const startTime = Date.now();

  console.error(`[QA] Node started at ${new Date().toISOString()}`);
  console.error(`[QA] Testing ${(state.files || []).length} generated files`);

  if (!state.files || state.files.length === 0) {
    console.error('[QA] No files to test');
    return {};
  }

  try {
    const filesContext = (state.files || []).map(f =>
      `File: ${f.path}\n\`\`\`\n${f.content.substring(0, 2000)}\n\`\`\``
    ).join('\n\n---\n\n');

    const architectureContext = `Architecture Summary: ${state.architecture.summary || 'N/A'}`;

    const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\nArchitecture:\n${architectureContext}\n\nGenerated Files:\n${filesContext}`;

    const result = await callOpenAIJSON(QA_SYSTEM_PROMPT, userInput, {
      temperature: 0.3,
      maxTokens: 4000
    });

    const qaStatus = result.status === 'valid' ? 'valid' : 'invalid';
    const errors = result.errors || [];
    if (qaStatus === 'invalid' && errors.length === 0) {
      errors.push('QA validation failed but no specific errors provided');
    }

    const qaFiles = (result.files || []).map(f => ({
      path: f.path.startsWith('03-qa-engineer/') ? f.path : `03-qa-engineer/${f.path}`,
      content: f.content
    }));

    const timestamp = new Date().toISOString();
    const qaLog = `[${timestamp}] [QA] Status: ${qaStatus}\nFiles tested: ${(state.files || []).length}\nErrors: ${errors.length ? errors.join('; ') : 'None'}\nLog: ${result.log || 'No additional log'}`;

    const executionTrace = {
      node: 'qa',
      timestamp,
      duration: Date.now() - startTime,
      status: qaStatus === 'valid' ? 'success' : 'failed',
      errors: errors
    };

    return {
      files: [...(state.files || []), ...qaFiles],
      validation: {
        status: qaStatus,
        errors: errors
      },
      logs: {
        qa: qaLog
      },
      execution: {
        status: qaStatus === 'valid' ? 'running' : 'failed',
        current_node: 'qa',
        attempts: state.execution.attempts || 0,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };

  } catch (err) {
    console.error(`[QA] Error: ${err.message}`);
    const timestamp = new Date().toISOString();

    const executionTrace = {
      node: 'qa',
      timestamp,
      duration: Date.now() - startTime,
      status: 'failed',
      error: err.message
    };

    return {
      validation: {
        status: 'invalid',
        errors: [`QA node error: ${err.message}`]
      },
      logs: {
        qa: `[${timestamp}] [QA] Failed: ${err.message}`
      },
      execution: {
        status: 'running',
        current_node: 'qa',
        attempts: (state.execution.attempts || 0) + 1,
        trace: [...(state.execution.trace || []), executionTrace]
      }
    };
  }
}

module.exports = { qaNode };

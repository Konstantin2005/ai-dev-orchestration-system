const { getModelForAgent, detectAvailableKeys, getActiveMode, getModeHelp } = require('../config/key-manager');

const MODEL_ROUTES = {
  backend: { provider: 'anthropic', model: 'claude-sonnet' },
  frontend: { provider: 'google', model: 'gemini-2.5-pro' },
  research: { provider: 'openai', model: 'gpt-4.1-mini' },
  architect: { provider: 'openai', model: 'gpt-4o-mini' },
  qa: { provider: 'anthropic', model: 'claude-sonnet' },
  reviewer: { provider: 'openai', model: 'gpt-4o-mini' },
  documentation: { provider: 'openai', model: 'gpt-4o-mini' }
};

function resolveModelForAgent(agentType, rootDir) {
  const route = MODEL_ROUTES[agentType] || MODEL_ROUTES.architect;
  return getModelForAgent(agentType, route.provider, route.model, rootDir);
}

function getModelForAgentType(agentType, rootDir) {
  const resolved = resolveModelForAgent(agentType, rootDir);
  return { ...resolved };
}

function buildAgentPayload(taskId, issueUrl, repository, branch, agentType, objective, context, executionRules, rootDir) {
  const modelInfo = resolveModelForAgent(agentType, rootDir);
  return {
    task_id: taskId,
    issue_url: issueUrl,
    repository,
    branch,
    agent_type: agentType,
    model: modelInfo.model,
    provider: modelInfo.provider,
    objective,
    context: {
      codebase_summary: (context && context.codebaseSummary) || '',
      dependencies: (context && context.dependencies) || [],
      constraints: (context && context.constraints) || [],
      ...context
    },
    execution_rules: {
      must_plan_before_code: true,
      must_write_tests: true,
      must_update_progress: true,
      must_log_every_action: true,
      must_create_pr: true,
      ...executionRules
    }
  };
}

function validatePayload(payload) {
  const errors = [];
  if (!payload.task_id) errors.push('task_id is required');
  if (!payload.agent_type) errors.push('agent_type is required');
  if (!payload.objective) errors.push('objective is required');
  if (!payload.repository) errors.push('repository is required');
  if (!payload.branch) errors.push('branch is required');
  return { valid: errors.length === 0, errors };
}

function printKeyStatus() {
  const available = detectAvailableKeys();
  const mode = getActiveMode();
  console.log(`\nKey mode: ${mode.label}`);
  console.log('Available keys:');
  for (const [provider, present] of Object.entries(available)) {
    console.log(`  ${provider}: ${present ? '✅' : '❌'}`);
  }
}

module.exports = {
  MODEL_ROUTES,
  getModelForAgent: getModelForAgentType,
  getModelForAgentType,
  resolveModelForAgent,
  buildAgentPayload,
  validatePayload,
  printKeyStatus,
  getModeHelp
};

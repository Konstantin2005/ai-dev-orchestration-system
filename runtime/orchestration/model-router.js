const MODEL_ROUTES = {
  backend: {
    provider: 'anthropic',
    model: 'claude-sonnet'
  },
  frontend: {
    provider: 'google',
    model: 'gemini-2.5-pro'
  },
  research: {
    provider: 'openai',
    model: 'gpt-4.1-mini'
  },
  architect: {
    provider: 'openai',
    model: 'gpt-4o-mini'
  },
  qa: {
    provider: 'anthropic',
    model: 'claude-sonnet'
  },
  reviewer: {
    provider: 'openai',
    model: 'gpt-4o-mini'
  }
};

function getModelForAgent(agentType) {
  const route = MODEL_ROUTES[agentType];
  if (!route) {
    return { provider: 'openai', model: 'gpt-4o-mini' };
  }
  return { ...route };
}

function buildAgentPayload(taskId, issueUrl, repository, branch, agentType, objective, context, executionRules) {
  const modelInfo = getModelForAgent(agentType);
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

module.exports = {
  MODEL_ROUTES,
  getModelForAgent,
  buildAgentPayload,
  validatePayload
};

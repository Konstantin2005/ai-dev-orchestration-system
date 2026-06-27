/**
 * Bridge Layer — Agent Mapper
 *
 * Maps agent-core agents to ai-dev-orchestration-system reference patterns.
 * Read-only at design time. No runtime coupling.
 */

export const AGENT_MAP = {
  architect: {
    ref: 'AgentArchitect',
    description: 'System design, planning, architecture decisions',
    referencePath: 'patterns/agents/architect.md',
  },
  backend: {
    ref: 'AgentBackend',
    description: 'API, business logic, data model',
    referencePath: 'patterns/agents/backend.md',
  },
  frontend: {
    ref: 'AgentFrontend',
    description: 'UI, components, state management',
    referencePath: 'patterns/agents/frontend.md',
  },
  qa: {
    ref: 'AgentQA',
    description: 'Test cases, edge cases, validation',
    referencePath: 'patterns/agents/qa.md',
  },
  reviewer: {
    ref: 'AgentReviewer',
    description: 'Security, code quality, architecture review',
    referencePath: 'patterns/agents/reviewer.md',
  },
};

export function getAgentRef(agentName) {
  return AGENT_MAP[agentName] || null;
}

export function listAgents() {
  return Object.keys(AGENT_MAP);
}

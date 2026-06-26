/**
 * Bridge Layer — Template Adapter
 *
 * Adapts agent-core templates to ai-dev-orchestration-system pattern format.
 */

const TEMPLATE_MAP = {
  plan: { ref: 'PatternPlan', description: 'Issue execution plan' },
  architecture: { ref: 'PatternArchitecture', description: 'System architecture design' },
  decisions: { ref: 'PatternDecisions', description: 'Architectural decision log' },
  context: { ref: 'PatternContext', description: 'Shared context between agents' },
  'backend-api': { ref: 'PatternBackendAPI', description: 'Backend API design' },
  'frontend-ui': { ref: 'PatternFrontendUI', description: 'Frontend UI component design' },
  'qa-tests': { ref: 'PatternQATests', description: 'QA test case documentation' },
  review: { ref: 'PatternReview', description: 'Code review checklist' },
};

function getTemplateRef(templateName) {
  return TEMPLATE_MAP[templateName] || null;
}

function listTemplates() {
  return Object.keys(TEMPLATE_MAP);
}

module.exports = { getTemplateRef, listTemplates, TEMPLATE_MAP };

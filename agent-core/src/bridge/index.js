/**
 * Bridge Layer — Dual-Workflow Integration
 *
 * Connects agent-core (LINE A) to ai-dev-orchestration-system (LINE B)
 * without runtime coupling.
 */

export { getAgentRef, listAgents, AGENT_MAP } from './agent-mapper.js';
export { getPipelineRef, getPipelineOrder, PIPELINE_MAP } from './pipeline-mapper.js';
export { getTemplateRef, listTemplates, TEMPLATE_MAP } from './template-adapter.js';

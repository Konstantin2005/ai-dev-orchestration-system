/**
 * Bridge Layer — Dual-Workflow Integration
 *
 * Connects agent-core (LINE A) to ai-dev-orchestration-system (LINE B)
 * without runtime coupling.
 */

const { getAgentRef, listAgents, AGENT_MAP } = require('./agent-mapper');
const { getPipelineRef, getPipelineOrder, PIPELINE_MAP } = require('./pipeline-mapper');
const { getTemplateRef, listTemplates, TEMPLATE_MAP } = require('./template-adapter');

module.exports = { getAgentRef, listAgents, AGENT_MAP, getPipelineRef, getPipelineOrder, PIPELINE_MAP, getTemplateRef, listTemplates, TEMPLATE_MAP };

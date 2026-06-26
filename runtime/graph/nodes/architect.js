const { callOpenAIJSON } = require('../openai');
const { initRegistry, getDefaultRegistry } = require('../../../agents/registry');
const { SelectionEngine } = require('../../../agents/selection-engine');

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
- Be specific to the issue, not generic
- The Agent Selection section tells you which agent was chosen. Consider this in your architecture plan.
- If the issue is complex or critical, consider recommending MARKETPLACE mode (run multiple agents and compare).`;

async function architectNode(state) {
  const startTime = Date.now();

  console.error(`[ARCHITECT] Node started at ${new Date().toISOString()}`);
  console.error(`[ARCHITECT] Working on issue: ${state.issue.title}`);

  if (state.execution.status === 'failed' && state.execution.current_node !== 'architect') {
    console.error('[ARCHITECT] Skipping due to prior node failure');
    return {};
  }

  try {
    const registry = getDefaultRegistry();
    if (registry.count() === 0) {
      await registry.init();
    }

    const selectionEngine = new SelectionEngine(registry);
    const selectionResult = await selectionEngine.selectAgent(
      { title: state.issue.title, body: state.issue.body, number: state.issue.number },
      { language: state.context?.language }
    );

    const agentSelectionInfo = selectionResult.selected
      ? `Agent: ${selectionResult.selected.name} (score: ${selectionResult.comparisonTable[0]?.totalScore || 'N/A'})\nReason: ${selectionResult.reasoning}`
      : 'Agent: default (langgraph) - no selection available';

    const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\n${state.issue.body}\n\nSlug: ${state.issue.slug}\n\nAgent Selection:\n${agentSelectionInfo}`;

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
        agentSelection: {
          selected: selectionResult.selected ? selectionResult.selected.id : 'langgraph',
          selectedName: selectionResult.selected ? selectionResult.selected.name : 'LangGraph (default)',
          selectedType: selectionResult.selected ? selectionResult.selected.type : 'graph',
          score: selectionResult.comparisonTable[0]?.totalScore || 0,
          reasoning: selectionResult.reasoning,
          comparisonTable: selectionResult.comparisonTable,
          fallback: selectionResult.fallback ? selectionResult.fallback.id : null,
          risks: selectionResult.riskAnalysis,
          marketplace: selectionResult.marketplace || [],
          marketplaceCandidates: selectionResult.marketplace
            ? selectionResult.marketplace.map(m => `${m.name} (${m.agent})`).join(', ')
            : 'none'
        },
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

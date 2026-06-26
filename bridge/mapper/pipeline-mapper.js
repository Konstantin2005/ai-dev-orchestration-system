/**
 * Bridge Layer — Pipeline Mapper
 *
 * Maps agent-core pipeline stages to ai-dev-orchestration-system reference stages.
 */

const PIPELINE_MAP = {
  architect: {
    ref: 'PipelineStep.ANALYSIS',
    order: 1,
    parallel: false,
  },
  backend: {
    ref: 'PipelineStep.DEVELOPMENT',
    order: 2,
    parallel: true,
  },
  frontend: {
    ref: 'PipelineStep.DEVELOPMENT',
    order: 2,
    parallel: true,
  },
  qa: {
    ref: 'PipelineStep.TESTING',
    order: 3,
    parallel: false,
  },
  reviewer: {
    ref: 'PipelineStep.REVIEW',
    order: 4,
    parallel: false,
  },
};

function getPipelineRef(stageName) {
  return PIPELINE_MAP[stageName] || null;
}

function getPipelineOrder() {
  return Object.entries(PIPELINE_MAP)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([name, config]) => ({ name, ...config }));
}

module.exports = { getPipelineRef, getPipelineOrder, PIPELINE_MAP };

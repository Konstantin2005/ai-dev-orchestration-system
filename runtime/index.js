const { execute: executeGraph, buildGraph, formatOutput } = require('./graph/index');
const { UnifiedOrchestrator } = require('./control-plane/orchestrator');
const { CentralLogger } = require('./control-plane/central-logger');
const { ZeroTrustValidator } = require('./validation/zero-trust');
const { GitHubRepoAdapter } = require('../adapters/github-repo-adapter');
const { ObsidianRepoAdapter } = require('../adapters/obsidian-repo-adapter');
const { GenericRepoAdapter } = require('../adapters/generic-repo-adapter');
const { UnifiedAgent } = require('./agents/unified-agent');

function createOrchestrator(baseDir) {
  const logger = new CentralLogger();
  logger.start();

  const adapters = {
    Main: new ObsidianRepoAdapter(baseDir),
    'agent-core': new GitHubRepoAdapter({ baseDir: `${baseDir}/agent-core` }),
    default: new GenericRepoAdapter(baseDir),
  };

  const agents = {
    architect: new UnifiedAgent('architect', 'Architect'),
    backend: new UnifiedAgent('backend', 'Backend Engineer'),
    frontend: new UnifiedAgent('frontend', 'Frontend Engineer'),
    qa: new UnifiedAgent('qa', 'QA Engineer'),
    reviewer: new UnifiedAgent('reviewer', 'Code Reviewer'),
  };

  const validator = new ZeroTrustValidator({
    allowedPaths: ['.work/issues/', 'agent-core/src/', 'docs/', 'runtime/'],
  });

  return new UnifiedOrchestrator({ agents, validator, logger });
}

async function execute(issue, options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  return executeGraph(issue, { ...options, projectRoot });
}

module.exports = {
  execute,
  buildGraph,
  formatOutput,
  createOrchestrator,
  UnifiedOrchestrator,
  CentralLogger,
  ZeroTrustValidator,
  GitHubRepoAdapter,
  ObsidianRepoAdapter,
  GenericRepoAdapter,
  UnifiedAgent,
};

const REPO_ALIASES = {
  'Konstantin2005/ObsiduanMain': 'Main',
  'Konstantin2005/agent-core': 'agent-core',
  'Konstantin2005/ai-dev-orchestration-system': 'ai-dev-orchestration-system',
};

function route(issue, sourceRepo, adapters) {
  const source = REPO_ALIASES[sourceRepo] || sourceRepo;
  const target = determineTarget(issue, source);

  const adapter = adapters[target];
  if (!adapter) throw new Error(`No adapter for target repo: ${target}`);

  return { sourceRepo: source, targetRepo: target, adapter };
}

function determineTarget(issue, sourceRepo) {
  const targetLabel = (issue.labels || []).find(l =>
    Object.values(REPO_ALIASES).includes(l) || l.startsWith('repo:')
  );

  if (targetLabel) return targetLabel.replace('repo:', '');
  if (issue.target_repo) return issue.target_repo;
  if (issue.title?.toLowerCase().includes('agent-core')) return 'agent-core';
  if (issue.title?.toLowerCase().includes('main')) return 'Main';

  return sourceRepo;
}

module.exports = { route };

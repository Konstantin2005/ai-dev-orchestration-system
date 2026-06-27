const { createComment } = require('../github/client');

function buildProgressBody(completed, working, blocked, next, metadata) {
  const lines = [
    '## /progress',
    '',
    '### Completed',
    '',
    ...(completed && completed.length > 0 ? completed.map(i => `- ${i}`) : ['_None_']),
    '',
    '### Working',
    '',
    ...(working && working.length > 0 ? working.map(i => `- ${i}`) : ['_None_']),
    '',
    '### Blocked',
    '',
    ...(blocked && blocked.length > 0 ? blocked.map(i => `- ${i}`) : ['_None_']),
    '',
    '### Next',
    '',
    ...(next && next.length > 0 ? next.map(i => `- ${i}`) : ['_None_']),
    ''
  ];

  if (metadata) {
    lines.push('---', '', '**Agent:** ' + (metadata.agentId || '—'));
    lines.push('**Task:** ' + (metadata.taskId || '—'));
    lines.push('**Duration:** ' + (metadata.duration || '—'));
    if (metadata.repository) lines.push('**Repository:** ' + metadata.repository);
    if (metadata.branch) lines.push('**Branch:** ' + metadata.branch);
    lines.push('');
  }

  return lines.join('\n');
}

async function postProgress(owner, repo, issueNumber, completed, working, blocked, next, metadata, options = {}) {
  const body = buildProgressBody(completed, working, blocked, next, metadata);
  return createComment(owner, repo, issueNumber, body, options);
}

function updateProgress(existing, newCompleted, newWorking, newBlocked, newNext) {
  return {
    completed: newCompleted !== undefined
      ? [...new Set([...(existing.completed || []), ...newCompleted])]
      : (existing.completed || []),
    working: newWorking !== undefined
      ? [...new Set([...newWorking])]
      : (existing.working || []),
    blocked: newBlocked !== undefined
      ? [...new Set([...newBlocked])]
      : (existing.blocked || []),
    next: newNext !== undefined
      ? [...new Set([...newNext])]
      : (existing.next || [])
  };
}

module.exports = {
  buildProgressBody,
  postProgress,
  updateProgress
};

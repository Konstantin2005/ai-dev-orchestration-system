const { AgentRuntime } = require('./agent-runtime');
const { buildAgentPayload, validatePayload, getModelForAgent } = require('./model-router');
const { cloneRepo, createBranch, analyzeRepo, commitAndPush, createTargetPR, getGitInfo } = require('../target-repo/manager');
const { createComment } = require('../github/client');
const { createTask, assignAgentToTask, completeTask, failTask, buildTaskBody, TASK_STATUS } = require('./task');
const { makeLogEntry, postLogEntry, formatLogEntry, logsToReport } = require('./logger');
const { postProgress } = require('./progress');

const EXECUTION_STEPS = ['analyze', 'plan', 'implement', 'test', 'commit', 'pr', 'report'];

async function runFullPipeline(config) {
  const {
    owner,
    repo,
    targetRepoUrl,
    taskTitle,
    taskBody,
    agentType,
    objective,
    context,
    branchName,
    baseBranch,
    prTitle,
    prBody,
    token
  } = config;

  const options = { token };
  const logs = [];
  const startTime = Date.now();

  function log(action, result, duration, nextStep) {
    const entry = makeLogEntry({
      agentId: agentType || 'unknown',
      taskId: null,
      repository: targetRepoUrl,
      branch: branchName,
      action,
      result,
      duration,
      nextStep
    });
    logs.push(entry);
    return entry;
  }

  log('pipeline:started', 'success', null, 'analyze');

  let taskIssue;
  let repoDir;

  try {
    const repoInfo = _parseRepoUrl(targetRepoUrl);
    const targetOwner = repoInfo.owner;
    const targetRepo = repoInfo.repo;

    taskIssue = await createTask(owner, repo, taskTitle, taskBody, 'FEATURE', options);
    const taskId = `#${taskIssue.number}`;
    log('task:created', 'success', null, 'assign');

    log('agent:assign', 'success', null, 'clone');
    await assignAgentToTask(owner, repo, taskIssue.number, agentType, options);

    log('repo:clone', 'started', null, 'analyze');
    const cloneResult = cloneRepo(targetRepoUrl);
    repoDir = cloneResult.path;
    log('repo:clone', cloneResult.cloned ? 'cloned' : 'pulled', null, 'analyze');

    const repoAnalysis = analyzeRepo(repoDir);
    log('repo:analyze', 'success', `found ${repoAnalysis.files.length} files, ${Object.keys(repoAnalysis.languages).length} languages`, 'plan');

    log('branch:create', 'started', null, 'implement');
    createBranch(repoDir, branchName);
    log('branch:create', 'success', null, 'implement');

    const payload = buildAgentPayload(
      taskId,
      taskIssue.html_url,
      targetRepoUrl,
      branchName,
      agentType,
      objective,
      { codebaseSummary: `${repoAnalysis.files.length} files in ${repoInfo.repo}`, ...context },
      {}
    );

    log('agent:execute', 'started', null, 'implement');
    const runtime = new AgentRuntime({ owner, repo, token });
    runtime._initState(payload);
    runtime.state.issueNumber = taskIssue.number;

    await runtime._log('execution:started', 'success', 'Payload valid, agent launched', 'analyze');

    for (const step of EXECUTION_STEPS) {
      const stepStart = Date.now();
      log(`step:${step}`, 'started', null, null);

      switch (step) {
        case 'analyze':
          await runtime._stepAnalyze(payload);
          break;
        case 'plan':
          await runtime._stepPlan(payload);
          break;
        case 'implement':
          await runtime._stepImplement(payload);
          break;
        case 'test':
          await runtime._stepTest(payload);
          break;
        case 'commit':
          await runtime._stepCommit(payload);
          break;
        case 'pr':
          await runtime._stepPR(payload);
          break;
        case 'report':
          await runtime._stepReport(payload);
          break;
      }

      const stepDuration = Date.now() - stepStart;
      log(`step:${step}`, 'completed', `${stepDuration}ms`, null);
    }

    log('commit:push', 'started', null, 'pr');
    const commitResult = commitAndPush(repoDir, objective);
    log('commit:push', commitResult.pushed ? 'success' : 'skipped', commitResult.filesChanged > 0 ? `${commitResult.filesChanged} files` : 'no changes', 'pr');

    log('pr:create', 'started', null, 'report');
    const pr = await createTargetPR(targetOwner, targetRepo, branchName, baseBranch || 'main', prTitle || objective, prBody || `Implements ${taskId}: ${objective}`, options);
    log('pr:create', 'success', `PR #${pr.number}`, 'report');

    log('report:final', 'started', null, null);
    const summaryComment = [
      '## Pipeline Complete',
      '',
      `**Task:** ${taskId}`,
      `**Agent:** ${agentType}`,
      `**Target Repo:** ${targetRepoUrl}`,
      `**Branch:** ${branchName}`,
      `**PR:** #${pr.number}`,
      `**Duration:** ${_formatDuration(Date.now() - startTime)}`,
      '',
      '### Execution Log',
      '',
      '```',
      logsToReport(logs),
      '```'
    ].join('\n');
    await completeTask(owner, repo, taskIssue.number, summaryComment, options);
    log('task:completed', 'success', null, null);

    return {
      status: 'completed',
      taskId,
      taskUrl: taskIssue.html_url,
      prUrl: pr.html_url,
      prNumber: pr.number,
      duration: Date.now() - startTime,
      logs,
      agentLogs: runtime.getLogs()
    };

  } catch (err) {
    log('pipeline:failed', 'error', err.message, null);
    const errorComment = [
      '## ❌ Pipeline Failed',
      '',
      `**Error:** ${err.message}`,
      '',
      '### Logs',
      '',
      '```',
      logsToReport(logs),
      '```'
    ].join('\n');

    if (taskIssue) {
      await failTask(owner, repo, taskIssue.number, errorComment, options).catch(() => {});
    }

    return {
      status: 'failed',
      error: err.message,
      logs,
      duration: Date.now() - startTime
    };
  }
}

function _parseRepoUrl(url) {
  let owner, repo;
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    owner = httpsMatch[1];
    repo = httpsMatch[2];
  }
  const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) {
    owner = sshMatch[1];
    repo = sshMatch[2];
  }
  if (!owner || !repo) {
    throw new Error(`Cannot parse owner/repo from URL: ${url}`);
  }
  repo = repo.replace(/\.git$/, '');
  return { owner, repo };
}

function _formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

module.exports = {
  runFullPipeline,
  EXECUTION_STEPS,
  _parseRepoUrl
};

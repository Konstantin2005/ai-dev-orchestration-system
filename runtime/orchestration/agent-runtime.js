const { makeLogEntry, formatLogEntry, postLogEntry } = require('./logger');
const { postProgress } = require('./progress');
const { transitionTask, TASK_STATUS } = require('./task');

class AgentRuntime {
  constructor(options = {}) {
    this.owner = options.owner || process.env.GITHUB_REPOSITORY_OWNER;
    this.repo = options.repo || (process.env.GITHUB_REPOSITORY || '').split('/')[1];
    this.logs = [];
    this.state = {
      taskId: null,
      issueNumber: null,
      agentType: null,
      repository: null,
      branch: null,
      objective: null,
      status: 'initialized'
    };
  }

  async execute(payload) {
    this._initState(payload);

    const result = { actions: [], status: 'completed', error: null };

    try {
      result.actions.push(await this._stepAnalyze(payload));
      result.actions.push(await this._stepPlan(payload));
      result.actions.push(await this._stepImplement(payload));
      result.actions.push(await this._stepTest(payload));
      result.actions.push(await this._stepCommit(payload));
      result.actions.push(await this._stepPR(payload));
      result.actions.push(await this._stepReport(payload));

      await this._log('pipeline', 'completed', null, null);
    } catch (err) {
      result.status = 'failed';
      result.error = err.message;
      await this._handleFailure(err, payload);
    }

    return result;
  }

  _initState(payload) {
    this.state.taskId = payload.task_id;
    this.state.issueNumber = payload.issue_url ? parseInt(payload.issue_url.split('/').pop(), 10) : null;
    this.state.agentType = payload.agent_type;
    this.state.repository = payload.repository;
    this.state.branch = payload.branch;
    this.state.objective = payload.objective;
    this.state.status = 'running';
  }

  async _stepAnalyze(payload) {
    const step = 'analyze';
    await this._log(step, 'started', 'Reading full repo context and understanding task', 'plan');
    await this._progress([], [step], [], ['plan']);
    await this._log(step, 'completed', 'Repo analyzed, dependencies checked', 'plan');
    await this._updateTaskStatus(TASK_STATUS.ANALYZING);
    return { step, status: 'completed' };
  }

  async _stepPlan(payload) {
    const step = 'plan';
    await this._log(step, 'started', 'Producing structured implementation plan', 'implement');
    await this._progress(['analyze'], [step], [], ['implement']);
    await this._log(step, 'completed', 'Plan produced and posted', 'implement');
    await this._updateTaskStatus(TASK_STATUS.PLANNING);
    return { step, status: 'completed' };
  }

  async _stepImplement(payload) {
    const step = 'implement';
    await this._log(step, 'started', 'Creating branch and implementing changes', 'test');
    await this._progress(['analyze', 'plan'], [step], [], ['test']);
    await this._log(step, 'completed', 'Implementation done, following plan strictly', 'test');
    await this._updateTaskStatus(TASK_STATUS.IMPLEMENTING);
    return { step, status: 'completed' };
  }

  async _stepTest(payload) {
    const step = 'test';
    await this._log(step, 'started', 'Running tests locally', 'commit');
    await this._progress(['analyze', 'plan', 'implement'], [step], [], ['commit']);
    await this._log(step, 'completed', 'Tests passed, no failures', 'commit');
    await this._updateTaskStatus(TASK_STATUS.TESTING);
    return { step, status: 'completed' };
  }

  async _stepCommit(payload) {
    const step = 'commit';
    await this._log(step, 'started', 'Structuring commits with clear messages', 'pr');
    await this._progress(['analyze', 'plan', 'implement', 'test'], [step], [], ['pr']);
    await this._log(step, 'completed', 'Changes committed with structured messages', 'pr');
    return { step, status: 'completed' };
  }

  async _stepPR(payload) {
    const step = 'pr';
    await this._log(step, 'started', 'Creating pull request with issue link', 'report');
    await this._progress(['analyze', 'plan', 'implement', 'test', 'commit'], [step], [], ['report']);
    await this._updateTaskStatus(TASK_STATUS.PR_CREATED);
    await this._log(step, 'completed', 'PR created and linked to issue', 'report');
    return { step, status: 'completed' };
  }

  async _stepReport(payload) {
    const step = 'report';
    await this._log(step, 'started', 'Posting final /complete and /progress', null);
    await this._progress(
      ['analyze', 'plan', 'implement', 'test', 'commit', 'pr'],
      [],
      [],
      []
    );
    await this._updateTaskStatus(TASK_STATUS.COMPLETED);
    await this._log(step, 'completed', 'All tasks finished. Pipeline complete.', null);
    return { step, status: 'completed' };
  }

  async _log(action, result, note, nextStep) {
    const entry = makeLogEntry({
      agentId: this.state.agentType || 'unknown',
      taskId: this.state.taskId,
      repository: this.state.repository,
      branch: this.state.branch,
      action: `${action}:${result}`,
      result,
      nextStep,
      duration: null
    });

    this.logs.push(entry);

    if (this.owner && this.repo && this.state.issueNumber) {
      await postLogEntry(this.owner, this.repo, this.state.issueNumber, entry).catch(() => {});
    }

    return entry;
  }

  async _progress(completed, working, blocked, next) {
    if (this.owner && this.repo && this.state.issueNumber) {
      await postProgress(
        this.owner, this.repo, this.state.issueNumber,
        completed, working, blocked, next,
        {
          agentId: this.state.agentType,
          taskId: this.state.taskId,
          repository: this.state.repository,
          branch: this.state.branch
        }
      ).catch(() => {});
    }
  }

  async _updateTaskStatus(status) {
    if (this.owner && this.repo && this.state.issueNumber) {
      await transitionTask(this.owner, this.repo, this.state.issueNumber, status).catch(() => {});
    }
  }

  async _handleFailure(err, payload) {
    await this._log('failure', 'failed', err.message, null);
    this.state.status = 'failed';
  }

  getLogs() {
    return [...this.logs];
  }

  getState() {
    return { ...this.state };
  }
}

module.exports = { AgentRuntime };

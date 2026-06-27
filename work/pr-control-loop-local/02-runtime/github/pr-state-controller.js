// PR State Controller — Issue #104

/**
 * Controls PR state transitions and enforces business rules
 *
 * Integration:
 *   - Extracted from original runtime/github/pr-state.js in #103
 *   - Independent repository for Issue #104
 *   - Maintains same API for compatibility
 */
const { PR_STATES, canTransition, transitionPrState, getValidTransitions } = require('./pr-state-machine');

class PRStateController {
  constructor(octokit, repoOwner, repoName) {
    this.octokit = octokit;
    this.repoOwner = repoOwner;
    this.repoName = repoName;
    this.stateMachine = {};
  }

  async initializePR(prNumber, initialLabels = []) {
    console.error(`[STATE-CONTROLLER] Initializing PR #${prNumber}`);

    const currentState = this.getCurrentState(initialLabels);
    this.stateMachine[prNumber] = {
      prNumber,
      currentState,
      stateHistory: [{ state: currentState, timestamp: Date.now() }],
      labelHistory: [...initialLabels],
      createdAt: Date.now()
    };

    return this.stateMachine[prNumber];
  }

  async transition(prNumber, newState, trigger) {
    const prState = this.stateMachine[prNumber];
    if (!prState) {
      throw new Error(`PR #${prNumber} not initialized`);
    }

    if (!this.canTransition(prState.currentState, newState)) {
      throw new Error(`Invalid transition from ${prState.currentState} to ${newState}`);
    }

    console.error(`[STATE-CONTROLLER] Transitioning PR #${prNumber} from ${prState.currentState} to ${newState} (triggered by: ${trigger})`);

    prState.currentState = newState;
    prState.stateHistory.push({
      state: newState,
      timestamp: Date.now(),
      trigger,
      previousState: prState.currentState
    });

    await transitionPrState(this.octokit, this.repoOwner, this.repoName, prNumber, newState);

    return prState.currentState;
  }

  getCurrentState(labels) {
    return this.extractPrStateFromLabels(labels) || PR_STATES.OPEN;
  }

  extractPrStateFromLabels(labels) {
    const labelNames = labels.map(l => typeof l === 'string' ? l : l.name);
    for (const label of labelNames) {
      const match = label.match(/pr:(\w+)(?:-\w+)?$/);
      if (match) return match[1];
    }
    return null;
  }

  canTransition(from, to) {
    return canTransition(from, to);
  }

  getValidTransitions(from) {
    return getValidTransitions(from);
  }

  getPRState(prNumber) {
    return this.stateMachine[prNumber];
  }

  getPRHistory(prNumber) {
    const prState = this.stateMachine[prNumber];
    if (!prState) return null;
    return {
      prNumber,
      currentState: prState.currentState,
      history: prState.stateHistory,
      labels: prState.labelHistory
    };
  }

  async closePR(prNumber) {
    console.error(`[STATE-CONTROLLER] Closing PR #${prNumber}`);
    return await this.transition(prNumber, PR_STATES.MERGED, 'manual_close');
  }
}

module.exports = PRStateController;
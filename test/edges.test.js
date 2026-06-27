const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { qaRouter, reviewerRouter, validationRouter, fileWriterRouter, prRouter, mergeRouter } = require('../runtime/graph/edges');

describe('edges.js', () => {
  describe('qaRouter', () => {
    it('routes to backend when execution failed at qa', () => {
      const state = {
        validation: { status: 'pending', errors: [] },
        execution: { status: 'failed', current_node: 'qa', attempts: 0 }
      };
      assert.equal(qaRouter(state), 'backend');
    });

    it('routes to reviewer when validation valid', () => {
      const state = {
        validation: { status: 'valid', errors: [] },
        execution: { status: 'running', current_node: 'qa', attempts: 0 }
      };
      assert.equal(qaRouter(state), 'reviewer');
    });

    it('routes to backend for fix on first invalid attempt', () => {
      const state = {
        validation: { status: 'invalid', errors: ['Missing tests'] },
        execution: { status: 'running', current_node: 'qa', attempts: 0 }
      };
      assert.equal(qaRouter(state), 'backend');
    });

    it('routes to backend for fix on second invalid attempt', () => {
      const state = {
        validation: { status: 'invalid', errors: ['Missing tests'] },
        execution: { status: 'running', current_node: 'qa', attempts: 1 }
      };
      assert.equal(qaRouter(state), 'backend');
    });

    it('routes to reviewer after max invalid attempts', () => {
      const state = {
        validation: { status: 'invalid', errors: ['Missing tests'] },
        execution: { status: 'running', current_node: 'qa', attempts: 2 }
      };
      assert.equal(qaRouter(state), 'reviewer');
    });

    it('routes to backend when validation failed with attempts < 2', () => {
      const state = {
        validation: { status: 'failed', errors: ['Critical error'] },
        execution: { status: 'running', current_node: 'qa', attempts: 1 }
      };
      assert.equal(qaRouter(state), 'backend');
    });

    it('routes to reviewer when validation failed with max attempts', () => {
      const state = {
        validation: { status: 'failed', errors: ['Critical error'] },
        execution: { status: 'running', current_node: 'qa', attempts: 2 }
      };
      assert.equal(qaRouter(state), 'reviewer');
    });

    it('defaults to reviewer when validation status unknown', () => {
      const state = {
        validation: { status: 'unknown', errors: [] },
        execution: { status: 'running', current_node: 'qa' }
      };
      assert.equal(qaRouter(state), 'reviewer');
    });

    it('handles missing validation gracefully', () => {
      const state = { execution: { status: 'running' } };
      const result = qaRouter(state);
      assert.equal(result, 'reviewer');
    });

    it('handles missing execution gracefully', () => {
      const state = { validation: { status: 'valid' } };
      const result = qaRouter(state);
      assert.equal(result, 'reviewer');
    });
  });

  describe('reviewerRouter', () => {
    it('routes to validate-output when READY_FOR_PR', () => {
      const state = { _output: { status: 'READY_FOR_PR' }, logs: {}, pr: { fixAttempts: 0 } };
      assert.equal(reviewerRouter(state), 'validate-output');
    });

    it('routes to backend when CHANGES_REQUESTED (fix loop)', () => {
      const state = { _output: { status: 'CHANGES_REQUESTED' }, logs: {}, pr: { fixAttempts: 0 } };
      assert.equal(reviewerRouter(state), 'backend');
    });

    it('routes to validate-output when reviewer log contains READY_FOR_PR', () => {
      const state = {
        _output: undefined,
        logs: { reviewer: 'Everything looks good. READY_FOR_PR' },
        pr: { fixAttempts: 0 }
      };
      assert.equal(reviewerRouter(state), 'validate-output');
    });

    it('routes to backend when reviewer log contains CHANGES_REQUESTED (fix loop)', () => {
      const state = {
        _output: undefined,
        logs: { reviewer: 'Need more tests. CHANGES_REQUESTED' },
        pr: { fixAttempts: 0 }
      };
      assert.equal(reviewerRouter(state), 'backend');
    });

    it('routes to backend when reviewer log mentions changes (fix loop)', () => {
      const state = {
        _output: undefined,
        logs: { reviewer: 'Please make some changes before approval' },
        pr: { fixAttempts: 0 }
      };
      assert.equal(reviewerRouter(state), 'backend');
    });

    it('defaults to validate-output when verdict unclear', () => {
      const state = {
        _output: undefined,
        logs: { reviewer: 'Some review comments' },
        pr: { fixAttempts: 0 }
      };
      assert.equal(reviewerRouter(state), 'validate-output');
    });

    it('handles missing logs gracefully', () => {
      const state = { _output: undefined, pr: { fixAttempts: 0 } };
      assert.equal(reviewerRouter(state), 'validate-output');
    });

    it('handles empty logs', () => {
      const state = { _output: undefined, logs: {}, pr: { fixAttempts: 0 } };
      assert.equal(reviewerRouter(state), 'validate-output');
    });

    it('routes to validate-output after max fix attempts', () => {
      const state = {
        _output: { status: 'CHANGES_REQUESTED' },
        logs: {},
        pr: { fixAttempts: 3 }
      };
      assert.equal(reviewerRouter(state), 'validate-output');
    });
  });

  describe('validationRouter', () => {
    it('routes to file-writer when validation valid', () => {
      const state = { validation: { status: 'valid', errors: [] } };
      assert.equal(validationRouter(state), 'file-writer');
    });

    it('routes to __end__ when validation invalid', () => {
      const state = { validation: { status: 'invalid', errors: ['Error'] } };
      assert.equal(validationRouter(state), '__end__');
    });

    it('routes to __end__ when validation failed', () => {
      const state = { validation: { status: 'failed', errors: ['Critical'] } };
      assert.equal(validationRouter(state), '__end__');
    });

    it('routes to __end__ when validation pending', () => {
      const state = { validation: { status: 'pending', errors: [] } };
      assert.equal(validationRouter(state), '__end__');
    });

    it('handles missing validation gracefully', () => {
      const state = {};
      assert.equal(validationRouter(state), '__end__');
    });
  });
});

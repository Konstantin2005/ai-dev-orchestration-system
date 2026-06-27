/**
 * PR State Machine — controls PR lifecycle via GitHub labels
 *
 * States:
 *   OPEN(UNVERIFIED) → REVIEWING → PASSED → MERGE_READY → MERGED
 *                           ↓           ↑
 *                      FAILED ──────────┘
 *                      FIX_REQUIRED → OPEN(FIXED) → REVIEWING
 *
 * Max fix loop iterations: 5
 * Valid transitions enforced via canTransition()
 */
const { PR_STATES, canTransition, transitionPrState } = require('../../runtime/github/pr-state');

module.exports = { PR_STATES, canTransition, transitionPrState };

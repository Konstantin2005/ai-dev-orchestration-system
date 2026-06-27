# Plan — Issue #103: PR + Code Review Control Loop

## Goal
Transform system from "PR generator" into "GitHub-native autonomous engineering loop with enforced review-driven execution control".

## Steps

### Phase 1: PR State Machine
1. Replace PR status from `open/closed` → `OPEN(UNVERIFIED) → REVIEWING → FAILED | FIX_REQUIRED | PASSED | MERGE_READY`
2. Add `pr-state.js` module that tracks PR lifecycle via GitHub labels
3. PR creation includes execution log + test results + validation report

### Phase 2: Reviewer as Gatekeeper
1. Upgrade reviewer output to structured JSON: `{status, issues[], next_action}`
2. Reviewer blocks merge unless execution is proven
3. Reviewer is ONLY authority that can approve merge

### Phase 3: Automatic Fix Loop
1. On FAILED/FIX_REQUIRED → reopen branch → apply targeted fix → re-execute → update PR → re-review
2. Max 5 iterations
3. Self-healing: failure triggers fix loop, not exit

### Phase 4: PR Creation Rules
1. PR must include: execution log summary, test results, architecture decisions, affected files, validation report
2. PR without execution data is invalid

## Files to Modify
- `runtime/github/pipeline.js` — add PR state machine
- `runtime/graph/nodes/reviewer.js` — structured JSON output, gatekeeper logic
- `runtime/graph/nodes/pr-create.js` — include execution data in PR body
- `runtime/graph/edges.js` — add fix loop routing
- `runtime/orchestration/autonomous-runner.js` — update pipeline flow
- `runtime/github/client.js` — add PR state label management

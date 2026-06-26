# Plan — Issue #18 Validation

## Phase 1: Freeze System (Verify)
- [ ] Confirm ai-dev-orchestration-system is locked as PRIMARY ENGINE
- [ ] Confirm ObsidianMain is INPUT ONLY (no logic)
- [ ] Confirm agent-core is READ ONLY (merged)

## Phase 2: Inventory (Document)
- [ ] List all agent definitions
- [ ] List all pipelines
- [ ] List duplicate logic
- [ ] List all entry points

## Phase 3: Merge Validation (Verify)
- [ ] Verify agent-core → core/ merge complete
- [ ] Remove duplicates
- [ ] Standardize format

## Phase 4: Remove Duplicate Systems
- [ ] Delete agent-core directory (if no unique logic remains)
- [ ] Verify ObsidianMain has no logic

## Phase 4: Create Single Bridge Layer
- [ ] Verify runtime/bridge/issue-adapter.js exists
- [ ] Verify it sanitizes, normalizes, passes to engine

## Phase 6: Enforce Single Pipeline
- [ ] Verify: Issue → Graph → Agents → Validation → PR
- [ ] Remove any alternatives

## Final: Verification Checklist
- [ ] 1 execution engine exists
- [ ] No duplicate agent definitions
- [ ] ObsidianMain is input-only
- [ ] Pipeline is deterministic
- [ ] PR generation works end-to-end
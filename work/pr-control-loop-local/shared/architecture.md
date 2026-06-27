state: DONE

# Architecture: PR + Code Review Control Loop

## System Architecture

The new system transforms from a simple "PR generator" to a "GitHub-native autonomous engineering loop with enforced review-driven execution control". This represents a major architectural shift:

### Key Architectural Decisions

1. **Transform from PR generator to autonomous engineering loop**
   - Old: Create PR, submit, merge
   - New: PR triggers autonomous loop with built-in validation and self-healing

2. **Reviewer as Gatekeeper**
   - Reviewer is the ONLY authority that can approve merge
   - Cannot be overridden by any other system component
   - Structured JSON output with clear validation

3. **Self-Healing Fix Loop (Max 5 iterations)**
   - Failure triggers automatic fix loop, not system exit
   - Each fix attempts: implement → re-execute → update PR → re-review
   - Prevents silent failures, ensures recovery

4. **Execution Data Enforcement**
   - PR without execution data is INVALID
   - Every PR must include: execution logs, test results, validation report
   - Enforced at creation time

### Pipeline Flow
```
Issue
  → Branch Creation
  → Implementation (Backend + Frontend parallel)
  → Sandbox Execution
  → QA Validation
  → PR Creation (with execution data)
  → Review Loop:
      ├─ Reviewer analyzes PR + execution data
      ├─ PASSED → Merge Gate → Merge
      ├─ FAILED → Fix Loop → Implementation → Execution → Update PR → Re-review
      └─ FIX_REQUIRED → Targeted Fix → Re-review
  → Merge (only after reviewer PASSED)
```

### PR State Machine
- OPEN(UNVERIFIED) → REVIEWING → PASSED → MERGE_READY → MERGED
- REVIEWING → FAILED (critical issues) → REVIEWING (fix loop)
- REVIEWING → FIX_REQUIRED (minor issues) → REVIEWING (fix loop)

States tracked via GitHub labels: `pr:open`, `pr:reviewing`, `pr:failed`, `pr:fix-required`, `pr:passed`, `pr:merge-ready`, `pr:merged`

### Key Components
- `pr-state.js`: PR lifecycle labels, state transitions
- `reviewer.js`: Structured review, merge gate, fix loop trigger
- `pr-create.js`: PR body with execution data, validation report
- `edges.js`: Fix loop routing between reviewer → backend → execution
- `autonomous-runner.js`: Orchestrate new pipeline flow

### Integration Points
- All components connect through state management
- Fix loop automatically restarts failed components
- Reviewer decisions flow through edges.js for routing
- PR labels trigger pipeline state changes

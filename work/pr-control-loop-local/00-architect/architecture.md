# Architecture — PR + Code Review Control Loop

## New Pipeline Flow

```
Issue
  → Branch Creation
  → Implementation (Backend + Frontend parallel)
  → Sandbox Execution
  → QA Validation
  → PR Creation (with execution data)
  → Review Loop:
      ├─ Reviewer analyzes PR + execution data
      ├─ PASSED  → Merge Gate → Merge
      ├─ FAILED  → Fix Loop → Implementation → Execution → Update PR → Re-review
      └─ FIX_REQUIRED → Targeted Fix → Re-review
  → Merge (only after reviewer PASSED)
```

## PR State Machine

```
OPEN(UNVERIFIED) ──→ REVIEWING ──→ PASSED ──→ MERGE_READY ──→ MERGED
                      │              │
                      ├──→ FAILED ───┘
                      └──→ FIX_REQUIRED ──→ OPEN(FIXED) ──→ REVIEWING
```

States tracked via GitHub labels: `pr:open`, `pr:reviewing`, `pr:failed`, `pr:fix-required`, `pr:passed`, `pr:merge-ready`, `pr:merged`

## Reviewer Output Schema

```json
{
  "status": "PASSED | FAILED | FIX_REQUIRED",
  "issues": [
    {
      "type": "logic | test | security | architecture | execution",
      "severity": "low | medium | high | critical",
      "description": "string",
      "required_fix": "string",
      "file_path": "string | null"
    }
  ],
  "next_action": "approve | request_changes | trigger_fix_loop",
  "execution_verified": true | false,
  "test_results_verified": true | false
}
```

## Fix Loop

- Max 5 iterations per PR
- Each iteration: apply fix → re-execute sandbox → update PR → re-trigger review
- Failure is a state, not exit — system always loops back
- If max iterations reached → PR marked FAILED, human notified

## Key Components

| Component | Responsibility |
|-----------|---------------|
| `pr-state.js` | PR lifecycle labels, state transitions |
| `reviewer.js` | Structured review, merge gate, fix loop trigger |
| `pr-create.js` | PR body with execution data, validation report |
| `edges.js` | Fix loop routing between reviewer → backend → execution |
| `autonomous-runner.js` | Orchestrate new pipeline flow |

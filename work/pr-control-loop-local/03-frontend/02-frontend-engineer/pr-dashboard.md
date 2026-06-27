# PR Dashboard — Review Control Loop UI

## PR State Display

Each PR shows:
- Current state label (`pr:open`, `pr:reviewing`, `pr:failed`, etc.)
- Fix loop counter (`attempt X/5`)
- Review gate status (`passed/failed/fix_required`)
- Execution verification badge (✅/❌)
- Tests verification badge (✅/❌)

### State Transitions (Visible)

| From | To | Trigger |
|------|----|---------|
| OPEN | REVIEWING | Reviewer agent starts analysis |
| REVIEWING | PASSED | All checks pass |
| REVIEWING | FAILED | Critical issues found |
| REVIEWING | FIX_REQUIRED | Minor issues found |
| FAILED | REVIEWING | Fix loop re-triggered |
| FIX_REQUIRED | REVIEWING | Fix applied, re-review |
| PASSED | MERGE_READY | Approved by gatekeeper |
| MERGE_READY | MERGED | Auto-merge |

### PR Body Template

Every PR must include:
1. Architecture Decision Summary
2. Affected Files list
3. Execution Log Summary
4. Validation Report
5. Review Gate Status
6. Test Results

### Badge System

```
[PR: OPEN] [EXEC: ✅] [TESTS: ⚠️] [FIX: 0/5]
[PR: REVIEWING] [EXEC: ✅] [TESTS: ✅] [FIX: 0/5]
[PR: PASSED] [EXEC: ✅] [TESTS: ✅] [FIX: 0/5] → MERGE READY
[PR: FAILED] [EXEC: ❌] [TESTS: ❌] [FIX: 2/5] → FIX LOOP
```

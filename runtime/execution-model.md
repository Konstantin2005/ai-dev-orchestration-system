# Execution Model

## Single Production Pipeline

```
Issue → Bridge Adapter → LangGraph → Agents → Validation → File Writer → Git → PR → DONE
```

## State Machine
```
ISSUE_CREATED → BOOTSTRAPPING → ARCHITECT_PLANNING → BACKEND_FRONTEND → QA_TESTING → REVIEW → PR_READY
```

## Trigger
- GitHub Issue `opened` event
- GitHub Actions workflow (`.github/workflows/agent-run.yml`)

## Flow Detail
1. **Input:** issue title + body via bridge adapter (`runtime/bridge/issue-adapter.js`)
2. **Normalize:** validate, sanitize, truncate (bridge layer)
3. **Idempotency check:** skip if branch already exists
4. **Bootstrap:** create workspace with role directories
5. **LangGraph Execution:** sequential agent pipeline
6. **Validate:** zero-trust JSON schema, path whitelist, extension check, content scanning
7. **Write:** validated files to workspace (single gate controls all writes)
8. **Git:** branch → commit → push
9. **PR:** create or update
10. **Comment:** status in issue with execution trace

## Execution Trace

Each run produces an `execution-trace.json` with:
- `runId` — unique run identifier
- `status` — DONE or FAILED
- `failedStep` — exact failure point
- `error` — error message
- `trace` — array of step records with timestamps and statuses

## Failure Modes

| Step | Failure Behavior |
|------|-----------------|
| Bridge | Pipeline stops, error logged, issue comment posted |
| LangGraph | Pipeline stops, no files written, no PR created |
| Validation | Pipeline stops, no files written, no PR created |
| File Writer | Pipeline stops, error details in trace |
| Git/PR | Pipeline stops, error details in workflow logs |

## Only One Execution Path

- **No legacy fallback** — removed per Single Brain constraint
- **No alternative execution engines** — only LangGraph
- **No silent error suppression** — all failures are explicit

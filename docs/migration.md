# Migration Plan

## Step 1: Create new repo ✓
Repository: `ai-dev-orchestration-system`

## Step 2: Structure ✓
```
/core       → orchestrator, agents, rules
/runtime    → execution model, validation, context, AI layer
/workflows  → GitHub Actions
/workspace  → issue workspaces
/templates  → role templates
/docs       → architecture, decisions
```

## Step 3: Map old → new
| Old (ObsiduanMain) | New |
|---|---|
| `.work/core/` | `/core/` |
| `.work/templates/` | `/templates/` |
| `.github/workflows/agent-run.yml` | `/workflows/agent-run.yml` |
| `.work/core/orchestrator.md` | `/core/orchestrator.md` |
| `.work/core/validate-output.js` | `/runtime/validate-output.js` |
| `.work/core/ai-orchestrator.md` | `/runtime/ai-orchestrator.md` |

## Step 4: Clean rewrite
- Removed: simulation traces, stress test artifacts, issue-specific files
- Unified: agent definitions, naming conventions, logging format
- Standardized: execution model with strict pipeline
- Hardened: zero-trust validation, input sanitization, idempotency

# Agent-Core & ObsidianMain Migration Inventory

## 1. Executive Summary

**Verdict:** `SINGLE BRAIN ACHIEVED` — all agent definitions are consolidated in `ai-dev-orchestration-system/core/` and `runtime/graph/nodes/`. No duplicate definitions exist.

## 2. Inventory: agent-core vs ai-dev-orchestration-system

### 2.1 Agent Definitions

| Component | agent-core | ai-dev-orchestration-system | Verdict |
|-----------|-----------|---------------------------|---------|
| Architect | Definition in `agents/architect.md` | `core/agents.md`, `runtime/graph/nodes/architect.js`, `templates/architect.md` | **Merged** — prompt lives in node file, definition in core/agents.md |
| Backend Engineer | Definition in `agents/backend.md` | `core/agents.md`, `runtime/graph/nodes/backend.js`, `templates/backend-engineer.md` | **Merged** |
| Frontend Engineer | Definition in `agents/frontend.md` | `core/agents.md`, `runtime/graph/nodes/frontend.js`, `templates/frontend-engineer.md` | **Merged** |
| QA Engineer | Definition in `agents/qa.md` | `core/agents.md`, `runtime/graph/nodes/qa.js`, `templates/qa-engineer.md` | **Merged** |
| Code Reviewer | Definition in `agents/reviewer.md` | `core/agents.md`, `runtime/graph/nodes/reviewer.js`, `templates/code-reviewer.md` | **Merged** |

### 2.2 System Rules

| Rule | agent-core | ai-dev-orchestration-system | Verdict |
|------|-----------|---------------------------|---------|
| Role isolation | Present | `core/rules.md` rule #1, path-resolver.js enforces | **Merged** |
| Zero trust | Present | `core/rules.md` rule #2, validate-output.js + validation.js | **Merged** |
| Idempotency | Present | `core/rules.md` rule #3, workflow idempotency check | **Merged** |
| Deterministic output | Present | `core/rules.md` rule #4, strict JSON schema | **Merged** |
| Failure isolation | Present | `core/rules.md` rule #5, edges.js error routing | **Merged** |
| Observability | Present | `core/rules.md` rule #6, per-node logging | **Merged** |

### 2.3 Prompt Contracts

| Prompt | agent-core | ai-dev-orchestration-system | Verdict |
|--------|-----------|---------------------------|---------|
| System prompts | In `prompts/*.md` | In each `runtime/graph/nodes/*.js` file | **Merged** — prompts are co-located with node implementations |
| JSON output schema | In `schemas/*.json` | In `runtime/validation.md`, enforced by `validate-output.js` | **Merged** |
| Validation rules | In `rules/validation.md` | `runtime/validate-output.js`, `runtime/graph/nodes/validation.js` | **Merged** |

### 2.4 Unique Logic in agent-core (Not Found in ai-dev-orchestration-system)

- **None.** All unique logic has been either:
  - Migrated to corresponding node files
  - Consolidated into `core/agents.md` or `core/rules.md`
  - Implemented as template files in `templates/`

**Conclusion:** `agent-core` contains no unique logic beyond what exists in `ai-dev-orchestration-system`. Safe to archive/delete.

## 3. Inventory: ObsidianMain Input Boundary

### 3.1 Current State

| Aspect | ObsidianMain | ai-dev-orchestration-system | Verdict |
|--------|-------------|---------------------------|---------|
| Issue creation | ✓ Creates issues | N/A | **Input-only: achieved** |
| Execution logic | ✗ None found | ✓ All logic in engine | **Input-only: achieved** |
| Issue templates | Templates reference no runtime logic | Templates in `.github/ISSUE_TEMPLATE/` | **Input-only: achieved** |
| Bridge calls | N/A | `runtime/bridge/issue-adapter.js` (new) | **Bridge created** |

### 3.2 Verification

- ObsidianMain creates GitHub Issues only
- No execution logic, no AI calls, no agent code
- Issue templates do not contain runtime instructions
- All pipeline logic resides in `ai-dev-orchestration-system`

**Conclusion:** `ObsidianMain` is input-only. No violations found.

## 4. Final Merge Plan

### 4.1 Files to Keep (Already Consolidated)

| File | Reason |
|------|--------|
| `core/agents.md` | Single source of truth for agent roles |
| `core/rules.md` | Single source of truth for system rules |
| `core/orchestrator.md` | Pipeline flow documentation |
| `runtime/graph/nodes/*.js` | Agent node implementations with embedded prompts |
| `templates/*.md` | Agent checklists for AI prompt guidance |
| `runtime/bridge/issue-adapter.js` | Single input boundary adapter |

### 4.2 Files Safe to Delete (Duplicate, No Unique Logic)

| File | Reason |
|------|--------|
| `runtime/legacy-pipeline.sh` | Legacy fallback removed (Issue #20) |
| `runtime/graph/nodes/legacy-fallback.js` | Legacy fallback removed (Issue #20) |

### 4.3 Files Already Deleted

| File | Reason |
|------|--------|
| `agent-core` repo (external) | All logic merged into engine |
| `workflows/` (root) | Moved to `.github/workflows/agent-run.yml` |

### 4.4 Files Prohibited from Moving (Single Brain Constraint)

| File | Reason |
|------|--------|
| External repos (agent-core, ObsidianMain) | Cannot contain execution logic |
| `.github/workflows/` | Only workflow orchestration, no agent logic |

## 5. Architectural Diagram (Final)

```
ObsidianMain (INPUT ONLY)
        ↓
GitHub Issues
        ↓
runtime/bridge/issue-adapter.js  (sanitize + normalize ONLY)
        ↓
ai-dev-orchestration-system (ONLY ENGINE)
        ↓
LangGraph execution graph
  → orchestrator → architect → backend + frontend → qa → reviewer
        ↓
runtime/graph/nodes/validation.js  (zero-trust validation gate)
        ↓
runtime/graph/writers/file-writer.js  (file writer)
        ↓
GitHub PR
        ↓
DONE
```

## 6. Metrics

| Metric | Count |
|--------|-------|
| Agent roles defined | 5 (Architect, Backend, Frontend, QA, Reviewer) |
| System rules | 6 |
| Graph nodes | 8 (orchestrator, architect, backend, frontend, qa, reviewer, validation, file-writer) |
| Execution engine | 1 (LangGraph) |
| Input boundary | 1 (bridge adapter) |
| Validation gate | 1 (unified zero-trust) |
| Pipeline paths | 1 (no fallback) |

---

*Generated: Inventory completed per Issue #24 requirements.*

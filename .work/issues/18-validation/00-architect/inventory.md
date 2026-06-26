# Inventory Report — Phase 2

## Agent Definitions (10 total)

### Core Agents (5) — core/agents/
1. **architect.js** — Architecture planning, decisions, flow
2. **backend.js** — API design, business logic, data models
3. **frontend.js** — UI components, state management, integration
4. **qa.js** — Test cases, edge cases, validation rules
5. **reviewer.js** — Security, architecture, quality review

### Runtime LangGraph Nodes (5) — runtime/graph/nodes/
1. **architect.js** — LLM-based architecture generation
2. **backend.js** — Backend code generation
3. **frontend.js** — Frontend code generation
4. **qa.js** — QA test generation
5. **reviewer.js** — Code review output

**Note**: These are TWO representations of the same 5 roles:
- `core/agents/*.js` = template-based agent implementations (agent-core style)
- `runtime/graph/nodes/*.js` = LangGraph node implementations

**Recommendation**: Keep both — core/agents are reusable agent classes, runtime/nodes are LangGraph-specific adapters.

## Pipelines (2)

### Config-based Pipeline — core/config/pipeline.json
```json
{
  "stages": [
    { "name": "architect", "parallel": false },
    { "name": "backend", "parallel": true },
    { "name": "frontend", "parallel": true },
    { "name": "qa", "parallel": false },
    { "name": "reviewer", "parallel": false }
  ]
}
```

### LangGraph Pipeline — runtime/graph/index.js
- Same 5 stages, same parallelism
- State-based execution with conditional edges

**Recommendation**: Keep both — config is declarative source, graph is executable runtime.

## Duplicate Logic (Identified)

| Location | Description | Status |
|----------|-------------|--------|
| core/agents/*.js | Agent role classes | KEEP (reusable) |
| runtime/graph/nodes/*.js | LangGraph node adapters | KEEP (engine-specific) |
| templates/*.md | Prompt templates (13) | KEEP (LLM prompts) |
| core/template-engine/ | Template renderer | KEEP (reusable) |
| bridge/mapper/ | Static reference maps | KEEP (input adaptation) |

**No duplicates to remove** — each serves distinct purpose.

## Entry Points (3)

1. **GitHub Action** — `.github/workflows/agent-run.yml` → `node src/main.js`
2. **CLI** — `node src/main.js` (direct execution)
3. **Bridge adapter** — `bridge/issue-adapter.js` (normalized input)

**All feed into same LangGraph pipeline** — no conflict.

## Agent-Core Directory (OBSOLETE)

`agent-core/` directory exists but contains:
- Source files already merged to `core/`
- Templates already merged to `templates/`
- Config already merged to `core/config/`
- Tests already adapted

**Action**: DELETE `agent-core/` — no unique logic remains.

## ObsidianMain (C:\obsidian\Main)

Contents: `.github/`, `.work/`, `adapters/`, `agent-os/`, `ai-dev-orchestration-system/`, `runtime/`, `shared/`, `vault/`, etc.

**Analysis**: Contains COPIES of the engine (ai-dev-orchestration-system subdirectory), NOT logic.
- `.work/` = workspace for issue execution
- `adapters/` = input adapters
- `agent-os/` = agent OS experiments
- `ai-dev-orchestration-system/` = engine copy (submodule pattern)

**No custom agent logic found** — INPUT ONLY confirmed.

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Agent definitions | 5 roles × 2 representations | KEEP |
| Pipelines | 2 (config + graph) | KEEP |
| Duplicate logic | 0 | N/A |
| Entry points | 3 | KEEP |
| agent-core directory | 1 | **DELETE** |
| ObsidianMain logic | 0 | CONFIRMED INPUT-ONLY |
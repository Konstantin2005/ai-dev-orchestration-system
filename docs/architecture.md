# Architecture

## System Design
```
[GitHub Issue] → [GitHub Actions] → [LangGraph Execution Engine] → [Zero-Trust Validation] → [File Write] → [PR]
                                            │
                                    ┌───────┴───────┐
                                    ▼               ▼
                             LangGraph (primary)  Legacy (fallback)
```

## Pipeline (Graph-Based)
```
START → orchestrator → architect → [backend, frontend] (parallel) → qa → reviewer → END
                                        │                            │
                                        └── QA invalid ──────────────┤
                                        │     (attempts < 2)        │
                                        │                            │
                                        └────────────────────────────┘
                                                              │
                                                    CHANGES_REQUESTED → architect (redo)
                                                    READY_FOR_PR → validate-output.js → PR
```

## Directory Structure
```
/core                — orchestrator engine, agent roles, system rules
/runtime             — execution model, context, validation, AI layer
  /graph             — LangGraph execution engine (state, nodes, edges)
    /nodes           — 6 agent nodes + legacy fallback
    /traces          — execution trace logs
  legacy-pipeline.sh — curl-based fallback
  validate-output.js — zero-trust JSON validator
/.github/workflows   — GitHub Actions CI/CD (agent-run.yml)
/workspace           — generated per-issue workspaces
/templates           — agent role templates with checklists
/docs                — architecture, decisions, migration
/test                — test suite (50 tests)
```

## Security Model
- Zero trust: all inputs validated
- Strict JSON schema enforcement
- Path whitelist + extension allowlist
- Prompt injection protection (system != user messages)
- Graph node outputs validated before state updates

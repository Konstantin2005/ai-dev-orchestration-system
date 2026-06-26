# Shared Context — Issue #9

## Issue
- ID: 9
- Title: Новая система (LangGraph Integration)
- Slug: new-system

## Status
- architect: done
- backend: done
- frontend: done
- qa: done
- reviewer: done
- overall: **DONE**

## Decisions (ADRs)
- ADR-1: @langchain/langgraph (JS/TS) — ACCEPTED
- ADR-2: Hybrid with legacy fallback — ACCEPTED
- ADR-3: Central state as JS object — ACCEPTED
- ADR-4: File writes after graph + validation — ACCEPTED
- ADR-5: Traces in /workspace/traces/ — ACCEPTED
- ADR-6: Gradual node-by-node migration — ACCEPTED

## Review Findings
- Critical: 1 (legacy-pipeline.sh missing — FIXED)
- Major: 4 (3 FIXED, 1 minor remaining)
- Minor: 4
## Created Files
- runtime/graph/index.js
- runtime/graph/state.js
- runtime/graph/edges.js
- runtime/graph/openai.js
- runtime/graph/package.json
- runtime/graph/nodes/orchestrator.js
- runtime/graph/nodes/architect.js
- runtime/graph/nodes/backend.js
- runtime/graph/nodes/frontend.js
- runtime/graph/nodes/qa.js
- runtime/graph/nodes/reviewer.js
- runtime/graph/nodes/legacy-fallback.js
- runtime/legacy-pipeline.sh
- .github/workflows/agent-run.yml
- package.json
- package-lock.json
- .nvmrc
- .editorconfig
- .env.example
- LICENSE
- test/state.test.js
- test/edges.test.js
- test/index.test.js
- test/validate-output.test.js
- test/openai.test.js
- docs/architecture.md (updated)

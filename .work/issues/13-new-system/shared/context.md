# Shared Context — Issue #13 (New System)

## Pipeline Status
- [x] ARCHITECT — plan.md, architecture.md, decisions.md
- [x] BACKEND — Aider adapter, Sweep AI adapter, Marketplace, Comparison Engine
- [x] FRONTEND — Architect node: type + marketplace support
- [x] QA — test cases + 17 automated tests (all pass)
- [x] CODE REVIEW — approved, ready for push

## New Files
- `agents/manifests/aider.json` — type: code
- `agents/manifests/sweep.json` — type: hybrid
- `agents/adapters/aider-adapter.js` — CLI-based code editing
- `agents/adapters/sweep-adapter.js` — Sweep-like pattern
- `agents/marketplace.js` — parallel multi-agent execution
- `agents/comparison-engine.js` — 6 criteria comparison

## Modified Files
- `agents/manifests/*.json` — added type + capabilities
- `agents/selection-engine.js` — added suggestForMarketplace + type classification
- `runtime/graph/nodes/architect.js` — added selectedType + marketplaceCandidates

## Key Metrics
- 7 new agent types: graph, conversational, code, hybrid
- 7 agents in registry: LangGraph, AutoGen, CrewAI, MetaGPT, Aider, Sweep AI, Custom
- 6 comparison criteria: speed, correctness, determinism, cost, code quality, stability
- Marketplace: single mode + parallel N-agent execution

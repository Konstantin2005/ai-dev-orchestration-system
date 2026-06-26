# Shared Context — Issue #14 (AI Control Plane)

## Pipeline Status
- [x] ARCHITECT — plan.md, architecture.md, decisions.md
- [x] BACKEND — Control Plane (index.js, router.js, global-state.js, multi-repo-adapter.js)
- [x] OBSERVABILITY — logger.js with 4 log files
- [x] MARKETPLACE — smart mode (compare_agents + ComparisonEngine integration)
- [x] SELECTION ENGINE — historical performance scoring added
- [x] FRONTEND — Architect node: agent ranking, fallback, marketplace recommendation
- [ ] QA — test cases + automated tests
- [ ] CODE REVIEW — pending

## New Files
- `control-plane/index.js` — Control Plane orchestrator
- `control-plane/router.js` — Repo + task routing engine
- `control-plane/global-state.js` — Shared context store (JSON-persisted)
- `control-plane/multi-repo-adapter.js` — Cross-repo execution
- `observability/logger.js` — Structured JSON logger (4 files)

## Modified Files
- `agents/marketplace.js` — added `smart` mode with ComparisonEngine integration
- `agents/selection-engine.js` — added `historicalPerformance` scoring dimension
- `runtime/graph/nodes/architect.js` — upgraded prompt + output with agentRanking, recommendMarketplace, fallbackName

## Repos
- ai-dev-orchestration-system (primary)
- ObsidianMain (detected from body/localPath)

## Key Features
- `ControlPlane.handleIssue()` — routes, logs, updates state
- Router detects target repo + classifies task type (feature/bug/refactor/research/testing)
- Agent strategy adapts per task type
- `compare_agents: true` triggers parallel execution + ComparisonEngine
- Architect now outputs `agentStrategy.compareMode` and `agentRanking`

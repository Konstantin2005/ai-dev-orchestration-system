# Plan — AI Control Plane for Multi-Repo Development

## Goal
Extend the existing AI Dev Orchestration System into a full **Control Plane Platform** that manages multiple repositories, agent frameworks, and execution engines.

## Non-Goals
- Rewrite existing LangGraph pipeline
- Remove GitHub Actions flow
- Break backward compatibility

## Phases

### Phase 1: Control Plane Core
- `control-plane/index.js` — entry point, orchestrates all layers
- `control-plane/router.js` — repo + task routing engine
- `control-plane/global-state.js` — shared context store

### Phase 2: Observability
- `observability/execution-trace.log`
- `observability/agent-performance.log`
- `observability/repo-routing.log`
- `observability/cost-tracking.log`
- `observability/logger.js` — structured logging to files

### Phase 3: Agent Marketplace Upgrade
- Add dynamic scoring to marketplace
- Integrate Comparison Engine as optional step
- Support `compare_agents: true` mode

### Phase 4: Smart Architect Upgrade
- Architect compares agent strategies
- Outputs ranking + reasoning + fallback
- Passes `marketplaceCandidates` with scores

### Phase 5: Multi-Repo Execution
- `control-plane/multi-repo-adapter.js` — clone/execute/PR across repos
- Cross-repo context aggregation

### Phase 6: Integration + QA + Docs
- Wire all layers together
- Tests for routing, multi-repo, observability
- Code review + final commit

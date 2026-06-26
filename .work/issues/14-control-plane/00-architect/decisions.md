# Decisions Log — Issue #14

## Decision 1: Control Plane as a module, not a separate service
- **Decision**: Place control-plane/ as a directory inside the existing project, not a separate microservice
- **Reasoning**: The issue says "no rewrite, no break". A separate service would require API contracts, networking, auth — too invasive.
- **Alternative considered**: Separate microservice — rejected due to complexity and risk of breaking existing flow.
- **Trade-off**: The system is not truly distributed, but it becomes a modular monolith that can be extracted later.

## Decision 2: Global State as JSON file, not a database
- **Decision**: Persist to `shared/global-state.json`
- **Reasoning**: Zero infrastructure dependencies. Easy to inspect, debug, and version. The system is local-first.
- **Alternative considered**: SQLite, Redis — overkill for current scale.
- **Trade-off**: No concurrent write safety, but the system is single-instance.

## Decision 3: Observability via file logging, not a dashboard
- **Decision**: 4 rotating log files in `observability/`
- **Reasoning**: The issue asks for observability, not monitoring. Log files are simple, parsable, and can be fed into a future dashboard (Grafana, Datadog).
- **Alternative considered**: OpenTelemetry — too heavy. Simple structured JSON logs are future-proof.

## Decision 4: Multi-Repo via cloning, not git submodules
- **Decision**: Clone target repos into temp dirs, execute, PR back
- **Reasoning**: The system issues come from different repos (ObsidianMain). Cloning is the universal mechanism.
- **Alternative considered**: Git submodules — too coupled. Subtree — complex.

## Decision 5: Smart Architect as prompt extension, not a new node
- **Decision**: Extend existing Architect node prompt with agent ranking data
- **Reasoning**: The LangGraph pipeline should not be modified. Adding a new node means new edges, new state, potential breakage.
- **Trade-off**: Less structured output, but zero risk to existing flow.

## Decision 6: `compare_agents` as an execution mode, not a separate pipeline
- **Decision**: Marketplace accepts `compare_agents: true` flag, runs parallel + ComparisonEngine
- **Reasoning**: Reuses existing `AgentMarketplace` and `ComparisonEngine`. No new graph nodes needed.
- **Alternative considered**: New `benchmark` graph node — too invasive.

## Verdict: Is this a real AI Control Plane?
**Yes, but limited.** The system now routes across repos, selects agents dynamically, benchmarks them, and logs execution. It is not Kubernetes-level (no reconciliation loops, no multi-tenancy), but it meets the definition of a **Control Plane for AI-powered development** — it controls execution flow, manages agent selection, and orchestrates multi-repo operations. The architecture is designed to evolve toward a full distributed control plane.

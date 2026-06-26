# Architectural Decisions — Pluggable AI Agent OS

## ADR-12-1: Agent Registry with File-Based Manifests
- **Context:** Need to define available agents without database
- **Decision:** JSON manifests in `agents/manifests/` loaded at startup
- **Alternative considered:** SQLite, YAML config, inline code
- **Rationale:** Simple, versionable, reviewable, no infra dependency

## ADR-12-2: Adapter Pattern for Agent Diversity
- **Context:** Different agent frameworks have different APIs
- **Decision:** Adapter pattern with unified `AgentAdapter` base class
- **Alternative considered:** Forcing all agents to same API, microservices
- **Rationale:** Wrapping is cheaper than rewriting; allows gradual migration

## ADR-12-3: LangGraph as Default + Fallback
- **Context:** Existing system is LangGraph-based
- **Decision:** LangGraph adapter is DEFAULT; other adapters are OPTIONAL
- **Alternative considered:** Make all adapters equal, remove LangGraph default
- **Rationale:** Zero disruption for existing users; external adapters degrade gracefully

## ADR-12-4: Selection Engine Scores, Not Rules
- **Context:** Need dynamic agent selection per task
- **Decision:** Weighted scoring model (not hardcoded if/then)
- **Alternative considered:** Rule engine, ML classification, manual selection
- **Rationale:** Scoring is transparent, debuggable, configurable via manifest weights

## ADR-12-5: Benchmark by Running Same Task
- **Context:** Comparison requires identical task execution
- **Decision:** Benchmark runs same prompt through N agents, compares outputs
- **Alternative considered:** Static analysis of agents, historical performance
- **Rationale:** Empirical comparison > theoretical; catches runtime issues

## ADR-12-6: Existing Architect Node Modified, Not Replaced
- **Context:** Architect currently plans task execution
- **Decision:** Add `selectAgent()` call at start of architect; keep existing planning
- **Alternative considered:** Dedicated "selector" node before architect
- **Rationale:** Architect already understands task context; adding selection is natural

## ADR-12-7: Docker for External Frameworks
- **Context:** AutoGen, CrewAI, MetaGPT are Python-based
- **Decision:** JS project runs them via child_process + Docker
- **Alternative considered:** NPM-only, gRPC, HTTP API
- **Rationale:** Isolated dependencies, version control, no global install

## ADR-12-8: Benchmark Report as Markdown
- **Context:** Comparison results must be human-readable
- **Decision:** Output markdown report compatible with GitHub PR comments
- **Alternative considered:** JSON only, HTML, embedded charts
- **Rationale:** Markdown renders natively in GitHub; easy to extend

## ADR-12-9: Agent Registry is Read-Only at Runtime
- **Context:** Registry must be stable during execution
- **Decision:** Registry loaded once at startup; not modified during graph run
- **Alternative considered:** Dynamic registration, hot-reload
- **Rationale:** Deterministic execution; no race conditions between agents

## ADR-12-10: Staged Rollout of Adapters
- **Context:** 4+ adapter implementations is large scope
- **Decision:** Phase 1 = Registry + LangGraph adapter + Selection Engine
- **Phase 2 =** AutoGen + CrewAI adapters
- **Phase 3 =** MetaGPT + Benchmark Layer
- **Rationale:** Deliver value incrementally; each phase independently testable

# Architectural Decisions

## ADR-1: Use @langchain/langgraph (JavaScript/TypeScript)

- **Context:** Current system is Node.js/JavaScript. The pipeline runs on ubuntu-latest with Node.js.
- **Decision:** Use `@langchain/langgraph` npm package instead of Python LangGraph.
- **Rationale:** No need to introduce Python runtime. Direct integration with existing validate-output.js. Same language, same ecosystem.
- **Alternatives considered:** Python LangGraph (would require Python runtime on runner, dual-language complexity), Custom graph engine (redundant with existing library).
- **Status:** ACCEPTED

## ADR-2: Hybrid Execution with Fallback

- **Context:** The system must never fail to produce a PR.
- **Decision:** LangGraph is primary engine, legacy curl pipeline is fallback.
- **Rationale:** If LangGraph encounters an error (dependency issue, schema mismatch, etc.), the existing pipeline ensures continuity.
- **Alternatives considered:** Full replacement (too risky, breaks existing issues), Parallel execution both (wasteful).
- **Status:** ACCEPTED

## ADR-3: Graph state as single JavaScript object

- **Context:** LangGraph manages state internally. We need to map to existing JSON schema.
- **Decision:** Define central state as a JS object that mirrors the existing output schema + execution metadata.
- **Rationale:** The final output after reviewer node must match the existing schema for validate-output.js. Adding execution metadata fields doesn't break compatibility.
- **Status:** ACCEPTED

## ADR-4: File generation deferred to post-graph

- **Context:** Current system writes files during pipeline execution.
- **Decision:** Graph nodes produce file descriptors (path + content), actual file writes happen AFTER graph completes and passes validation.
- **Rationale:** Zero-trust principle — no filesystem writes during AI execution. validate-output.js is the gate.
- **Alternatives considered:** Write during graph execution (violates zero-trust model).
- **Status:** ACCEPTED

## ADR-5: Workspace traces directory

- **Context:** Need observability per execution.
- **Decision:** Store execution traces in /workspace/traces/<issue-id>.json
- **Rationale:** Separate from generated workspace files. Easy to debug. Structured JSON for machine parsing.
- **Status:** ACCEPTED

## ADR-6: Gradual migration (node-by-node)

- **Context:** 5 agent roles plus orchestrator.
- **Decision:** Implement one node at a time, starting with orchestrator + architect.
- **Rationale:** Minimize risk. Each node can be tested independently. Early validation of the graph architecture.
- **Status:** ACCEPTED

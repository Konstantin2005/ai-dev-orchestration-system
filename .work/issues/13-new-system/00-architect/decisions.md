# Architectural Decisions — Issue #13 (Delta)

## ADR-13-1: Marketplace as Separate Module
- **Context:** Parallel multi-agent execution is distinct from single-agent pipeline
- **Decision:** New `agents/marketplace.js` module (not a graph node)
- **Rationale:** Marketplace can run outside graph (CLI), doesn't change existing flow

## ADR-13-2: Comparison Engine v2
- **Context:** Issue #12 benchmark was task-fit focused; Issue #13 needs execution quality metrics
- **Decision:** New `agents/comparison-engine.js` with 6 criteria (speed, correctness, determinism, cost, code quality, stability)
- **Rationale:** Execution quality differs from selection criteria; separate concerns

## ADR-13-3: Aider via CLI, Not Library
- **Context:** Aider is a CLI tool, not an NPM package
- **Decision:** Spawn child_process with `aider --no-git --message`
- **Rationale:** No NPM wrapper; CLI is the canonical API

## ADR-13-4: Sweep AI as Pattern, Not Integration
- **Context:** Sweep AI is closed-source SaaS
- **Decision:** Implement Sweep-like pattern (plan → code → PR) as a hybrid adapter
- **Rationale:** Can't integrate directly; pattern is well-documented

## ADR-13-5: Agent Type Classification
- **Context:** Need to categorize agents for better selection
- **Decision:** Add `type` + `capabilities` to manifest
- **Rationale:** Enables type-specific selection logic without hardcoding agent IDs

## ADR-13-6: Parallel Execution via Promise.all
- **Context:** Need to run multiple agents concurrently
- **Decision:** Promise.all with individual timeouts per agent
- **Rationale:** Native Node.js concurrency, no extra dependencies

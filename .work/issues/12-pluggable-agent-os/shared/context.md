# Shared Context — Pluggable AI Agent OS

## Pipeline Status
- [x] ARCHITECT — plan.md, architecture.md, decisions.md (10 ADRs)
- [x] BACKEND — Agent Registry, Interface, Selection Engine, 5 Adapters, Benchmark, Architect upgrade
- [ ] FRONTEND — CLI commands (deferred to Phase 2)
- [x] QA — 35 test cases + test/agent-registry.test.js (15 tests)
- [ ] CODE REVIEW — pending

## Key Decisions
- Agent Registry with JSON manifests (file-based)
- Adapter pattern with unified AgentAdapter base class
- LangGraph adapter is DEFAULT; other adapters optional
- Selection Engine uses weighted scoring (5 dimensions)
- Docker for Python-based frameworks (AutoGen, CrewAI, MetaGPT)
- Staged rollout: Phase 1 done, Phase 2 (AutoGen + CrewAI real integration), Phase 3 (MetaGPT + Benchmark CLI)

## Files Created
| File | Purpose |
|------|---------|
| `agents/registry.js` | Agent Registry (load, list, get, find, compare) |
| `agents/interface.js` | AgentAdapter base class |
| `agents/selection-engine.js` | Weighted scoring agent selection |
| `agents/benchmark.js` | Benchmark engine with markdown reports |
| `agents/manifests/*.json` | 5 agent metadata files |
| `agents/adapters/*-adapter.js` | 5 adapter implementations |
| `runtime/graph/nodes/architect.js` | MODIFIED: added agent selection |
| `test/agent-registry.test.js` | 15 tests for Registry + Selection + Benchmark |

## Key Metrics
- 8 new files + 5 manifests
- ~1,200 lines of JS code
- 15 automated tests
- 35 documented test cases
- 10 ADRs
- 5 agent frameworks supported

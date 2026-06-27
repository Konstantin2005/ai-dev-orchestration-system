# Research Index — 2026-06-27

## Overview
Deep analysis of the AI Dev Orchestration System repository, comparing against industry leaders (GitHub Copilot, Cursor, Devin, OpenDevin, MetaGPT) and documenting the complete technical inventory.

---

## Documents

| # | File | Type | Description |
|---|------|------|-------------|
| 01 | `01-architecture-gap-analysis.md` | **Architecture Gap Analysis** | 12-dimension comparison matrix, 20 prioritized issues (P0-P3), files to delete, new file structure, acceptance criteria, success metrics, reference implementations |
| 02 | `02-gap-report-vs-giants.md` | **Gap Report vs Industry Giants** | Detailed breakdown across Architecture, Agent Intelligence, Context/Memory, Code Generation, GitHub Integration, Multi-Model, Testing, Observability, Security, Scalability, DX. Includes feature parity matrix (14 features × 6 tools) |
| 03 | `03-technical-inventory.md` | **Technical File-by-File Inventory** | Complete audit: what works (LangGraph pipeline, Agent Registry, GitHub, Target Repo, Path Resolver, Zero-Trust, Control Plane, Agent Core), dead code to delete, config files, test suite, execution modes, security audit, performance baseline, immediate action items |

---

## Key Findings Summary

### 🔴 Critical (P0 - Do First)
1. **Unify execution** — Remove `core/pipeline.js`, `core/orchestrator.js`, use only `runtime/graph/`
2. **Add checkpoints** — LangGraph PostgreSQL/Redis checkpointer for crash recovery
3. **Tool-using agents** — Replace template rendering with function calling (fs, shell, test, web)
4. **Sandbox execution** — Docker/gVisor for safe code execution
5. **Fix prompt injection** — Sanitize issue body, separate system/user messages

### 🟡 High (P1 - Parity)
6. **GitHub App** — Replace webhook with App + installation tokens + PR automation
7. **Vector memory** — pgvector/Pinecone for cross-issue learning + codebase indexing
8. **Multi-model router** — Claude-3.5-Sonnet (coding), GPT-4o (planning), local fallback
9. **Type-safe generation** — TS/Python compilation in pipeline
10. **Real test execution** — Jest/Vitest/PyTest runners with coverage

### 📊 Current State
| Metric | Value |
|--------|-------|
| **Working pipeline** | LangGraph 6-node graph (orchestrator→architect→[backend,frontend]→qa→reviewer→validate→write) |
| **Agent registry** | 7 manifests (langgraph, metagpt, autogen, crewai, aider, sweep, custom) |
| **GitHub integration** | Webhook + label state machine (brittle) |
| **Output** | Markdown only (no executable code) |
| **Security** | ❌ Prompt injection, ❌ Sandbox, ❌ Rate limiting |
| **Tests** | 25+ files, all passing (`npm test`) |
| **Perf** | 15-40s/issue, ~$0.03-0.06, 15-30K tokens |

### 🗑️ Dead Code (Safe to Delete)
```
core/           ← entire directory (duplicate pipeline)
engine/         ← bootstrap.sh only
templates/      ← old markdown templates
runtime/orchestration/  ← deprecated execution model
runtime/bridge/ ← unused
runtime/adapter/← partial
runtime/router/ ← unused stub
```

---

## Related GitHub Issues

- **#84** — Architecture Gap Report (this research)
- **#85** — Technical Inventory (this research)

---

## Next Research Cycle
Recommended: 2026-07-27 (30 days) — Focus on P0 implementation progress and updated benchmarks.
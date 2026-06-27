# Full System Detection Report

**Generated:** 2026-06-27
**Repository:** `ai-dev-orchestration-system`
**Total JS code:** 11,032 lines (130 files)
**Test files:** 27 (1,005 KB)
**Agent-core files:** 29
**Workflow files:** 3 (GitHub Actions)

---

## 1. Architecture Overview

```
ai-dev-orchestration-system/
├── agent-core/          # Agent framework (src/)
├── agents/              # Agent registry, selection, comparison
├── runtime/             # Core engine (control-plane, github, graph, orchestration)
├── adapters/            # External adapter plugins
├── validators/          # Zero-trust validation
├── bin/                 # CLI entry point
├── .github/workflows/   # CI/CD pipelines
├── .work/               # Workspace (issues, templates, monitor)
└── test/                # 27 test files
```

---

## 2. Runtime Engine (11 modules, ~4,600 lines)

### 2.1 Control Plane (`runtime/control-plane/`, 266 lines)

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| `UnifiedOrchestrator` | `orchestrator.js` | ✅ | Issue lifecycle: route → schedule → delegate → validate → PR |
| `StateManager` | `state-manager.js` | ✅ | In-memory cache + journal log + periodic flush (30s/100 changes) |
| `Scheduler` | `scheduler.js` | ✅ | Binary search insert O(log n), max 100, shift() on overflow |
| `CentralLogger` | `central-logger.js` | ✅ | Buffered async file logger, max depth 5, periodic flush 5s |

### 2.2 GitHub Integration (`runtime/github/`, 581 lines)

| Component | File | Status |
|-----------|------|--------|
| GitHub Client | `client.js` | ✅ | Octokit REST API wrapper |
| State Labels | `state.js` | ✅ | Pipeline step tracking via GitHub labels |
| Pipeline | `pipeline.js` | ✅ | Issue → sub-issue → step execution |
| Webhook Server | `server.js` | ✅ | Express webhook receiver on :3000 |
| Webhook Router | `webhook.js` | ✅ | Issue events + comment routing |
| Health Check | `health.js` | ✅ | GET /health endpoint |
| GitHub App State | `state.js` | ✅ | Multi-repo state tracking |

### 2.3 Graph Pipeline (`runtime/graph/`, 424 lines + 894 lines nodes/writers)

**Pipeline nodes:**

| Node | File | Function |
|------|------|----------|
| Orchestrator | `nodes/orchestrator.js` | Accepts issue, creates plan, routes to agents |
| Architect | `nodes/architect.js` | Architecture design, decisions, plan |
| Backend | `nodes/backend.js` | API, business logic, endpoints |
| Frontend | `nodes/frontend.js` | UI, forms, states |
| QA | `nodes/qa.js` | Test cases, edge cases, validation |
| Review | `nodes/reviewer.js` | Security, bugs, quality review |
| Validation | `nodes/validation.js` | Zero-trust output validation |
| Execution Loop | `nodes/execution-loop.js` | Iterative fix loop up to N attempts |
| Merge | `nodes/merge.js` | PR creation / branch merge |
| File Writer | `writers/file-writer.js` | Write AI output to disk |
| Edges | `edges.js` | Conditional routing between nodes |

**Pipeline flow:**
```
Issue → Orchestrator → Architect → Backend + Frontend (parallel)
  → QA → [fix loop] → Execution Loop → Reviewer → [fix loop]
  → Validation → File Writer → PR
```

### 2.4 Orchestration (`runtime/orchestration/`, 1,034 lines)

| Component | Lines | Description |
|-----------|-------|-------------|
| `autonomous-runner.js` | 8,624 | Full pipeline orchestration |
| `sub-issue-processor.js` | 8,191 | Sub-issue creation and management |
| `execution-loop.js` | 6,559 | Iterative execution with feedback |
| `agent-runtime.js` | | Agent execution context |
| `logger.js` | | Structured logging (JSON) |
| `task.js` | | GitHub issue task lifecycle |
| `progress.js` | | Progress tracking via comments |
| `model-router.js` | | AI model routing per agent type |

### 2.5 Adapters (`runtime/adapter/`, 258 lines)

| Adapter | File | Description |
|---------|------|-------------|
| Interface | `interface.js` | Abstract adapter base class |
| GitHub | `github.js` | GitHub API + exec async push |
| LocalFS | `localfs.js` | Local filesystem operations |

### 2.6 Router (`runtime/router/`, 23 lines)

| Component | Description |
|-----------|-------------|
| `multi-repo-router.js` | Pure function `route()` — stateless, maps issues to repos |

### 2.7 Sandbox (`runtime/sandbox/`, 127 lines)

| Component | Description |
|-----------|-------------|
| `executor.js` | Code execution sandbox (node/python/bash) |

### 2.8 Target Repo (`runtime/target-repo/`, 106 lines)

| Component | Description |
|-----------|-------------|
| `manager.js` | Git clone, branch, commit, push, analyze |

### 2.9 Config (`runtime/config/`, 292 lines)

| Component | Description |
|-----------|-------------|
| `loader.js` | YAML config loading + repository management |
| `key-manager.js` | Multi-provider API key detection |

### 2.10 Validation (`runtime/validation/`, 49 lines)

| Component | Description |
|-----------|-------------|
| `zero-trust.js` | File validation: extension, size, path, content patterns, encoding, state field, stub detection |

---

## 3. Agent Core (`agent-core/`, 29 files, ~2,300 lines)

### 3.1 Agents (`src/agents/`)

| Agent | File | Lines | Description |
|-------|------|-------|-------------|
| Architect | `architect.js` | 1,347 | Architecture design |
| Backend | `backend.js` | 1,022 | API implementation |
| Frontend | `frontend.js` | 946 | UI generation |
| QA | `qa.js` | 950 | Test creation |
| Reviewer | `reviewer.js` | 978 | Code review |

### 3.2 Task Queue (`src/task-queue/`)

| Component | File | Lines | Description |
|-----------|------|-------|-------------|
| Task Schema | `task-schema.js` | 2,197 | Task state machine |
| Task Runner | `task-runner.js` | 3,020 | Execute/validate with deep clone |
| Error Capture | `error-capture.js` | 2,213 | Circuit breaker + rate limiter |
| Task Normalizer | `task-normalizer.js` | 1,553 | Input normalization |

### 3.3 Telemetry (`src/telemetry/`)

| Component | File | Lines | Description |
|-----------|------|-------|-------------|
| Error Collector | `error-collector.js` | 2,310 | SHA-256 dedup, buffered flush |
| Error Logger | `error-logger.js` | 1,439 | Singleton, wrap/handler helpers |
| Transport | `transport.js` | 2,030 | Git-based error transport |
| Fallback Storage | `fallback-storage.js` | 747 | Persistent fallback |
| Hooks | `hooks.js` | 1,736 | Agent/pipeline/template telemetry hooks with reentrant guard |

### 3.4 Templates (`src/templates/`)

| Component | Description |
|-----------|-------------|
| Engine | Template rendering engine |
| Loader | Template file loader |
| Registry | Template registry |

### 3.5 Shared (`src/shared/`)

| Component | Description |
|-----------|-------------|
| Context | Shared context management |
| Memory | Issue memory/store |

### 3.6 Bridge (`src/bridge/`)

| Component | Description |
|-----------|-------------|
| Agent Mapper | Agent-to-pipeline mapping |
| Pipeline Mapper | Pipeline definition mapping |
| Template Adapter | Template integration |

### 3.7 Templates (`templates/`)

8 templates: architecture.md, backend-api.md, context.md, decisions.md, frontend-ui.md, plan.md, qa-tests.md, review.md

---

## 4. Agents System (`agents/`, 790 lines)

| Component | File | Description |
|-----------|------|-------------|
| Registry | `manifest-registry.js` | Agent manifest loading |
| Selection Engine | `selection-engine.js` | Agent selection by task type |
| Comparison Engine | `comparison-engine.js` | Agent comparison and scoring |
| Benchmark Engine | `benchmark-engine.js` | Performance benchmarking |

### Agent Adapters (`agents/adapters/`, 443 lines)

| Adapter | Description |
|---------|-------------|
| LangGraph Adapter | LangGraph pipeline execution |
| Aider Adapter | Aider CLI integration |
| Sweep AI Adapter | Sweep AI pattern integration |
| Custom Agent | Generic custom agent wrapper |
| Docker Agent | Docker-based execution |

---

## 5. Infrastructure

### 5.1 GitHub Actions (3 workflows)

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `agent-run.yml` | issue opened/labeled + workflow_dispatch | AI agent pipeline in standalone or submodule mode |
| `monitor-sync.yml` | repository_dispatch | Receives sync from ObsiduanMain |
| `monitor-poller.yml` | cron */30 * * * * | Periodic polling of target repo issues |

### 5.2 Bridge Monitor (`.work/monitor/`)

| Component | Description |
|-----------|-------------|
| `bridge.ps1` | Local polling + GitHub API sync |
| `github-bridge.md` | Documentation |
| `synced-issues/` | 22 synced issue dirs (130 .md files with BOM) |

### 5.3 Templates (`.work/templates/`)

7 templates: architect.md, architecture.md, backend-engineer.md, code-reviewer.md, context.md, frontend-engineer.md, qa-engineer.md

---

## 6. Tests (27 test files)

### Unit Tests
| Test | File | Coverage |
|------|------|----------|
| Adapters | `adapter-interface.test.js`, `adapter-localfs.test.js`, `adapter-registry.test.js` | Interface, LocalFS, Registry |
| Agents | `agent-registry.test.js`, `agent-marketplace.test.js` | Registry, Marketplace |
| Bridge | `bridge-adapter.test.js` | Issue normalization |
| Config | `config-loader.test.js` | Config init/read/repos |
| Control Plane | `state.test.js` | State management |
| Edges | `edges.test.js` | All pipeline routers |
| GitHub | `github-state.test.js`, `github-webhook.test.js` | Labels, webhooks |
| Orchestration | `orchestration-*.test.js` (6 files) | Logger, task, runtime, progress, model router, execution loop |
| Runtime | `runtime-index.test.js` | Module exports |
| Sandbox | `sandbox-executor.test.js` | Code execution |
| Validation | `validate-output.test.js` | All validation rules |
| Target Repo | `target-repo-manager.test.js` | Git operations |
| CLI | `cli.test.js` | Command line |
| Key Manager | `key-manager.test.js` | API key detection |

### Integration Tests
| Test | File | Coverage |
|------|------|----------|
| Full Pipeline | `test/e2e/pipeline.test.js` | Input sanitization, validation, file writer, full pipeline |

---

## 7. Security & Quality Gates

| Gate | Where | What it checks |
|------|-------|----------------|
| Zero Trust | `validate-output.js`, `zero-trust.js`, `validation.js` | Extensions, path patterns, content patterns, max size, max files |
| Encoding | `validate-output.js`, `zero-trust.js`, `validation.js` | UTF-8 BOM for .md, no replacement chars (\\uFFFD) |
| State Field | `validate-output.js`, `zero-trust.js`, `validation.js` | `state:` required in context.md |
| Stub Guard | `validate-output.js`, `zero-trust.js`, `validation.js` | .md files < 50 bytes rejected |
| Feedback Loop | `central-logger.js` | Max depth 5 logging recursion |
| State Storm | `state-manager.js` | In-memory cache + journal, periodic flush |
| Circuit Breaker | `error-capture.js` | OPEN/HALF-OPEN/CLOSED, 30s timeout |
| Rate Limiter | `error-capture.js` | 10 errors/min per source |
| SHA Dedup | `error-collector.js` | SHA-256 fingerprint, 60s window |
| Reentrant Guard | `hooks.js` | Global `_capturing` flag prevents telemetry recursion |
| Deep Clone | `task-runner.js` | JSON.parse/JSON.stringify prevents state mutation |
| Async Git | `github.js` | `exec` not `execSync` for push |

---

## 8. Issue Status

### Closed (6 issues — our fixes)
| # | Title | Fix |
|---|-------|-----|
| 116 | Cleanup empty work dirs | Validation guard + scheduler overflow fix |
| 117 | Encoding corruption | UTF-8 BOM for all .md, 130 files fixed |
| 118 | State tracking | `state:` field in context.md template |
| 119 | Stub tasks | MIN_MD_FILE_SIZE=50 rejection |
| 120 | Cross-ref #115 | Sub-task linking in pipeline |
| 121 | Apply 10 bugs | All 10 reviewer bugs fixed |

### Remaining Open (~70 in ObsiduanMain)
Pipeline sub-tasks for: #2, #3, #4, #8, #9, #11, #12, #15, #16, #54, #55
Standalone issues: #13, #14, #20-#36, #57-#66, #73, #74, #86-#102

---

## 9. NPM Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@langchain/langgraph` | ^0.2.0 | LangGraph state machine |
| `@langchain/openai` | ^0.4.0 | OpenAI API client |
| `@octokit/rest` | ^21.0.0 | GitHub API |
| `express` | ^4.21.0 | Webhook HTTP server |

**No production dependencies beyond these 4.**
**No dev dependencies.**

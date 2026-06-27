## Parent Issue: #93

## Role: BACKEND ENGINEER (Phases 1, 2, 3)

## Task
Build the unified execution runtime: remove legacy paths, add sandbox execution, implement tool-using ReAct agents.

## Deliverables (in .work/issues/93-architect/01-backend-engineer/):
- [ ] api.md — Execution runtime API
- [ ] implementation.md — Sandbox + tool implementations
- [ ] data-model.md — Execution state, tool results

## Specific Requirements

### Phase 1: Unify Architecture (CRITICAL - Week 1)
- [ ] **Delete Legacy Code**
  - [ ] Remove `core/` directory entirely
  - [ ] Remove `engine/` directory entirely
  - [ ] Remove `templates/` (root) entirely
  - [ ] Remove `runtime/orchestration/` entirely
  - [ ] Remove `runtime/bridge/`, `runtime/adapter/`, `runtime/router/`
  - [ ] Remove `runtime/validate-output.js`, `runtime/validation.md`
  - [ ] Verify all imports resolve to `runtime/graph/` only

- [ ] **Single Entry Point**
  - [ ] `runtime/graph/index.js` = only executor
  - [ ] `npm run graph:run` = only CLI command
  - [ ] Remove any fallback logic in edges.js

- [ ] **LangGraph Checkpointer** (`runtime/graph/checkpointer/`)
  - [ ] PostgreSQL checkpointer for production
  - [ ] Redis checkpointer for distributed
  - [ ] Memory checkpointer for dev
  - [ ] State serialization: issue, architecture, files, logs, execution trace

### Phase 2: Execution Runtime (CRITICAL - Week 2)
- [ ] **Sandbox Manager** (`runtime/sandbox/`)
  - [ ] `docker-manager.js` — Create/destroy containers, resource limits
  - [ ] `language-detector.js` — Detect: Node, Python, Go, Rust, Java
  - [ ] `test-executor.js` — Run tests, capture stdout/stderr/exit/coverage
  - [ ] `file-sync.js` — Sync generated code → sandbox, results ← sandbox

- [ ] **Sandbox Config** (`.ai-sandbox.json`)
  ```json
  {
    "language": "node",
    "testCommand": "npm test",
    "timeout": 120000,
    "resources": { "cpu": 1, "memory": "512m" },
    "network": "none"
  }
  ```

- [ ] **Execution Integration in Graph**
  - [ ] Add `execute-code` node after backend/frontend
  - [ ] Add `run-tests` node after execute
  - [ ] Feed results back to QA node for analysis
  - [ ] Retry loop: execute → test → fix (max 3)

### Phase 3: Tool-Using ReAct Agents (CRITICAL - Week 3)
- [ ] **Tool Definitions** (`runtime/tools/`)
  - [ ] `file-read.js` — Read file with path validation
  - [ ] `file-write.js` — Write file with path validation
  - [ ] `file-glob.js` — Pattern matching
  - [ ] `shell-exec.js` — Command execution in sandbox
  - [ ] `test-run.js` — Run test suite, return parsed results
  - [ ] `type-check.js` — tsc/mypy/cargo check
  - [ ] `search-code.js` — Ripgrep/ast-grep search
  - [ ] `inspect-repo.js` — AST analysis, dependency graph

- [ ] **Agent Migration** (each node in `runtime/graph/nodes/`)
  - [ ] `architect.js` — Use tools: inspect-repo, search-code, file-read
  - [ ] `backend.js` — Use tools: file-write, shell-exec, test-run, type-check
  - [ ] `frontend.js` — Use tools: file-write, shell-exec, test-run, type-check
  - [ ] `qa.js` — Use tools: test-run, search-code, file-read
  - [ ] `reviewer.js` — Use tools: file-read, search-code, shell-exec

- [ ] **ReAct Loop Implementation**
  - [ ] Each agent: Plan → Act → Observe → Reflect → Retry
  - [ ] Max iterations per agent: 5
  - [ ] Reflection prompt: "What failed? Why? What to try next?"
  - [ ] Tool result caching within iteration

## Acceptance Criteria
- [ ] Zero legacy code paths remain
- [ ] Single graph execution with checkpoint recovery
- [ ] Sandbox executes code, runs tests, returns results
- [ ] All 5 agents use tools (not templates)
- [ ] ReAct loop: agents iterate on failures
- [ ] Execution results feed into next agent
- [ ] Pipeline: orchestrator → architect → [backend,frontend] → execute → test → qa → reviewer → validate → write
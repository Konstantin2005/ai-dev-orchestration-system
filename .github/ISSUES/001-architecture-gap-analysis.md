# Issue #1: Architecture Gap Analysis — From Template Generator to AI Engineering Agent System

## 🎯 Objective
Transform the current template-based pipeline into a production-ready AI engineering agent system comparable to GitHub Copilot, Cursor, Devin, OpenDevin, and MetaGPT.

---

## 📊 Current State vs Target State

| Dimension | Current (Template Generator) | Target (AI Agent System) |
|-----------|------------------------------|--------------------------|
| **Execution** | Dual path: LangGraph + legacy pipeline | Single unified LangGraph with checkpoints |
| **Agents** | 5 roles rendering static markdown templates | Tool-using agents (read/write/execute/test/iterate) |
| **Memory** | File-based JSON in `.work/issues/<id>/shared/` | Vector DB + RAG + persistent checkpoints |
| **Code Output** | Markdown docs only (`plan.md`, `api.md`, `review.md`) | Executable code + tests + config files |
| **Execution Env** | File system only | Sandboxed containers (Docker/gVisor) |
| **GitHub** | Webhook + label state machine | GitHub App with PR automation + review comments |
| **Models** | Single hardcoded `gpt-4o-mini` | Multi-model routing (Claude, GPT-4, local) |
| **Testing** | Schema validation only | Live test execution + type checking + coverage |
| **Observability** | File logs only | OpenTelemetry + metrics + dashboards + alerting |

---

## 🔴 P0 — Critical Blockers (Must Fix First)

### 1.1 Unify Execution Paths
**Files:** `core/pipeline.js`, `core/orchestrator.js`, `core/template-engine/`
**Problem:** Two competing execution systems — LangGraph (`runtime/graph/`) and legacy pipeline (`core/pipeline.js`)
**Fix:** Remove `core/pipeline.js`, `core/orchestrator.js`, `core/template-engine/` entirely. Use only `runtime/graph/`.

### 1.2 Add Persistent Checkpoints
**Files:** `runtime/graph/index.js`, `runtime/graph/state.js`
**Problem:** Execution state lost on crash; no resume capability
**Fix:** Add LangGraph checkpointer (PostgreSQL/Redis)
```bash
npm install @langchain/langgraph-checkpoint-postgres
```

### 1.3 Implement Tool-Using Agents
**Files:** `runtime/graph/nodes/architect.js`, `backend.js`, `frontend.js`, `qa.js`, `reviewer.js`
**Problem:** Agents only render templates via `callOpenAIJSON()` — no file ops, no shell, no test running
**Fix:** Define tool schemas and migrate nodes to function calling:
```typescript
// Tools needed per agent
const tools = {
  fs_read: { path: string },
  fs_write: { path: string, content: string },
  fs_glob: { pattern: string },
  shell_exec: { command: string, timeout: number },
  test_run: { framework: 'jest'|'vitest'|'pytest', path: string },
  type_check: { language: 'ts'|'py', path: string },
  git_diff: { base: string, head: string }
};
```

### 1.4 Add Sandbox Execution
**Files:** New: `runtime/sandbox/`
**Problem:** Zero way to execute generated code safely
**Fix:** Docker/gVisor sandbox with:
- Language detection (Node, Python, Go, Rust)
- Test runner integration
- Network isolation
- Resource limits (CPU, memory, time)

### 1.5 Fix Prompt Injection Vulnerability
**Files:** `runtime/graph/nodes/*.js` (all nodes)
**Problem:** User issue body directly interpolated into prompts
```javascript
// architect.js:66 - VULNERABLE
const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\n${state.issue.body}...`;
```
**Fix:** 
- Sanitize all user inputs
- Use system prompts only for instructions
- Implement prompt injection detection

---

## 🟡 P1 — High Priority (Parity Features)

### 2.1 GitHub App Migration
**Files:** `runtime/github/webhook.js`, `runtime/github/client.js`, New: `.github/app.yml`
**Problem:** Webhook-only, no fine-grained permissions, no PR automation
**Fix:** 
- Create GitHub App manifest with permissions: `contents`, `issues`, `pull_requests`, `checks`, `metadata`
- Implement installation token flow
- Add PR creation, review comments, CI status checks

### 2.2 PR Automation
**Files:** `runtime/graph/nodes/reviewer.js`, New: `runtime/github/pr-manager.js`
**Problem:** Reviewer writes `review.md` to filesystem, no PR interaction
**Fix:**
- Create PR from generated files
- Post review comments on specific lines
- Handle CI failures → auto-fix loop

### 2.3 Vector Memory / RAG
**Files:** `agent-core/src/shared/memory.js`, New: `runtime/memory/vector-store.js`
**Problem:** File-based JSON, no cross-issue learning, no semantic search
**Fix:** Add pgvector/Pinecone/Weaviate for:
- Codebase indexing
- Solution pattern reuse
- Anti-pattern detection
- Context packing with relevance scoring

### 2.4 Multi-Model Router
**Files:** `agents/manifests/langgraph.json`, `runtime/graph/openai.js`, New: `runtime/router/model-router.js`
**Problem:** Hardcoded `gpt-4o-mini`, no complexity-based routing
**Fix:** Route by task:
- Planning/Architecture → Claude-3.5-Sonnet / GPT-4o
- Code generation → Claude-3.5-Sonnet / GPT-4o
- Simple tasks → GPT-4o-mini / local models
- Cost tracking per model

### 2.5 Type-Safe Generation
**Files:** New: `runtime/validation/type-checker.js`
**Problem:** No TypeScript/Python compilation, no import resolution
**Fix:** Add language-specific validators:
- TypeScript: `tsc --noEmit`
- Python: `mypy` / `pyright`
- Go: `go build`
- Rust: `cargo check`

---

## 🟢 P2 — Medium (Competitive Differentiation)

### 3.1 IDE Extension (VS Code)
**Files:** New: `extensions/vscode/`
**Features:** Inline chat, ghost text, file context menu, pipeline status bar

### 3.2 Streaming UI / Web Dashboard
**Files:** New: `web/dashboard/`, `web/api/`
**Features:** Real-time agent progress, token streaming, cost tracking, manual intervention points

### 3.3 Configuration UI
**Files:** New: `web/config/`
**Features:** Pipeline builder, agent config, model selection, budget limits

### 3.4 Plugin System
**Files:** New: `core/plugins/`
**Features:** Custom agents, tools, templates, validators via npm packages

### 3.5 Cost Tracking & Budgets
**Files:** New: `runtime/telemetry/cost-tracker.js`
**Features:** Per-issue token accounting, budget alerts, model cost optimization

---

## 🔵 P3 — Nice to Have

### 4.1 Local LLM Support (Ollama/LM Studio)
### 4.2 OpenTelemetry + Grafana Dashboards
### 4.3 Multi-Tenancy / Org Workspaces / SSO
### 4.4 Community Marketplace (agents, templates, tools)
### 4.5 Benchmark Suite (SWE-bench, HumanEval integration)

---

## 📁 Files to Delete (Dead Code)

```bash
# Duplicate execution path
rm core/pipeline.js
rm core/orchestrator.js
rm -rf core/template-engine/

# Duplicate agent implementations (agent-core/ is separate repo)
# Keep agent-core/ as reference but don't duplicate in main repo
```

---

## 📁 Files to Create (New Architecture)

```
runtime/
├── graph/
│   ├── tools/                 # Tool definitions for function calling
│   │   ├── fs-read.js
│   │   ├── fs-write.js
│   │   ├── fs-glob.js
│   │   ├── shell-exec.js
│   │   ├── test-runner.js
│   │   ├── type-checker.js
│   │   └── git-diff.js
│   ├── checkpointer/          # Persistent state
│   │   └── postgres-checkpointer.js
│   ├── nodes/                 # Refactored to use tools
│   │   ├── architect.js
│   │   ├── backend.js
│   │   ├── frontend.js
│   │   ├── qa.js
│   │   └── reviewer.js
│   └── index.js               # Unified entry point
├── sandbox/                   # Code execution
│   ├── docker-manager.js
│   ├── language-detector.js
│   └── test-executor.js
├── memory/
│   ├── vector-store.js        # pgvector/Pinecone
│   ├── context-packer.js      # Smart context window mgmt
│   └── pattern-library.js     # Cross-issue learning
├── github/
│   ├── app-auth.js            # GitHub App installation tokens
│   ├── pr-manager.js          # PR create/update/comment
│   └── check-manager.js       # CI status checks
├── router/
│   └── model-router.js        # Multi-model selection
└── validation/
    ├── zero-trust.js          # Enhanced
    └── type-checker.js        # Language-specific

.github/
├── app.yml                    # GitHub App manifest
└── workflows/
    └── agent-run.yml          # CI/CD for agent execution

web/
├── dashboard/                 # React/Vue dashboard
├── api/                       # Backend API
└── config/                    # Configuration UI

extensions/
└── vscode/                    # VS Code extension
```

---

## 🧪 Acceptance Criteria

### P0 Complete When:
- [ ] Single execution path via LangGraph only
- [ ] Pipeline survives process crash and resumes from checkpoint
- [ ] Agents can read/write files, run shell commands, execute tests
- [ ] Generated code executes in sandbox and passes tests
- [ ] Prompt injection attempts blocked in automated tests

### P1 Complete When:
- [ ] GitHub App installed on test repo, creates PRs automatically
- [ ] Reviewer posts line-level comments on PR
- [ ] Vector memory retrieves relevant context from past issues
- [ ] Model router selects correct model per task complexity
- [ ] TypeScript/Python generated code passes `tsc`/`mypy`

### P2 Complete When:
- [ ] VS Code extension shows agent status, allows manual intervention
- [ ] Dashboard shows real-time progress, token usage, costs
- [ ] Non-technical users can configure pipeline via web UI
- [ ] Custom agent published as npm package works without core changes

---

## 📈 Success Metrics

| Metric | Current | Target (6 months) |
|--------|---------|-------------------|
| **Autonomous PR merge rate** | 0% | >60% |
| **Test pass rate (generated code)** | N/A | >85% |
| **Mean time to PR** | N/A | <10 min |
| **Cost per issue** | N/A | <$0.50 |
| **Prompt injection resistance** | 0% | 100% blocked |
| **Crash recovery rate** | 0% | 100% |

---

## 🔗 Related Issues

- #2: Tool Definition Framework
- #3: Sandbox Execution Environment
- #4: GitHub App Migration
- #5: Vector Memory Implementation
- #6: Multi-Model Router
- #7: VS Code Extension
- #8: Web Dashboard

---

## 📝 Notes

This issue tracks the **architectural transformation** from a documentation generator to a code-generating AI agent system. Each P0 item should be a separate PR with tests.

**Reference implementations to study:**
- [OpenDevin](https://github.com/OpenDevin/OpenDevin) — Sandbox + agent loop
- [MetaGPT](https://github.com/geekan/MetaGPT) — Multi-agent software company
- [LangGraph Checkpointers](https://langchain-ai.github.io/langgraph/reference/checkpointers/) — Persistent state
- [Cursor/Devin architecture talks](https://www.youtube.com/@cursor) — Tool use patterns
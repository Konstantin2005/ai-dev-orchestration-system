# Deep Repository Analysis & Gap Report

## Executive Summary

| Dimension | Current State | Industry Standard (Copilot/Cursor/Devin) | Gap Severity |
|-----------|---------------|------------------------------------------|--------------|
| **Architecture** | Dual-path: LangGraph + Legacy fallback | Single unified graph-based execution | 🔴 Critical |
| **Agent Intelligence** | Template-based (static variables) | LLM-driven reasoning with tool use | 🔴 Critical |
| **Context Management** | File-based shared memory (JSON) | Vector DB + RAG + persistent context | 🔴 Critical |
| **Code Generation** | Markdown templates only | Actual executable code + tests | 🔴 Critical |
| **Execution Environment** | File system only | Sandboxed containers + live preview | 🔴 Critical |
| **GitHub Integration** | Webhook + label-based state | Full GitHub App with PR automation | 🟡 High |
| **Multi-Model Support** | Single OpenAI model | Multi-model routing (Claude, GPT-4, local) | 🟡 High |
| **Testing/Validation** | Schema validation only | Live test execution + type checking | 🟡 High |
| **Human-in-the-loop** | Labels + comments only | Interactive PR reviews + chat | 🟡 High |
| **Observability** | File logs only | Distributed tracing + metrics + dashboards | 🟡 High |

---

## 1. Architecture Gaps (CRITICAL)

### 1.1 Dual Execution Path
**Current:** `runtime/graph/index.js` has LangGraph as primary but `core/orchestrator.js` has separate pipeline
```javascript
// runtime/graph/index.js:32-33 - LangGraph path
const app = buildGraph();
const finalState = await app.invoke(initialState);

// core/pipeline.js:23-40 - Separate pipeline path
for (const stage of this.stages) { ... }
```
**Industry Standard:** Single deterministic execution graph (Devin, OpenDevin)
**Fix:** Remove `core/pipeline.js` entirely, unify on LangGraph

### 1.2 No Persistent Execution State
**Current:** State lives only in memory during graph execution (`runtime/graph/state.js:13-15`)
```javascript
function defaultExecution() {
  return { status: 'idle', current_node: null, attempts: 0, trace: [] };
}
```
**Industry Standard:** Persistent checkpoints (LangGraph checkpointers, Devin snapshots)
**Gap:** No crash recovery, no resume from failure

### 1.3 Agent Registry vs Runtime Disconnect
**Current:** `agents/manifests/*.json` manifests exist but `runtime/graph/nodes/*` use hardcoded prompts
```json
// agents/manifests/langgraph.json:22-24
"capabilities": ["code", "plan", "review"]
```
But nodes don't consume these capabilities
**Industry Standard:** Capability-driven agent selection (AutoGen, CrewAI)

---

## 2. Agent Intelligence Gaps (CRITICAL)

### 2.1 Template-Based ≠ AI Agents
**Current Implementation:** All agents in `agent-core/src/agents/*.js` render static templates
```javascript
// agent-core/src/agents/backend.js:25
const content = await this.renderTemplate('backend-api', vars);
// vars has hardcoded endpoints!
endpoints: [
  { method: 'GET', path: '/api/resource', description: 'List resources' }
]
```
**Industry Standard:** Agents write actual code, run tests, iterate
- **Cursor Composer:** Writes files → runs tests → fixes errors
- **Devin:** Spawns containers → runs commands → iterates
- **OpenDevin:** Executes in sandbox → observes output → adjusts

### 2.2 No Tool Use / Function Calling
**Current:** Agents only call `callOpenAIJSON()` with prompts
**Missing:** File read/write tools, shell execution, web search, API calls, test runners

### 2.3 No Iterative Refinement
**Current:** Single-pass generation per agent
**Industry Standard:** Plan → Act → Observe → Reflect loop (ReAct pattern)

### 2.4 No Code Understanding
**Current:** Zero AST parsing, no type checking, no import resolution
**Gap:** Cannot modify existing codebases, only generate new markdown

---

## 3. Context & Memory Gaps (CRITICAL)

### 3.1 File-Based JSON ≠ Vector Memory
**Current:** `agent-core/src/shared/memory.js` writes `.json` files to disk
```javascript
async #persist(key, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}
```
**Industry Standard:** 
- **Cursor:** Codebase indexing + vector search
- **Devin:** Persistent knowledge base with embeddings
- **OpenDevin:** Event stream + semantic memory

### 3.2 No Cross-Issue Learning
**Current:** Each issue gets fresh `.work/issues/<id>/` directory
**Missing:** Pattern library, successful solution reuse, anti-pattern detection

### 3.3 Context Window Management
**Current:** `runtime/graph/nodes/*.js` truncate content arbitrarily
```javascript
// reviewer.js:33 - hardcoded truncation
${f.content.substring(0, 1000)}
```
**Industry Standard:** Smart context packing, relevance scoring, progressive disclosure

---

## 4. Code Generation & Execution Gaps (CRITICAL)

### 4.1 Markdown Output Only
**Current Output:** All agents produce `.md` files
```
00-architect/plan.md
01-backend-engineer/api.md
02-frontend-engineer/ui.md
03-qa-engineer/test-cases.md
04-code-reviewer/review.md
```
**Industry Standard:** Executable code + tests + config files

### 4.2 No Language/Framework Detection
**Current:** Hardcoded templates assume generic REST + React
**Missing:** Language detection (TypeScript, Python, Go, Rust), framework detection (Next.js, FastAPI, Spring, Rails), existing codebase analysis

### 4.3 No Sandbox Execution
**Current:** Zero-trust validator only checks file patterns
```javascript
// runtime/validation/zero-trust.js:17-18
const BLOCKED_PATTERNS = [/\.env/, /secret/i, /token/i, /password/i, /key\./i];
```
**Industry Standard:** Docker/K8s sandboxes, firecracker microVMs, gVisor

### 4.4 No Test Execution
**Current:** QA agent writes test *descriptions* in markdown
**Missing:** Actual test runners (Jest, Vitest, PyTest), coverage reports

---

## 5. GitHub Integration Gaps (HIGH)

### 5.1 Webhook-Only, No GitHub App
**Current:** `runtime/github/webhook.js` handles raw webhooks
**Missing:** GitHub App authentication (installation tokens), fine-grained permissions, webhook secret rotation

### 5.2 Label-Based State Machine (Brittle)
**Current:** `runtime/github/state.js` uses labels like `status:architect:done`
```javascript
// state.js:27-29
function makeLabel(step, status) {
  return `${LABEL_PREFIX}${step}:${status}`;
}
```
**Issues:** Race conditions, no atomic transitions, label limits (100/issue)

### 5.3 No PR Automation
**Current:** File writer outputs to workspace, no PR creation
**Missing:** `github/client.js` exists but unused for PR operations

### 5.4 No Review Comment Integration
**Current:** Reviewer writes `review.md` to file system
**Industry Standard:** Post review comments directly on PR files

---

## 6. Multi-Model & Provider Gaps (HIGH)

### 6.1 Single Provider Hardcoded
**Current:** `runtime/graph/openai.js` only supports OpenAI
```javascript
// openai.js:1
const { ChatOpenAI } = require('@langchain/openai');
```

### 6.2 No Model Routing
**Current:** Fixed `gpt-4o-mini` in `agents/manifests/langgraph.json:22`
```json
"cost": { "perTask": "low", "apiCalls": 6, "model": "gpt-4o-mini" }
```
**Industry Standard:** 
- Cursor: Claude-3.5-Sonnet for coding, GPT-4o for planning
- Devin: Dynamic model selection per task complexity

### 6.3 No Local Model Support
**Missing:** Ollama, LM Studio, vLLM integration for privacy/offline

---

## 7. Testing & Quality Gaps (HIGH)

### 7.1 Validation ≠ Testing
**Current:** `runtime/graph/nodes/validation.js` validates JSON schema only
```javascript
// validation.js:21-72 - Only structural validation
for (const key of REQUIRED_TOP) { ... }
for (const cp of FORBIDDEN_CONTENT_PATTERNS) { ... }
```

### 7.2 No Type Checking
**Missing:** TypeScript compilation, ESLint, mypy, ruff

### 7.3 No Integration Testing
**Current:** Unit tests only for graph nodes
```javascript
// test/e2e/pipeline.test.js:201-234 - Mock state, not real execution
```

### 7.4 No Regression Detection
**Missing:** Golden file tests, snapshot testing, performance benchmarks

---

## 8. Observability Gaps (HIGH)

### 8.1 File Logs Only
**Current:** `agent-core/src/logs/logger.js` writes to `.log` files
```javascript
// logger.js:43-48
const line = `[${entry.timestamp}] [${entry.level}] [${entry.agent}] ${entry.message}...`;
await fs.appendFile(filePath, line, 'utf-8');
```

### 8.2 No Distributed Tracing
**Missing:** OpenTelemetry, Jaeger, Zipkin integration

### 8.3 No Metrics/Dashboards
**Missing:** Execution time per agent, token usage/cost tracking, success/failure rates, queue depth, latency percentiles

### 8.4 No Alerting
**Missing:** Failure notifications, SLA breaches, cost anomalies

---

## 9. Security Gaps (HIGH)

### 9.1 Prompt Injection Vulnerable
**Current:** User issue body directly interpolated into prompts
```javascript
// architect.js:66 - Direct interpolation
const userInput = `Issue #${state.issue.id}: ${state.issue.title}\n\n${state.issue.body}...`;
```
**CVE Risk:** Issue body can contain `Ignore previous instructions...`

### 9.2 No Secret Scanning in Generated Code
**Current:** `validation.js` blocks `process.env` but not in generated code

### 9.3 Path Traversal in File Writer
**Current:** `runtime/graph/writers/file-writer.js` has basic checks but gaps exist

---

## 10. Scalability & Operations Gaps (MEDIUM)

### 10.1 No Horizontal Scaling
**Current:** Single-process Node.js
**Missing:** Worker queues (BullMQ, Temporal), horizontal pod autoscaling

### 10.2 No Rate Limiting / Quotas
**Current:** Unbounded OpenAI calls
**Missing:** Token budgets, concurrent execution limits

### 10.3 No Multi-Tenancy
**Current:** Single workspace per repo
**Missing:** Org-level isolation, RBAC, audit logs

---

## 11. Developer Experience Gaps (MEDIUM)

### 11.1 No Local Development Mode
**Current:** Requires GitHub webhook to trigger
**Missing:** `npm run dev` with mock issue, hot reload

### 11.2 No VS Code / JetBrains Extension
**Industry Standard:** Cursor, Copilot have native IDE integration

### 11.3 No Streaming Output
**Current:** All-or-nothing responses
**Missing:** Token streaming, progressive UI updates

### 11.4 No Configuration UI
**Current:** JSON config files (`.ai-config.json`, `pipeline.json`)
**Missing:** Web dashboard, YAML/TOML support, schema validation

---

## 12. Feature Parity Matrix

| Feature | This Repo | GitHub Copilot | Cursor | Devin | OpenDevin | MetaGPT |
|---------|-----------|----------------|--------|-------|-----------|---------|
| Issue → PR automation | ⚠️ Partial | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-agent pipeline | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Actual code generation | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Test execution | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Sandbox execution | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Vector memory/RAG | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Multi-model routing | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| GitHub App + PR comments | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| IDE integration | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Local model support | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Streaming responses | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Human-in-loop review | ⚠️ Labels | ✅ | ✅ | ✅ | ✅ | ❌ |
| Observability | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Self-healing/iteration | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## Prioritized Issues (15 Total)

### P0 — Critical Blockers (Do First)
1. **#P0-1** Unify execution path: Remove `core/pipeline.js`, single LangGraph pipeline
2. **#P0-2** Add persistent checkpoints: LangGraph checkpointer for crash recovery
3. **#P0-3** Implement tool-using agents: File ops, shell, test runner, web search
4. **#P0-4** Add sandbox execution: Docker/gVisor for safe code execution
5. **#P0-5** Fix prompt injection: Sanitize issue body, use system/user message separation

### P1 — Parity Features (Do Next)
6. **#P1-1** GitHub App + PR automation: Installation tokens, PR creation, review comments
7. **#P1-2** Vector memory/RAG: Embeddings for cross-issue learning, codebase indexing
8. **#P1-3** Multi-model router: Claude for coding, GPT-4o for planning, local fallback
9. **#P1-4** Type-safe code generation: TS compilation, ESLint, type checking in pipeline
10. **#P1-5** Actual test execution: Jest/Vitest/PyTest runners with coverage

### P2 — Competitive Features
11. **#P2-1** VS Code extension: Inline chat, inline edits, status bar
12. **#P2-2** Web dashboard: Config UI, execution monitoring, cost tracking
13. **#P2-3** Plugin system: Custom agents, tools, templates via npm packages
14. **#P2-4** Streaming responses: Token-by-token output, progressive UI
15. **#P2-5** Cost tracking & budgets: Per-issue, per-agent, org-level limits

### P3 — Nice to Have
16. **#P3-1** Local LLM support: Ollama, LM Studio, vLLM integration
17. **#P3-2** Full observability: OpenTelemetry, Grafana dashboards, alerting
18. **#P3-3** Multi-tenancy: Org isolation, RBAC, audit logs
19. **#P3-4** Agent marketplace: Install community agents from registry
20. **#P3-5** Benchmark suite: SWE-bench, HumanEval, custom evals

---

## Files to Delete (Legacy/Dead Code)
```
core/pipeline.js              # Duplicate pipeline, remove
core/orchestrator.js          # Old orchestrator, use runtime/graph/index.js
core/agents/*.js              # Old template agents, use runtime/graph/nodes/*
core/template-engine/*        # Old template engine, unused
core/shared/memory.js         # Old file-based memory
core/shared/context.js        # Old context system
core/telemetry/*              # Old telemetry, use agent-core/src/telemetry/*
engine/bootstrap.sh           # Old bootstrap, use runtime/target-repo/
templates/*.md (old)          # Old templates, use agent-core/templates/*
bridge/*                      # Old bridge code
control-plane/*               # Old control plane
```

## New File Structure (Target)
```
runtime/
  graph/
    index.js              # Single entry point (LangGraph)
    state.js              # State with checkpointer support
    nodes/
      orchestrator.js     # Uses tools, not templates
      architect.js        # Tool-using agent
      backend.js          # Tool-using agent
      frontend.js         # Tool-using agent
      qa.js               # Tool-using agent + test runner
      reviewer.js         # Tool-using agent + PR comments
    writers/
      file-writer.js      # Sandbox-aware writer
    checkpointer/         # NEW: Persistent state
  tools/                  # NEW: Agent tools
    file-ops.js
    shell.js
    test-runner.js
    web-search.js
  sandbox/                # NEW: Docker/gVisor execution
  github/
    app-client.js         # NEW: GitHub App client
    pr-manager.js         # NEW: PR creation + review comments

agent-core/
  src/
    agents/               # Tool-using agent implementations
    tools/                # Tool definitions + implementations
    memory/
      vector-store.js     # NEW: Embeddings + similarity search
    models/
      router.js           # NEW: Multi-model routing
```

---

## Acceptance Criteria

### P0 Complete When:
- [ ] Single `npm run graph:run` executes full pipeline via LangGraph
- [ ] Pipeline survives process crash and resumes from last checkpoint
- [ ] Agents use tools (read/write files, run tests, execute shell)
- [ ] Code executes in sandbox, not host filesystem
- [ ] Issue body sanitized, system/user messages separated

### P1 Complete When:
- [ ] `gh auth login` → installs GitHub App → creates PRs with review comments
- [ ] `npm run index:codebase` creates vector index for RAG
- [ ] `model: "claude-3.5-sonnet"` routes coding tasks, `"gpt-4o"` routes planning
- [ ] `npm run typecheck` passes on generated TypeScript
- [ ] `npm run test:generated` runs Jest/Vitest on generated code

### P2 Complete When:
- [ ] VS Code extension in marketplace with 100+ installs
- [ ] `npm run dashboard` serves config UI at localhost:3000
- [ ] `npm install @ai-orchestrator/agent-custom` works
- [ ] Streaming tokens visible in CLI and extension
- [ ] `npm run cost:report` shows per-issue breakdown

---

## Reference Implementations

| Feature | Reference |
|---------|-----------|
| LangGraph checkpointers | https://github.com/langchain-ai/langgraphjs/blob/main/examples/checkpointers/ |
| Tool-using agents | https://github.com/langchain-ai/langgraphjs/blob/main/examples/agents/ |
| Sandbox execution | https://github.com/OpenDevin/OpenDevin/tree/main/sandbox |
| GitHub App | https://github.com/github/github-app-js |
| Vector memory | https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain/src/memory |
| Multi-model routing | https://github.com/vercel/ai-sdk/blob/main/docs/routing.md |
| VS Code extension | https://github.com/microsoft/vscode-extension-samples |

---

## Success Metrics

| Metric | Current | Target (6mo) |
|--------|---------|--------------|
| Issue → PR success rate | ~0% | >80% |
| Generated code compiles | 0% | >95% |
| Tests pass on generated code | 0% | >70% |
| Mean time to PR | N/A | <10 min |
| Cost per issue | Unknown | <$0.50 |
| Agent iteration cycles | 1 | 3-5 |
| Human intervention rate | 100% | <20% |

---

**This issue supersedes all previous architecture docs. Implementation should follow P0→P1→P2 priority order.**
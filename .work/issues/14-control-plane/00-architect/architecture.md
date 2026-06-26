# Architecture — AI Control Plane

## System Layers

```
┌─────────────────────────────────────────────────────────┐
│                    AI CONTROL PLANE                      │
│  control-plane/index.js                                  │
├─────────────────────────────────────────────────────────┤
│  Router        │  Global State  │  Observability        │
│  (router.js)   │  (global-      │  (logger.js + logs)   │
│                │   state.js)    │                       │
├────────────────┼────────────────┼───────────────────────┤
│  Agent Marketplace  │  Benchmark Engine  │  Multi-Repo   │
│  (agents/)          │  (comparison-      │  Adapter      │
│                      │   engine.js)       │  (multi-repo- │
│                      │                   │   adapter.js) │
├──────────────────────┴───────────────────┴───────────────┤
│            EXISTING: LangGraph Execution Engine           │
├──────────────────────────────────────────────────────────┤
│  File Writer  │  Validation  │  PR Creation  │  GitHub   │
└──────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Control Plane Router (`control-plane/router.js`)
- `detectRepo(issue)` → determines target repo from issue
- `classifyTask(issue)` → labels task type (feature, bug, refactor, research)
- `decideExecutionTarget(issue)` → returns { repo, branch, agentStrategy }
- `attachContextSources(issue)` → collects context from all repos

### 2. Global Shared State (`control-plane/global-state.js`)
- Singleton store
- Repos state, active issues, agent performance history
- Persisted to `shared/global-state.json`
- Methods: `getState()`, `updateRepo()`, `logExecution()`, `recordBenchmark()`

### 3. Observability (`observability/logger.js`)
- Structured JSON logging to 4 log files
- Log levels: INFO, WARN, ERROR, BENCHMARK
- Automatic rotation (max 10MB per file)
- Methods: `logExecution()`, `logAgentPerformance()`, `logRouting()`, `logCost()`

### 4. Marketplace Upgrade (`agents/marketplace.js`)
- **New mode**: `compare_agents: true` runs 2–3 agents in parallel
- Dynamic agent selection based on task type + historical scores
- Integration with `ComparisonEngine` for automatic winner detection

### 5. Smart Architect (`runtime/graph/nodes/architect.js`)
- LLM prompt now includes agent ranking table
- Architect outputs: `{ ranking, reasoning, fallbackStrategy, selectedAgent }`
- Fallback: if primary agent fails, use second-ranked

### 6. Multi-Repo Adapter (`control-plane/multi-repo-adapter.js`)
- `cloneRepo(repoUrl)` → temp clone
- `executeInRepo(repoPath, task)` → runs orchestration on target repo
- `createPR(repoPath, branch)` → creates PR in target repo
- `logToCentralSystem(execution)` → logs back to main system

## Data Flow

```
Issue (repo A)
  → Router: detectRepo, classifyTask
  → Context Aggregation: collect from all repos
  → Agent Selection: pick best agent(s)
  → (optional) Benchmark: run 2-3 agents, compare
  → Execution: LangGraph pipeline
  → Validation: zero-trust check
  → File Writer: write to target repo
  → PR: create PR in target repo
  → Observability: log everything
```

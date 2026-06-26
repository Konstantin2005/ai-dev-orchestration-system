# Architecture: Issue #13 — Delta from Issue #12

## New Execution Flow
```
GitHub Issue
→ Agent Selector (type-classified)
→ Architect (chooses agent strategy + mode)
→ [single mode] Selected Agent Execution
→ [marketplace mode] Parallel Multi-Agent Execution
→ Comparison Engine (optional)
→ Validation Layer
→ File Writer
→ PR Creation
```

## New Components

### 1. Agent Marketplace (`agents/marketplace.js`)
- Input: task + agent IDs + mode ('single' | 'marketplace')
- In marketplace mode: runs 2-3 agents in parallel via Promise.all
- Collects results, durations, errors
- Passes to Comparison Engine for best selection

### 2. Agent Comparison Engine (`agents/comparison-engine.js`)
- **New criteria:**
  - `speed`: execution time (ms)
  - `correctness`: validation errors count (inverted)
  - `determinism`: output stability (0-1)
  - `cost`: token usage estimate
  - `code quality`: output structure score
  - `stability`: error rate (inverted)
- **Output:** ComparisonReport with winner + per-agent breakdown

### 3. Agent Type Classification
Added to manifests:
```json
{
  "type": "graph" | "conversational" | "code" | "hybrid",
  "capabilities": ["code", "plan", "review", "research"]
}
```

| Agent | Type | Capabilities |
|-------|------|-------------|
| LangGraph | graph | code, plan, review |
| AutoGen | conversational | research, analysis |
| CrewAI | conversational | research, content |
| MetaGPT | graph | code, plan, full-project |
| Aider | code | code, edit, refactor |
| Sweep AI | hybrid | code, plan, pr |
| Custom | hybrid | user-defined |

### 4. New Adapters

#### Aider Adapter
- CLI invocation: `aider --model gpt-4 --no-git --yes --message "task"`
- Captures stdout as result
- Type: code

#### Sweep AI Adapter  
- Stub that implements Sweep-like pattern: plan → code → PR
- Type: hybrid

## Architecture Diagram
```
                    ┌─────────────────────┐
                    │    Agent Selector    │
                    │  (type-classified)   │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │     Architect        │
                    │  chooses strategy    │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  Single Mode  │ │ Marketplace  │ │  Comparison  │
     │  (1 agent)    │ │ (2-3 agents) │ │  Engine      │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
            └────────────────┼────────────────┘
                             ▼
                    ┌─────────────────┐
                    │  Validation      │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  File Writer     │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  PR Creation     │
                    └─────────────────┘
```

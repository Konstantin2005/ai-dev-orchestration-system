# Architecture: Pluggable AI Agent OS

## System Overview
```
                    ┌─────────────────────────────────────┐
                    │         AI Orchestration Platform    │
                    │         (plug-in agent OS)           │
                    └─────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
    ┌───────────────┐       ┌─────────────────┐       ┌────────────────┐
    │  Core Engine   │       │  Agent Registry │       │   Benchmark     │
    │  (LangGraph)   │       │                 │       │   Layer         │
    └───────┬───────┘       └────────┬────────┘       └────────┬───────┘
            │                        │                         │
            ▼                        ▼                         ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                  Agent Adapters (unified interface)            │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
    │  │LangGraph │  │ AutoGen  │  │ CrewAI   │  │  MetaGPT     │  │
    │  │ Adapter  │  │ Adapter  │  │ Adapter  │  │  Adapter     │  │
    │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
    └───────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Selection Engine │
                    │ (scores+chooses) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Execution Runtime│
                    │ (graph pipeline) │
                    └─────────────────┘
```

## Core Components

### 1. Agent Registry (`agents/registry.js`)
- JSON/YAML metadata per agent: id, name, framework, strengths, weaknesses, cost, speed, reliability, bestUseCases
- Registry loader: scans `/agents/adapters/` + `/agents/manifests/`
- Registry API: list(), get(id), find(query), compare(ids)

### 2. Universal Agent Interface (`agents/interface.js`)
```js
class AgentAdapter {
  constructor(config) {}
  async init() {}           // warm up, load models
  async execute(task, context) {}  // run task
  validate(output) {}       // check output quality
  emitLogs() {}             // structured logs
  getMetadata() {}          // return agent descriptor
}
```

### 3. Agent Adapters
Each adapter wraps a different agent framework:

| Adapter | Framework | Integration Method |
|---------|-----------|-------------------|
| LangGraph | @langchain/langgraph | Direct NPM import (existing) |
| AutoGen | microsoft/autogen | Child process + NPM or Docker |
| CrewAI | crewai | Child process + NPM |
| MetaGPT | github.com/geekan/MetaGPT | Docker container + API |
| Custom | user-defined | Template + config |

### 4. Selection Engine (`agents/selection-engine.js`)
- Input: task description, repo context, available agents
- Scoring dimensions: complexity, speed, safety, cost, domain, reliability
- Output: selected agent + comparison table + fallback + risk

### 5. Benchmark Layer (`agents/benchmark.js`)
- Runs same task through N agents
- Collects: execution time, output quality, cost, error rate
- Generates: benchmark report (markdown)

### 6. Architect Node (modified)
- Before planning: queries Agent Registry → Selection Engine
- In plan: includes "Agent Selection" section
- In decisions: explains why chosen agent over alternatives

## Data Flow
```
Issue → Orchestrator
          → Architect (queries Registry → Selection Engine)
            → Agent Adapter (selected) → executes task
              → QA → Reviewer → Validation → File Writer → END
```

## Directory Structure (new)
```
agents/
├── registry.js          ← Agent Registry (load, list, find, compare)
├── interface.js         ← AgentAdapter base class
├── selection-engine.js  ← scores agents, selects best
├── benchmark.js         ← run + compare agents
├── manifests/           ← metadata files per agent
│   ├── langgraph.json
│   ├── autogen.json
│   ├── crewai.json
│   ├── metagpt.json
│   └── custom.json
└── adapters/
    ├── langgraph-adapter.js
    ├── autogen-adapter.js
    ├── crewai-adapter.js
    ├── metagpt-adapter.js
    └── custom-adapter.js
```

## API Contract

### Registry
```js
registry.list() -> AgentDescriptor[]
registry.get(id) -> AgentDescriptor
registry.manifest(id) -> Manifest
```

### Selection Engine
```js
selectAgent(task, context, agents) -> {
  selected: AgentDescriptor,
  reasoning: string,
  comparisonTable: Table,
  fallback: AgentDescriptor,
  riskAnalysis: Risk[]
}
```

### Benchmark
```js
benchmark.run(task, agents[]) -> {
  results: AgentResult[],
  comparison: Table,
  winner: string,
  report: string
}
```

## Integration with Existing System
- Current LangGraph pipeline remains DEFAULT adapter
- Architect node gets new `selectAgent()` call before planning
- Legacy fallback chain stays as safety net
- Agent outputs follow existing `files[]` + `logs{}` format

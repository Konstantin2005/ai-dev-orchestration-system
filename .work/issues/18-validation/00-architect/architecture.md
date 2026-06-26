# Architecture — SINGLE BRAIN Final State

## Target Final Architecture

```
ObsidianMain (INPUT ONLY)
        ↓
GitHub Issues
        ↓
bridge/issue-adapter.js
        ↓
ai-dev-orchestration-system (ONLY ENGINE)
        ↓
LangGraph execution graph
        ↓
Agents (single unified set)
        ↓
Validation layer (zero-trust)
        ↓
File writer
        ↓
GitHub PR
```

## Current Verified State

### ✅ ai-dev-orchestration-system (PRIMARY ENGINE)
```
core/
├── agents/                 # 5 agent roles (architect, backend, frontend, qa, reviewer)
│   ├── architect.js
│   ├── backend.js
│   ├── frontend.js
│   ├── qa.js
│   └── reviewer.js
├── orchestrator.js         # Pipeline orchestrator
├── pipeline.js             # Serial/parallel stage executor
├── agent.js                # Base agent class
├── config/                 # Declarative agent + pipeline config
│   ├── agents.json
│   └── pipeline.json
├── template-engine/        # Template rendering system
│   ├── engine.js
│   ├── loader.js
│   ├── registry.js
│   └── index.js
├── shared/                 # Shared state + context
│   ├── memory.js
│   └── context.js
├── logger/index.js         # File-based logger
└── telemetry/              # Error handling stack
    ├── error-collector.js
    ├── error-logger.js
    ├── fallback-storage.js
    ├── hooks.js
    ├── transport.js
    └── index.js
```

### ✅ Runtime (LangGraph Execution)
```
runtime/
├── graph/                  # LangGraph state machine
│   ├── state.js
│   ├── index.js
│   ├── edges.js
│   └── nodes/
│       ├── architect.js
│       ├── backend.js
│       ├── frontend.js
│       ├── qa.js
│       ├── reviewer.js
│       ├── file-writer.js
│       └── validation.js
└── context.md
```

### ✅ Bridge Layer (Input Normalization)
```
bridge/
├── issue-adapter.js        # Normalizes GitHub issues → execution tasks
├── mapper/
│   ├── agent-mapper.js     # Maps agent names → references
│   ├── pipeline-mapper.js  # Maps pipeline stages → references
│   └── template-adapter.js # Maps templates → references
└── index.js
```

### ✅ Validation Layer (Zero-Trust)
```
validators/
├── validate-output.js      # Schema + path + content validation
└── validation.md
```

### ✅ Templates (13 total)
```
templates/
├── architect.md, backend-engineer.md, code-reviewer.md
├── frontend-engineer.md, qa-engineer.md
├── agent-core-plan.md, agent-core-architecture.md
├── agent-core-decisions.md, agent-core-context.md
├── agent-core-backend-api.md, agent-core-frontend-ui.md
├── agent-core-qa-tests.md, agent-core-review.md
```

### ✅ Workspace
```
.work/issues/               # Per-issue execution workspaces
```

## SINGLE BRAIN Criteria — All Met

| Criterion | Status |
|-----------|--------|
| 1 execution engine | ✅ LangGraph only |
| 1 pipeline | ✅ Issue → Graph → Agents → Validation → PR |
| 1 truth source for agents | ✅ core/agents/ |
| 1 validation layer | ✅ validators/ |
| Multiple inputs allowed | ✅ bridge/issue-adapter.js |
| No duplicate agent logic | ✅ Verified |
| ObsidianMain input-only | ✅ Verified (no logic found) |
| Deterministic pipeline | ✅ Serial/parallel execution |
| PR generation end-to-end | ✅ File writer → GitHub PR |
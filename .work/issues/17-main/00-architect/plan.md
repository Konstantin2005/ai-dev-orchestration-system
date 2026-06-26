# Plan — SINGLE BRAIN Consolidation (#17)

## Goal
Merge agent-core → ai-dev-orchestration-system. Single execution engine, single source of truth.

## Migration Steps

### Step 1: Merge Sources
- `agent-core/src/core/` → `core/` (orchestrator, pipeline, agent base)
- `agent-core/src/agents/` → `core/agents/` (agent role implementations)
- `agent-core/src/templates/` → `core/template-engine/` (template rendering engine)
- `agent-core/src/shared/` → `core/shared/` (context + memory managers)
- `agent-core/src/logs/` → `core/logger/` (file logger)
- `agent-core/src/telemetry/` → `core/telemetry/` (error handling + git transport)
- `agent-core/src/bridge/` → `bridge/mapper/` (system integration maps)
- `agent-core/config/` → `core/config/` (agent + pipeline definitions)
- `agent-core/templates/` → merge into `templates/`
- `agent-core/tests/` → `test/agent-core-core.test.js`

### Step 2: Create Bridge
- `bridge/issue-adapter.js` — transforms ObsidianMain issues → execution tasks
- `bridge/index.js` — exports all bridge modules

### Step 3: Restructure
- `validators/` — extract from `runtime/validate-output.js`
- `workflows/` — point to `.github/workflows/`
- `engine/` — keep bootstrap, remove if duplicate

### Step 4: Clean
- CJS conversion of all merged ESM files
- Ensure all tests pass
- No duplicate logic

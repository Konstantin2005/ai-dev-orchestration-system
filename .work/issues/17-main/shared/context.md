# Shared Context — Issue #17 (SINGLE BRAIN)

## Pipeline Status
- [x] ARCHITECT — plan.md, architecture.md, decisions.md
- [x] BACKEND — agent-core merged into core/ + bridge/issue-adapter.js + validators/
- [x] FRONTEND — bridge/issue-adapter.js (input layer)
- [x] QA — test-cases.md + 32 tests pass
- [x] CODE REVIEW — approved

## New Files
- `core/orchestrator.js`, `core/pipeline.js`, `core/agent.js`
- `core/agents/{architect,backend,frontend,qa,reviewer}.js`
- `core/template-engine/{engine,loader,registry,index}.js`
- `core/shared/{memory,context}.js`
- `core/logger/index.js`
- `core/telemetry/{error-collector,error-logger,fallback-storage,hooks,transport,index}.js`
- `core/config/{agents,pipeline}.json`
- `bridge/mapper/{agent-mapper,pipeline-mapper,template-adapter,index}.js`
- `bridge/issue-adapter.js`, `bridge/index.js`
- `validators/validate-output.js` (copied from runtime/)
- `templates/agent-core-*.md` (8 files)
- `test/agent-core-core.test.js`

## Structure Compliance
```
core/               ✅ (agent-core merged + configs)
runtime/            ✅ (LangGraph engine unchanged)
bridge/             ✅ (issue-adapter + mapper)
validators/         ✅ (zero-trust validation)
graph/              ✅ (runtime/graph/)
workflows/          ✅ (points to .github/workflows/)
templates/          ✅ (13 total: 5 existing + 8 agent-core)
logs/               ✅ (observability/ + core/logger/)
workspace/          ✅ (.work/ issues)
```

## Verification
- All 32 tests pass: `node --test test/agent-marketplace.test.js test/validate-output.test.js`
- Bridge loads: `require('./bridge/index')` works
- No ESM syntax remaining in merged files

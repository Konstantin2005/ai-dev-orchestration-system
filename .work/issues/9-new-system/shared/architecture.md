# LangGraph Integration — Final Architecture

## System Architecture (After)

```
GitHub Issue
    ↓
GitHub Actions (.github/workflows/agent-run.yml)
    ↓
SETUP: npm ci → Node.js 18
    ↓
LANGGRAPH EXECUTION ENGINE (PRIMARY)
    ├── StateGraph with 6 nodes:
    │   ├── orchestrator    → Initialize pipeline context
    │   ├── architect       → Generate architecture plan
    │   ├── backend         → Backend implementation (parallel)
    │   ├── frontend        → Frontend implementation (parallel)
    │   ├── qa              → Test cases + validation
    │   └── reviewer        → Final review + verdict
    │
    ├── Conditional edges:
    │   ├── QA invalid (attempts < 2) → backend fix loop
    │   ├── QA invalid (attempts >= 2) → reviewer (force)
    │   ├── Reviewer CHANGES_REQUESTED → architect redo
    │   └── Reviewer READY_FOR_PR → END
    │
    └── Error → LEGACY FALLBACK (curl-based OpenAI call)
    ↓
Zero-Trust Validation (validate-output.js)
    ↓
File Write → Git Commit → PR → Issue Comment
```

## Graph State Model
```javascript
{
  issue:       { id, title, slug, body },
  architecture:{ summary, flow, decisions, status },
  files:       [{ path, content }],
  logs:        { orchestrator, architect, backend, frontend, qa, reviewer },
  validation:  { status, errors },
  execution:   { status, current_node, attempts, trace },
  _output:     { architecture, files, logs, status }  // final output
}
```

## Directory Structure Changes
```
ai-dev-orchestration-system/
  .github/workflows/agent-run.yml  ← NEW (moved from workflows/)
  runtime/
    graph/                          ← NEW
      index.js, state.js, edges.js, openai.js
      package.json
      nodes/
        orchestrator.js, architect.js, backend.js
        frontend.js, qa.js, reviewer.js, legacy-fallback.js
      traces/                       ← NEW (execution traces)
    legacy-pipeline.sh              ← NEW (fallback script)
    validate-output.js              ← unchanged
  package.json                      ← NEW
  package-lock.json                 ← NEW
  .nvmrc                            ← NEW
  .editorconfig                     ← NEW
  .env.example                      ← NEW
  LICENSE                           ← NEW
  test/                             ← NEW
    state.test.js, edges.test.js, index.test.js
    openai.test.js, validate-output.test.js
  docs/                             ← updated with new architecture
  core/                             ← unchanged
  templates/                        ← unchanged
```

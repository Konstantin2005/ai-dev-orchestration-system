# LangGraph Integration Architecture

## Before (Current System)
```
GitHub Issue → GitHub Actions → curl → OpenAI → JSON → validate → write → PR
                                      |
                            single prompt with all 5 agents
```

## After (Hybrid System)
```
GitHub Issue → GitHub Actions → LangGraph Execution Engine → validate → write → PR
                                      |
                              StateGraph with 6 nodes:
                              orchestrator → architect → backend+frontend → qa → reviewer
                                      |
                              Fallback: legacy curl-based pipeline
```

## Component Architecture

```
ai-dev-orchestration-system/
  core/                    # Unchanged
  docs/                    # Unchanged
  runtime/
    graph/                 # NEW: LangGraph execution engine
      index.js             # Graph builder & executor
      state.js             # Central state definition
      nodes/
        orchestrator.js    # Orchestrator node
        architect.js       # Architect node
        backend.js         # Backend node
        frontend.js        # Frontend node
        qa.js              # QA node
        reviewer.js        # Reviewer node
        legacy-fallback.js # Wraps old curl-based pipeline
      edges.js             # Edge definitions + conditional routing
      traces/              # Execution trace logs
    validate-output.js     # Unchanged
    ai-orchestrator.md     # Updated with graph context
  workflows/
    agent-run.yml          # UPDATED: calls LangGraph instead of direct curl
  templates/               # Unchanged
```

## LangGraph State Model

```javascript
{
  issue: {
    id: number,
    title: string,
    slug: string,
    body: string
  },
  architecture: {
    summary: string | null,
    flow: string | null,
    decisions: string[],
    status: 'pending' | 'done' | 'failed'
  },
  files: [],
  logs: {
    orchestrator: string,
    architect: string,
    backend: string,
    frontend: string,
    qa: string,
    reviewer: string
  },
  validation: {
    status: 'pending' | 'valid' | 'invalid',
    errors: []
  },
  execution: {
    status: 'running' | 'completed' | 'failed',
    current_node: string,
    attempts: number,
    trace: []
  }
}
```

## Node Definitions

### orchestrator_node
- Input: issue metadata
- Output: initialized state with bootstrap context
- Edge: → architect_node

### architect_node
- Input: issue context
- Output: architecture plan (summary, flow, decisions)
- Edge: → parallel backend + frontend

### backend_node (parallel)
- Input: architecture plan
- Output: backend implementation files
- Edge: → qa_node

### frontend_node (parallel)
- Input: architecture plan
- Output: frontend implementation files
- Edge: → qa_node

### qa_node
- Input: all generated files
- Output: test cases, validation results
- Conditional edge: if failed → backend_fix, if passed → reviewer

### reviewer_node
- Input: complete workspace
- Output: final review, status verdict
- Conditional edge: if CHANGES_REQUESTED → architect, if READY_FOR_PR → done

## Edge Flow

```
orchestrator → architect → [backend, frontend] (parallel) → qa
                                                              |
                                                    ┌─────────┴─────────┐
                                                    ▼                   ▼
                                               if failed          if passed
                                                    ▼                   ▼
                                             backend_fix          reviewer
                                                                      |
                                                          ┌───────────┴───────────┐
                                                          ▼                       ▼
                                                    CHANGES_REQUESTED      READY_FOR_PR
                                                          ▼                       ▼
                                                    → architect            → validate-output.js
```

## Hybrid Fallback Mechanism

```javascript
async function execute(issue) {
  try {
    return await langGraphExecute(issue);
  } catch (err) {
    console.error('[FALLBACK] LangGraph failed:', err.message);
    return await legacyExecute(issue);
  }
}
```

## Security Model
- Zero-trust: ALL graph node outputs validated before state update
- validate-output.js remains the FINAL gate before file writes
- No path traversal in generated file paths
- Schema validation at every state transition

## Observability
- Every node execution logged to /workspace/traces/<issue-id>.json
- State snapshot captured after each node
- Failure reason with full context
- Node-level timing metrics

# Final Architecture — SINGLE BRAIN

```
ObsidianMain (INPUT ONLY)
        ↓ GitHub Issue
┌─────────────────────────────┐
│  bridge/issue-adapter.js    │
│  (normalize → route)        │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  control-plane/router.js    │
│  (detect repo, classify)    │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  core/                      │
│  ├── orchestrator.js        │
│  ├── pipeline.js            │
│  ├── agents/ (roles)        │
│  ├── template-engine/       │
│  ├── shared/ (context)      │
│  ├── telemetry/             │
│  └── config/                │
├─────────────────────────────┤
│  runtime/graph/ (LangGraph) │
│  validators/ (zero-trust)   │
│  agents/ (marketplace)      │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  File Writer → GitHub PR    │
│  observability/ → logs      │
└─────────────────────────────┘
```

## Key Principles
- **Single Engine** — LangGraph is the ONLY execution engine
- **Input via Bridge** — ObsidianMain issues go through bridge/issue-adapter.js
- **No Duplicates** — agent-core merged, not duplicated
- **No New Abstractions** — everything maps to a real file/directory

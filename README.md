# AI Dev Orchestration System

Multi-agent AI engineering team simulation system. GitHub Issue → multi-agent pipeline → PR.

## Architecture
```
/core       — orchestrator engine, agent definitions, rules
/runtime    — execution model, context system, validation
/workflows  — GitHub Actions CI/CD
/workspace  — generated issue workspaces (auto)
/templates  — agent role templates
/docs       — architecture, decisions, migration
```

## Pipeline
```
Issue → Orchestrator → Architect → Backend + Frontend → QA → Reviewer → PR → Merge
```

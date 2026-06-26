# Architecture

## System Design
```
[GitHub Issue] → [GitHub Actions] → [AI Orchestrator] → [Multi-Agent Pipeline] → [PR]
```

## Directory Structure
```
/core                — orchestrator engine, agent roles, system rules
/runtime             — execution model, context, validation, AI layer
/workflows           — GitHub Actions CI/CD
/workspace           — generated per-issue workspaces (gitignored partially)
/templates           — agent role templates with checklists
/docs                — architecture, decisions, migration
```

## Security Model
- Zero trust: all inputs validated
- Strict JSON schema enforcement
- Path whitelist + extension allowlist
- Prompt injection protection (system != user messages)

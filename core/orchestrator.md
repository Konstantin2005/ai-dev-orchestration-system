# Orchestrator Engine

## Pipeline
```
Issue → Orchestrator → Architect → Backend + Frontend (parallel) → QA → Reviewer → PR → Merge
```

## Execution Flow
1. **Trigger:** GitHub Issue created
2. **Bootstrap:** workspace created in `/workspace/issues/<id>-<slug>/`
3. **Architect:** system design, plan, architecture, decisions
4. **Backend + Frontend:** parallel implementation
5. **QA:** test cases, edge cases, stress scenarios
6. **Reviewer:** security, quality, final verdict
7. **Output:** branch + PR

## Principles
- Zero trust: all inputs untrusted until validated
- Role isolation: each agent works only in its directory
- Deterministic output: strict JSON schema, validated before write
- Idempotency: rerun-safe, no duplicate PRs

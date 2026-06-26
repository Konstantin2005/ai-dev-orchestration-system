# Execution Model

## State Machine
```
ISSUE_CREATED → BOOTSTRAPPING → ARCHITECT_PLANNING → BACKEND_FRONTEND → QA_TESTING → REVIEW → PR_READY
```

## Trigger
- GitHub Issue `opened` event
- GitHub Actions workflow (`.github/workflows/agent-run.yml`)

## Flow Detail
1. **Input:** issue title + body
2. **Sanitize:** strip dangerous chars, enforce limits
3. **Idempotency check:** skip if already processed
4. **Bootstrap:** create workspace with role directories
5. **AI Orchestration:** OpenAI API with zero-trust prompt
6. **Validate:** JSON schema, path whitelist, extension check
7. **Write:** validated files to workspace
8. **Git:** branch → commit → push
9. **PR:** create or update
10. **Comment:** status in issue

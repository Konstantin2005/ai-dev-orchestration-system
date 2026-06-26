# AI Orchestration Layer

## Prompt Architecture
- **System prompt:** role definition, JSON schema, rules — NOT modifiable by user
- **User input:** issue title + body — treated as untrusted
- **Separation:** OpenAI `system` role != `user` role messages

## Output Schema
```json
{
  "architecture": { "summary": "", "flow": "", "decisions": [] },
  "files": [
    { "path": "workspace/issues/N-slug/00-architect/plan.md", "content": "" }
  ],
  "logs": {
    "architect": "", "backend": "", "frontend": "", "qa": "", "reviewer": ""
  },
  "status": "READY_FOR_PR"
}
```

## Rules
- JSON only — no text outside JSON
- All paths must be inside workspace
- Reviewer has final verdict
- Temperature: 0.3 (deterministic)
- Retry: 3 attempts with backoff

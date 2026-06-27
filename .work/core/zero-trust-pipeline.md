# Zero-Trust Pipeline

## Принципы
1. **Все входные данные — untrusted** (issue title, body, AI output)
2. **System prompt изолирован** от user input (разные messages в OpenAI API)
3. **JSON строго валидируется** перед записью
4. **Пути проверяются** — только `.work/issues/<id>/`
5. **Idempotency** — rerun не создаёт дубликатов
6. **Failure isolation** — любой шаг может упасть без повреждения state

## Pipeline
```
Issue → Sanitize input → Idempotency check
     → Bootstrap workspace
     → AI Orchestration (retry ×3)
     → Zero-trust JSON validation
     → Write files (atomic per file)
     → Branch + commit + PR
     → Comment
```

## Security Layers
| Layer | Защита |
|---|---|
| Input sanitization | Удаление path traversal, контроль символов, лимит длины |
| Prompt isolation | System prompt != user input (разные roles) |
| JSON validation | Schema check, path whitelist, extension allowlist, size limits |
| Idempotency | Проверка branch/PR перед созданием |
| Failure handling | Partial write prevention, retry with backoff |

## Trust Boundaries
```
[Untrusted Zone]         [Validation Gate]          [Trusted Zone]
  Issue title/body     →  sanitize + validate     →  workspace files
  AI raw JSON          →  schema + path check     →  validated output
  AI file paths        →  prefix whitelist        →  filesystem write
```

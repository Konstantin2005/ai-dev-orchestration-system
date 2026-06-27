# Main Orchestrator

## Workflow
```
Issue → Architect → Backend + Frontend → QA → Code Review → PR → Merge
```

## Структура
```
.work/
  core/                — системные файлы оркестрации
  templates/           — шаблоны для каждой роли
  issues/<id>-<slug>/  — изолированный workspace для каждого Issue
    00-architect/
    01-backend-engineer/
    02-frontend-engineer/
    03-qa-engineer/
    04-code-reviewer/
    shared/
```

## Правила
- Каждый агент работает только в своей папке
- Коммуникация только через `shared/`
- Никакой работы вне `.work/issues/`

## Принцип
Filesystem-based AI engineering team simulation system

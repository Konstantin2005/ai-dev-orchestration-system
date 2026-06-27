# Orchestrator Pipeline

## Flow (Level 2 + Level 3)
```
GitHub Issue (opened)
  → Level 2: GitHub Action создаёт структуру
  → Level 3: AI Orchestrator (OpenAI) заполняет артефакты
  → Architect → Backend + Frontend → QA → Code Review → PR → Merge
```

## Правила
1. **Триггер:** GitHub Action запускается при создании Issue
2. **Workspace:** Создаётся структура ролей + shared/ + logs/
3. **Координация:** AI агенты работают через shared/context.md
4. **Изоляция:** Каждая роль в своей папке, без пересечений
5. **Логирование:** Все события пишутся в logs/orchestrator.log

## Структура workspace
```
.work/issues/<id>-<slug>/
  00-architect/         — план, архитектура
  01-backend-engineer/  — API, бизнес-логика
  02-frontend-engineer/ — UI, компоненты
  03-qa-engineer/       — тесты, edge cases
  04-code-reviewer/     — ревью, безопасность
  shared/context.md     — единый канал коммуникации
  logs/orchestrator.log — лог процесса
```

## Разбиение задачи
- Architect: получает issue body, пишет план и архитектуру
- Backend + Frontend: параллельная реализация
- QA: тестирование после реализации
- Code Reviewer: итоговое ревью

## Level 3 (AI Orchestration)
- AI получает JSON-промпт из `.work/core/ai-orchestrator.md`
- Генерирует строгий JSON с architecture, files, logs
- Файлы записываются в workspace
- Валидация через `.work/core/validate-output.js`

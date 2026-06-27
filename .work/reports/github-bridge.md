# GitHub Bridge — Cross-Repo Monitor

## Архитектура

```
┌─────────────────────────┐       ┌──────────────────────────────┐
│ ObsiduanMain (target)   │       │ ai-dev-orchestration-system  │
│                         │       │                              │
│  .github/workflows/     │       │  .github/workflows/         │
│  ├─ ai-orchestrator     │──────►│  ├─ monitor-sync.yml        │
│  │  -full.yml           │       │  │  (dispatch receiver)     │
│  │  (dispatch on sync)  │       │  │                          │
│  │                      │       │  ├─ monitor-poller.yml      │
│  ├─ sync-to-orchestrator│──────►│  │  (cron every 30m)        │
│  │  .yml                │       │  │                          │
│  │  (issue events)      │       │  .work/monitor/             │
│  │                      │       │  ├─ dashboard.md            │
│  └──────────────────────┘       │  ├─ target-issues.json      │
│                                 │  ├─ target-errors.json      │
│  .work/issues/                  │  ├─ target-closed-issues    │
│  ├─ 1-xxx/                     │  │  .json                    │
│  ├─ 2-yyy/              │       │  ├─ last-sync.json          │
│  └─ ...                        │  ├─ last-poll.json           │
│                                 │  ├─ synced-issues/          │
│                                 │  │  (filesystem copy)       │
│                                 │  ├─ bridge.ps1              │
│                                 │  │  (local + GitHub API)    │
│                                 │  └─ events.log              │
└─────────────────────────┘       └──────────────────────────────┘
```

## Как это работает

### 1. GitHub API (основной канал)
- **monitor-poller.yml** каждые 30 минут:
  - Fetch open issues из `Konstantin2005/ObsiduanMain`
  - Fetch closed issues за последние 24ч
  - Сканирует тела issue на паттерны ошибок (`error`, `fail`, `crash`, etc.)
  - Обновляет `dashboard.md` и `target-errors.json`
  - Commit + push в наш репозиторий

### 2. repository_dispatch (push-based канал)
- **ai-orchestrator-full.yml** (в ObsiduanMain) после pipeline:
  - Собирает `.work/issues/` summary JSON
  - Отправляет `repository_dispatch` в наш репозиторий
  - **monitor-sync.yml** принимает dispatch, обновляет monitor

### 3. Local bridge (для разработки)
- **bridge.ps1** — локальный polling-скрипт
- Теперь с опцией `-UseGitHubAPI` для работы через `gh CLI`

## Настройка

### Требуется (для dispatch):
1. Создать PAT в GitHub с правами `repo`
2. Добавить как `ORCHESTRATOR_PAT` в Secrets обоих репозиториев
3. Webhook-сервер для `POST /webhook` (опционально)

### Или только polling (без PAT):
- Достаточно `monitor-poller.yml` — он использует `GITHUB_TOKEN` только для чтения

## Команды

```powershell
# Запустить локальный bridge с GitHub API
powershell -File ".work\monitor\bridge.ps1" -IntervalSeconds 30 -UseGitHubAPI

# Только локальная файловая синхронизация (без API)
powershell -File ".work\monitor\bridge.ps1" -UseGitHubAPI:$false

# Запустить GitHub Actions poller вручную
gh workflow run monitor-poller.yml --repo Konstantin2005/ai-dev-orchestration-system
```

## GitHub Actions workflow — статус

| Workflow | Repo | Trigger |
|----------|------|---------|
| `sync-to-orchestrator.yml` | ObsiduanMain | issue events, push to `.work/issues/` |
| `monitor-sync.yml` | ai-dev-orchestration-system | `repository_dispatch` |
| `monitor-poller.yml` | ai-dev-orchestration-system | cron `*/30 * * * *` |

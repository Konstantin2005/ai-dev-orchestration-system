# AI Orchestration System — Deployment Guide

Как запустить эту систему в любом GitHub-репозитории.

---

## Способ 1: GitHub Actions (рекомендуется)

### 1.1 Добавить подмодуль

```bash
cd your-project
git submodule add https://github.com/Konstantin2005/ai-dev-orchestration-system .ai-system
git submodule update --init --recursive
git add .ai-system
git commit -m "add AI orchestration submodule"
```

### 1.2 Создать workflow

`.github/workflows/ai-orchestrator.yml`:

```yaml
name: AI Orchestrator
on:
  issues:
    types: [opened, labeled]
  workflow_dispatch:
    inputs:
      issue:
        description: 'Issue number'
        required: true

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: .ai-system/package-lock.json

      - run: npm ci
        working-directory: .ai-system

      - name: Run orchestrator
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          node .ai-system/bin/ai-orchestrator run \
            --owner ${{ github.repository_owner }} \
            --repo ${{ github.event.repository.name }} \
            --issue ${{ github.event.issue.number || inputs.issue }}
```

### 1.3 Добавить секрет

GitHub → Settings → Secrets and variables → Actions → New secret

| Name | Value |
|------|-------|
| `OPENAI_API_KEY` | `sk-...` (OpenAI API key) |

### 1.4 Настроить конфиг (опционально)

`your-project/.ai-config.json`:

```json
{
  "version": "1.0",
  "output": {
    "backend": "src/",
    "frontend": "src/",
    "qa": "tests/",
    "docs": "docs/"
  },
  "language": "auto",
  "testFramework": "auto"
}
```

Готово. Откройте Issue — pipeline запустится автоматически.

---

## Способ 2: Локальный запуск (CLI)

```bash
# Клонировать систему
git clone https://github.com/Konstantin2005/ai-dev-orchestration-system
cd ai-dev-orchestration-system
npm install

# Инициализировать конфиг
node bin/ai-orchestrator init

# Подключить целевой репозиторий
node bin/ai-orchestrator connect https://github.com/your-org/your-project

# Запустить pipeline для Issue #42
export OPENAI_API_KEY=sk-...
export GITHUB_TOKEN=ghp_...
node bin/ai-orchestrator run --issue 42

# Или запустить в watch-режиме (опрос каждые 60с)
node bin/ai-orchestrator watch 60000
```

---

## Способ 3: Docker / Вебхук-сервер

```bash
# Запустить Express-сервер для приёма GitHub вебхуков
export OPENAI_API_KEY=sk-...
export GITHUB_WEBHOOK_SECRET=...
node runtime/github/server.js
# Сервер слушает на 0.0.0.0:3000
# POST /webhook — приём GitHub вебхуков
# GET /health — health check
```

Добавьте вебхук в GitHub: Settings → Webhooks → Add webhook
- Payload URL: `https://your-server.com/webhook`
- Content type: `application/json`
- Secret: совпадает с `GITHUB_WEBHOOK_SECRET`
- Events: Issues, Issue comments, Pull requests

---

## Структура `.ai-system/` в целевом проекте

```
your-project/
├── src/                          ← backend/frontend код (куда AI пишет)
├── tests/                        ← тесты (куда AI пишет)
├── .ai-config.json               ← настройки вывода
├── .github/workflows/            ← workflow (см. выше)
└── .ai-system/                   ← подмодуль (код системы)
    ├── runtime/graph/            ← LangGraph pipeline (главный движок)
    ├── runtime/sandbox/          ← песочница выполнения кода
    ├── runtime/agents/           ← ReAct инструменты агентов
    ├── runtime/github/           ← GitHub client + webhook + health
    ├── agents/                   ← реестр агентов
    ├── bin/ai-orchestrator       ← CLI entrypoint
    └── workspace/                ← внутренние артефакты (gitignored)
```

---

## Как AI пишет код в ваш проект

AI генерирует файлы с role-префиксами. Path-resolver маппит их в ваш проект:

| Префикс | Куда пишется |
|---------|-------------|
| `01-backend-engineer/` | `src/` (или `output.backend`) |
| `02-frontend-engineer/` | `src/` (или `output.frontend`) |
| `03-qa-engineer/` | `tests/` (или `output.qa`) |
| `00-architect/` | `.ai-system/workspace/` (internal) |
| `04-code-reviewer/` | `.ai-system/workspace/` (internal) |

---

## Pipeline (что происходит при Issue)

```
Issue opened
  → orchestrator (инициализация)
  → architect (план + архитектура)
  → [backend + frontend] (параллельно)
  → qa (валидация + тесты)
  → execution-loop (выполнить код, проверить)
  → reviewer (ревью)
  → file-writer (запись файлов)
  → pr-create (создать PR)
  → merge (слить PR)
  → DONE
```

---

## Переменные окружения

| Переменная | Обязательная | Описание |
|-----------|:----------:|----------|
| `OPENAI_API_KEY` | ✅ | Ключ OpenAI (модель gpt-4o-mini по умолчанию) |
| `GITHUB_TOKEN` | для CLI | GitHub токен (для создания PR, чтения Issue) |
| `GITHUB_WEBHOOK_SECRET` | для вебхука | Секрет верификации вебхуков |
| `AI_ORCHESTRATOR_MODE` | ❌ | Режим: `openai-only`, `multi-model` |
| `PORT` | ❌ | Порт сервера (по умолч. 3000) |

---

## FAQ / Troubleshooting

**Q: Pipeline не запускается после создания Issue**
A: Убедитесь, что workflow лежит на default branch. Проверьте Actions вкладку — видно ли запуск.

**Q: OpenAI API key not found**
A: Добавьте секрет в Settings → Secrets → Actions → `OPENAI_API_KEY`

**Q: AI пишет файлы не в те папки**
A: Создайте `.ai-config.json` в корне проекта с нужными `output.*` путями.

**Q: Не создаётся PR**
A: Проверьте `GITHUB_TOKEN` — у токена должны быть права `contents: write` и `pull-requests: write`.

**Q: Можно использовать другую модель?**
A: Да. Установите `AI_ORCHESTRATOR_MODE=multi-model` и добавьте ключи `ANTHROPIC_API_KEY`, `GROQ_API_KEY` и т.д.

**Q: Как обновить подмодуль?**
```bash
cd .ai-system && git fetch --tags && git checkout v2.0 && cd ..
git add .ai-system && git commit -m "update AI system to v2.0"
```

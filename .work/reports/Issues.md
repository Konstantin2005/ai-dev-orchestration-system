# Issues — Реализованные задачи

---

## #111 — Browser Error Handling

**Статус:** ✅ DONE  
**Ветка:** `issue-111-browser-error-handling`

**Описание:** Улучшена обработка ошибок открытия браузера в `AuthLoginCommand`. Раньше ошибка `open()` пакета тихо проглатывалась через `.catch(() => undefined)`.

**Решение:** Заменено на `Effect.catchAll` с выводом понятного warning сообщения для headless-серверов.

**Pipeline:**
| Роль | Статус |
|------|--------|
| 🧭 Architect | ✅ |
| ⚙️ Backend | ✅ |
| 🎨 Frontend | ✅ |
| 🧪 QA | ✅ |
| 🔍 Reviewer | ✅ |

**Файлы:** `packages/opencode/src/cli/cmd/account.ts:10` — `openBrowser` helper

---

## #108 — Agenty (Multi-Agent Infrastructure)

**Статус:** ✅ DONE  
**Ветка:** `issue-108-agenty`

**Описание:** Создана полная инфраструктура multi-agent AI engineering команды в файловой системе.

**Что сделано:**
- `.work/core/` — системные файлы (AGENTS.md, ROLES.md, RULES.md, orchestrator.md, ai-orchestrator.md, validate-output.js)
- `.work/templates/` — 7 шаблонов для ролей (architect, backend, frontend, qa, reviewer, context, architecture)
- `.work/issues/` — структура с ролями 00-04 + shared/
- Полная изоляция агентов через файловую систему
- Shared memory system через `shared/`

**Pipeline:**
| Роль | Статус |
|------|--------|
| 🧭 Architect | ✅ |
| ⚙️ Backend | ✅ |
| 🎨 Frontend | ✅ |
| 🧪 QA | ✅ |
| 🔍 Reviewer | ✅ |

---

## #112 — System Audit

**Статус:** ✅ DONE  
**Ветка:** `issue-112-system`

**Описание:** Полный аудит multi-agent AI engineering системы.

**Что сделано:**
- Анализ архитектуры — 5 weak points (SPOF, no idempotency, slug generation, AI output trust, agent isolation)
- Security audit (prompt injection — CRITICAL, path traversal, token exposure, XSS, branch protection bypass)
- Reliability report (GitHub API failures, OpenAI failures, race conditions, partial writes, retry storm)
- Improvement plan с P0/P1/P2 приоритетами
- Финальный вердикт: stability 5/10, production-ready: NO

**Pipeline:**
| Роль | Статус |
|------|--------|
| 🧭 Architect | ✅ |
| ⚙️ Backend | ✅ |
| 🎨 Frontend | ✅ |
| 🧪 QA | ✅ |
| 🔍 Reviewer | ✅ |

---

## #114 — Agent Core Templates

**Статус:** ✅ DONE  
**Ветка:** `issue-114-agent-core-templates`

**Описание:** Создан отдельный JS репозиторий `agent-core/` с собственной Template System.

**Что сделано:**
- `src/templates/` — TemplateEngine (переменные `[var]`, `{% if %}`, `{% each as %}`), TemplateLoader, TemplateRegistry
- `templates/` — 8 markdown шаблонов (plan, architecture, decisions, context, backend-api, frontend-ui, qa-tests, review)
- Рефакторинг 5 агентов: вместо хардкода используют `renderTemplate()`
- Pipeline автоматически injectит TemplateRegistry в агентов
- 13 тестов — все проходят

**Pipeline:**
| Роль | Статус |
|------|--------|
| 🧭 Architect | ✅ |
| ⚙️ Backend | ✅ |
| 🎨 Frontend | ✅ |
| 🧪 QA | ✅ |
| 🔍 Reviewer | ✅ |

**Файлы:** `agent-core/src/templates/` — engine, loader, registry; `templates/` — 8 .md

---

## Итог

| # | Тема | Статус | Сложность |
|---|------|--------|-----------|
| 108 | Multi-agent инфраструктура | ✅ DONE | Высокая |
| 111 | Browser error handling | ✅ DONE | Средняя |
| 112 | System audit + security | ✅ DONE | Высокая |
| 114 | Agent Core Templates | ✅ DONE | Высокая |

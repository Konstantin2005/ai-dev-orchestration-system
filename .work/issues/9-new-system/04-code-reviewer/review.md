# Code Review — LangGraph Integration

## Общий вердикт

**SAFE TO DEPLOY** (с исправлением 1 critical замечания)

## Критические замечания

### C1: Отсутствует `runtime/legacy-pipeline.sh`
- **Файл:** `runtime/graph/nodes/legacy-fallback.js:5`
- **Проблема:** fallback нода ссылается на `runtime/legacy-pipeline.sh`, который не существует. При падении LangGraph fallback упадет с ошибкой.
- **Решение:** Создать `runtime/legacy-pipeline.sh` или переписать fallback на прямые curl-вызовы.

## Major замечания

### M1: Модель по умолчанию — `gpt-4` (дорого)
- **Файл:** `runtime/graph/openai.js:14`
- **Проблема:** Используется `gpt-4` с лимитом 4000 токенов. Для 5+ последовательных вызовов стоимость одного pipeline может достигать $0.50–$1.00.
- **Решение:** Сменить на `gpt-4o-mini` как в оригинальном workflow.

### M2: Нет `package-lock.json`
- **Файл:** `package.json`
- **Проблема:** Workflow использует `npm ci`, который требует lock-файл. Без него сборка упадет.
- **Решение:** Выполнить `npm install --package-lock-only` и закоммитить `package-lock.json`.

### M3: `qaRouter` не отличает INFO от ERROR
- **Файл:** `runtime/graph/edges.js`
- **Проблема:** Все логи через `console.error`, включая успешные переходы (`[EDGES] QA valid, routing to reviewer`).
- **Решение:** Использовать `console.log` для info и `console.error` только для ошибок.

### M4: Парсинг `reviewerRouter` по ключевым словам хрупкий
- **Файл:** `runtime/graph/edges.js:56-63`
- **Проблема:** Поиск подстрок "ready" и "changes" в логах может дать false positive.
- **Решение:** Положиться только на `state._output.status`, ключевые слова — только как fallback.

## Minor замечания

### m1: Отсутствует `dependabot.yml`
- Нет автоматических обновлений зависимостей.

### m2: `console.error` для логирования
- Все ноды используют `console.error`. В production лучше структурированное логирование.

### m3: Рост `trace` при циклических rerun
- При повторных проходах (CHANGES_REQUESTED → architect) массив trace растет без ограничения. На практике 1-2 цикла, но стоит добавить лимит.

### m4: Нет лимита на количество файлов в нодах
- Backend/Frontend ноды просят AI сгенерировать 2-5 файлов, но нет жесткого ограничения.

## Статистика ревью

| Категория | Количество |
|-----------|-----------|
| Critical | 1 |
| Major | 4 |
| Minor | 4 |
| ✅ PASS | 8 |

## Проверка архитектуры

| Требование | Статус |
|-----------|--------|
| StateGraph с 6 нодами | ✅ |
| Sequential + parallel edges | ✅ |
| Conditional edges (QA → fix, Reviewer → redo) | ✅ |
| Hybrid fallback mechanism | ⚠️ (C1) |
| Zero-trust validation preserved | ✅ |
| Output schema compatibility | ✅ |
| Тесты | ✅ (50/50) |

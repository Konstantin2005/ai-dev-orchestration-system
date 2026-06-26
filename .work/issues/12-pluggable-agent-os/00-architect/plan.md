# Plan: Pluggable AI Agent OS

## Objective
Превратить монолитную AI orchestration систему в MODULAR PLATFORM с pluggable agent implementations, agent registry, selection engine и benchmarking.

## Задача
Issue #12 comment: архитектурный промт пользователя о превращении системы в "AI Agent Operating System with plug-in agents"

## Разбивка задачи

### Фаза 1 — Agent Registry (ядро)
- Создать `/agents/` директорию с мета-описанием каждого агента
- Каждый агент: strengths, weaknesses, cost, speed, reliability, best-use-cases
- Registry loader (сканирует /agents/ и загружает метаданные)

### Фаза 2 — Universal Agent Interface
- Единый интерфейс: `execute(task, context) -> result`
- Каждый адаптер реализует: init(), execute(task), validate(output), emit logs, return structured result
- Адаптеры для: LangGraph (наш текущий), AutoGen, CrewAI, MetaGPT, Custom

### Фаза 3 — Agent Selection Engine
- Анализирует задачу + контекст репозитория
- Сравнивает агентов по score
- Возвращает: selected agent + reasoning + comparison table + fallback + risk analysis

### Фаза 4 — Benchmark / Comparison Layer
- Side-by-side сравнение агентов на одной задаче
- Benchmark report
- Почему agent A > agent B

### Фаза 5 — Architect Node Upgrade
- Architect выбирает реализацию из Agent Registry
- Выводит comparison table
- Объясняет выбор

## Migration Path
1. Сначала Agent Registry + универсальный интерфейс
2. Затем Selection Engine
3. Затем Architect upgrade
4. Затем Benchmark Layer
5. Затем интеграция внешних систем

## Files to create/modify
- `agents/registry.js` — Agent Registry
- `agents/interface.js` — Universal Agent Interface
- `agents/adapters/langgraph-adapter.js` — LangGraph adapter
- `agents/adapters/autogen-adapter.js` — AutoGen adapter
- `agents/adapters/crewai-adapter.js` — CrewAI adapter
- `agents/adapters/metagpt-adapter.js` — MetaGPT adapter
- `agents/selection-engine.js` — Agent Selection Engine
- `agents/benchmark.js` — Benchmark/Comparison Layer
- `runtime/graph/nodes/architect.js` — (MODIFY) add agent selection
- `test/agent-registry.test.js` — Tests
- `test/selection-engine.test.js` — Tests
- `test/benchmark.test.js` — Tests

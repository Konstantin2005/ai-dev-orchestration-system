# Plan: Issue #13 — Новая система (Pluggable Agent OS v2)

## Objective
Расширить существующую pluggable architecture (Issue #12) новыми компонентами:
- Aider + Sweep AI адаптеры
- Agent Marketplace (parallel multi-agent execution)
- Agent Comparison Engine (speed, correctness, determinism, cost, code quality, stability)
- Agent type classification (graph/conversational/code/hybrid)

## Базис (из Issue #12)
- Agent Registry ✓
- Agent Adapters (LangGraph, AutoGen, CrewAI, MetaGPT, Custom) ✓
- Selection Engine ✓
- Benchmark Engine ✓
- Architect upgrade ✓

## Новая функциональность

### 1. Aider Adapter
- Интеграция с Aider (AI pair programming)
- Тип: code (code editing agent)
- Запуск через CLI (aider —no-git —model ...)

### 2. Sweep AI Adapter
- Интеграция с Sweep AI patterns (PR automation)
- Тип: hybrid (planning + code + PR)
- Анализ Issue → планирование → код → PR

### 3. Agent Marketplace (Parallel Execution)
- Запуск N агентов параллельно на одной задаче
- Сбор результатов
- Выбор лучшего
- Режимы: single (default), marketplace (2-3 agents)

### 4. Agent Comparison Engine
- Критерии: speed, correctness, determinism, cost, code quality, stability
- Side-by-side comparison
- Markdown report

### 5. Agent Type Classification
- type: graph (LangGraph), conversational (AutoGen), code (Aider), hybrid (Sweep AI)
- Определяет стратегию выполнения

## Files
- `agents/manifests/aider.json` — new manifest
- `agents/manifests/sweep.json` — new manifest
- `agents/adapters/aider-adapter.js` — new adapter
- `agents/adapters/sweep-adapter.js` — new adapter
- `agents/marketplace.js` — parallel execution engine
- `agents/comparison-engine.js` — refined comparison with new criteria
- `agents/selection-engine.js` — MODIFY: add type classification
- `runtime/graph/nodes/architect.js` — MODIFY: marketplace mode

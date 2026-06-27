# Agent Core

Custom JavaScript Agent Core system — multi-agent pipeline engine for AI engineering teams.

## Features

- **Orchestrator** — manages full issue-to-completion pipeline
- **5 Agent Roles** — Architect, Backend, Frontend, QA, Code Reviewer
- **Template Engine** — Markdown templates with variables `[var]`, conditionals `{% if %}`, loops `{% each as %}`
- **Shared Memory** — file-based persistence between agents
- **Pipeline** — serial + parallel stage execution
- **Logger** — structured logging per agent

## Quick Start

```bash
npm test
```

## Project Structure

```
src/
├── core/           — orchestator, pipeline, agent base
├── agents/         — 5 role agents
├── templates/      — template engine (engine, loader, registry)
├── shared/         — shared memory, context manager
└── logs/           — structured logger
templates/          — 8 markdown templates
config/             — pipeline and agent configuration
tests/              — test suite (13 tests)
```

## Template Syntax

```md
# Plan: [title]

{% if show %}
  visible content
{% endif %}

{% each items as item %}
  - [item.name]
{% endeach %}
```

## License

MIT

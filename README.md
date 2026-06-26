# AI Dev Orchestration System

[![GitHub release](https://img.shields.io/github/v/release/Konstantin2005/ai-dev-orchestration-system)](https://github.com/Konstantin2005/ai-dev-orchestration-system/releases)

Multi-agent AI engineering team simulation system. GitHub Issue → multi-agent pipeline → PR.

## Architecture

```
/core       — orchestrator engine, agent definitions, rules
/runtime    — execution model, context system, validation
/engine     — multi-platform bootstrap, platform adapter
/workflows  — GitHub Actions CI/CD
/workspace  — generated issue workspaces (auto)
/templates  — agent role templates
/docs       — architecture, decisions, migration
```

## Pipeline

```
Issue → Orchestrator → Architect → Backend + Frontend → QA → Reviewer → PR → Merge
```

## Multi-Platform

Use the AI engine as a **git submodule** in any repository. Each project pins a version, the engine auto-detects language and framework, and generated code lands directly in the project tree.

```
your-project/
├── src/
├── tests/
├── .github/workflows/agent-run.yml   ← workflow from engine
└── .ai-system/                        ← pinned engine version
    ├── core/
    ├── runtime/
    ├── engine/
    └── workflows/
```

Two execution modes:

| Mode | Description |
|------|-------------|
| **Standalone** | Engine runs in its own repo (current default). Workspace created under `workspace/issues/`. |
| **Submodule** | Engine runs inside a parent project. Generated code mapped via path-resolver to the parent repo's directories. |

See [`AI_README.md`](AI_README.md) for the full integration guide — installation, configuration, versioning, security, and uninstallation.

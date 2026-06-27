# CLI + Portable Runtime Layer — Architecture

## Components

```
bin/ai-orchestrator         → shell entry point (shebang node)
runtime/cli/index.js         → CLI command parser (init, connect, run, watch, help)
runtime/config/loader.js     → file-based config (YAML-like + JSON)
runtime/adapter/interface.js → RepositoryAdapter abstract base
runtime/adapter/github.js    → GitHubAdapter (wraps Octokit + target-repo manager)
runtime/adapter/localfs.js   → LocalFSAdapter (filesystem-only, no git deps)
runtime/adapter/index.js     → registry + factory (createAdapter, listAdapters)
```

## Data Flow

```
user → bin/ai-orchestrator → cli/index.js → config/loader.js → adapter factory → runtime core
```

## Config Files (in .ai-orchestrator/)
- agents.yaml — agent definitions, model routing
- runtime.yaml — scheduler, logging, execution policies
- connection.json — repository URLs, adapter types

## Adapter Contract
Each adapter implements: clone, createBranch, commit, push, createPR, readIssues, writeComment, readFile, writeFile, analyze, getInfo.

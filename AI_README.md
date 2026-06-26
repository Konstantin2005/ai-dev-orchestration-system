# AI Dev Orchestration System — Integration Guide

Add multi-agent AI engineering to any GitHub repository. One submodule, one workflow, zero manual pipeline management.

---

## Quick Start

```bash
# 1. Add the AI engine as a submodule
git submodule add https://github.com/Konstantin2005/ai-dev-orchestration-system .ai-system
git submodule update --init --recursive

# 2. Copy the workflow into your repo
mkdir -p .github/workflows
cp .ai-system/.github/workflows/agent-run.yml .github/workflows/agent-run.yml

# 3. Set your OpenAI API key as a repository secret
#    GitHub → Settings → Secrets and variables → Actions → New repository secret
#    Name: OPENAI_API_KEY
```

Open a new GitHub Issue — the pipeline runs automatically.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **GitHub repository** | Public or private. The workflow uses `issues: write`, `contents: write`, and `pull-requests: write` permissions. |
| **Node.js 18+** | Required by the AI engine runtime. The workflow uses `actions/setup-node@v4` to install it automatically. |
| **OpenAI API key** | Stored as `OPENAI_API_KEY` repository secret. The engine uses `gpt-4o-mini` by default. |
| **Git** | The project must be a git repository. `bootstrap.sh` verifies this on every run. |

---

## Installation via Submodule

### 1. Add the submodule

```bash
# Latest stable version
git submodule add https://github.com/Konstantin2005/ai-dev-orchestration-system .ai-system

# Specific version (recommended for production)
git submodule add -b v1.0 https://github.com/Konstantin2005/ai-dev-orchestration-system .ai-system
```

### 2. Initialize and clone

```bash
git submodule update --init --recursive
```

This creates the `.ai-system/` directory in your project root with the full AI engine.

### 3. Add the workflow

```bash
mkdir -p .github/workflows
cp .ai-system/.github/workflows/agent-run.yml .github/workflows/agent-run.yml
```

Commit and push both the submodule reference and the workflow:

```bash
git add .ai-system .github/workflows/agent-run.yml
git commit -m "chore: add AI orchestration system as submodule"
git push
```

### 4. Configure secrets

Navigate to your repository settings and add the `OPENAI_API_KEY` secret.

---

## Configuration (` .ai-config.json`)

Place an optional `.ai-config.json` in your project root to customise where generated code lands:

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

### Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `output.backend` | string | `""` (project root) | Directory for backend-engineer output |
| `output.frontend` | string | `""` (project root) | Directory for frontend-engineer output |
| `output.qa` | string | `"tests"` | Directory for QA test output |
| `output.docs` | string | `"docs"` | Directory for documentation |
| `language` | string | `"auto"` | Force a language (`"nodejs"`, `"python"`, `"rust"`, etc.), or `"auto"` for detection |
| `testFramework` | string | `"auto"` | Force a test framework (`"jest"`, `"pytest"`, etc.), or `"auto"` for detection |

If the file is absent, the engine auto-detects your project language and test framework.

---

## How It Works

```
[GitHub Issue] → [GitHub Actions] → [.ai-system Bootstrap]
                                          │
                                          ▼
                                    [AI Orchestrator]
                                          │
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                   [Architect]    [Backend + Frontend]    [QA]
                        │                 │                 │
                        ▼                 ▼                 ▼
                   [Code Reviewer] ←── [Output] ←── [Path Resolver]
                                          │
                                          ▼
                                     [PR Created]
```

### Architecture

- **Orchestrator** (`core/`) — Multi-agent pipeline manager. Routes issues through the full engineering cycle.
- **Runtime** (`runtime/`) — Execution engine including LangGraph (`runtime/graph/`), path resolution (`runtime/path-resolver.js`), and output validation.
- **Engine** (`engine/`) — Project bootstrap (`bootstrap.sh`) and platform adapter for language/framework detection.
- **Workflows** (`workflows/`) — GitHub Actions pipeline definition.
- **Workspace** (`workspace/`) — Temporary files generated during execution (gitignored).

### Path Resolution

When the AI generates files, the path-resolver determines where each file lands:

| Role Prefix | Destination | Example |
|-------------|-------------|---------|
| `00-architect/` | `.ai-system/workspace/00-architect/` | Design documents stay internal |
| `01-backend-engineer/` | `PROJECT_ROOT/<output.backend>/` | API code goes to your project |
| `02-frontend-engineer/` | `PROJECT_ROOT/<output.frontend>/` | UI code goes to your project |
| `03-qa-engineer/` | `PROJECT_ROOT/<output.qa>/` | Tests go to your project |
| `04-code-reviewer/` | `.ai-system/workspace/04-code-reviewer/` | Review artifacts stay internal |

---

## Security Model

| Principle | Implementation |
|-----------|---------------|
| **No writes into `.ai-system/`** | External role paths (backend, frontend, qa) are blocked from writing into the submodule tree. |
| **Path traversal blocked** | `../` and `/etc/` patterns are rejected by the path-resolver. All resolved paths must stay within `PROJECT_ROOT` or the `.ai-system/workspace/` directory. |
| **Output validation** | The `validate-output.js` gate runs on every AI response before any file is written. |
| **Input sanitization** | Issue titles are sanitised (slugified) to prevent injection into shell commands. |
| **Token-scoped permissions** | The workflow uses the built-in `GITHUB_TOKEN` with minimal required permissions (`contents: write`, `issues: write`, `pull-requests: write`). |
| **Submodule integrity** | `bootstrap.sh` verifies that `.ai-system/` is a valid git repository before proceeding. |

---

## Versioning

The engine follows semantic versioning via git tags:

```bash
git tag v1.0       # Initial release
git tag v1.1       # Bug fixes
git tag v2.0       # Major improvements
```

Each release also updates the `VERSION` file in the submodule root.

Your project pins a specific version when adding the submodule:

```bash
# Pin to v1.0
git submodule add -b v1.0 https://github.com/Konstantin2005/ai-dev-orchestration-system .ai-system
```

---

## Updating the Submodule

To pull the latest engine version:

```bash
# Fetch the latest tag
cd .ai-system
git fetch --tags
cd ..

# Update to a specific version
git submodule update --remote .ai-system
cd .ai-system
git checkout v2.0
cd ..
git add .ai-system
git commit -m "chore: update AI system to v2.0"
```

To see what changed:

```bash
cd .ai-system
git log --oneline v1.0..v2.0
cd ..
```

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Workflow doesn't trigger | Missing `workflow_dispatch` or `issues` event | Ensure `.github/workflows/agent-run.yml` exists on the default branch |
| `OPENAI_API_KEY` not found | Secret not set | Add it in GitHub repo settings → Secrets and variables → Actions |
| Submodule checkout fails | Recursive submodules not initialised | Ensure `submodules: recursive` is set in the checkout step |
| Files not appearing in project root | Path resolution not running | Check that `use_submodule: true` is passed or `.ai-system/VERSION` exists |
| `bootstrap.sh` fails | Not a git repository | Run from inside a git repository |
| AI output is empty or malformed | API rate limit or invalid response | Check workflow logs; the legacy fallback retries 3 times |
| `path-resolver` skips files | Files match internal role (architect/reviewer) | This is expected — those files stay in `.ai-system/workspace/` |

---

## Uninstallation

### Remove the submodule

```bash
# 1. Remove the submodule entry from .gitmodules
git submodule deinit -f .ai-system

# 2. Remove the submodule directory
git rm -f .ai-system

# 3. Remove the workflow
git rm -f .github/workflows/agent-run.yml

# 4. Clean up
rm -rf .git/modules/.ai-system
git commit -m "chore: remove AI orchestration system"
```

### Clean generated files

```bash
# Remove AI workspace (if any was created)
rm -rf .ai-system/workspace
```

# Multi-Platform Architecture

## Before (Current)
```
ai-dev-orchestration-system/   ← standalone repo
├── core/
├── runtime/
├── workflows/
├── templates/
└── workspace/                 ← AI writes here
```

## After (Submodule Platform)
```
PROJECT REPOSITORY             ← any project
├── src/
├── api/
├── ...
└── .ai-system/                ← git submodule (locked version)
      ├── core/
      ├── runtime/
      │   ├── graph/           ← LangGraph engine (from issue #9)
      │   └── path-resolver.js ← NEW: maps paths to parent repo
      ├── engine/
      │   ├── platform-adapter.js ← NEW: parent repo interface
      │   └── bootstrap.sh        ← NEW: init script
      ├── workflows/
      ├── templates/
      ├── VERSION               ← NEW: semver tag reference
      └── workspace/            ← temp workspace (gitignored)
```

## Execution Flow
```
[GitHub Issue in PROJECT REPO]
        │
        ▼
[GitHub Actions] ← .github/workflows/agent-run.yml
        │
        ├── checkout PROJECT REPO
        ├── checkout .ai-system submodule (recursive)
        │
        ▼
[.ai-system Bootstrap]
        ├── detect project root
        ├── verify git repo
        ├── read project language/framework
        └── init workspace
        │
        ▼
[AI Execution Engine] ← .ai-system/runtime/graph/
        ├── orchestrator
        ├── architect
        ├── backend + frontend (parallel)
        ├── qa
        └── reviewer
        │
        ▼
[Path Resolution Engine] ← .ai-system/runtime/path-resolver.js
        ├── resolve AI output paths to PROJECT ROOT
        ├── enforce: NO writes inside .ai-system/
        └── validate path safety
        │
        ▼
[Write to PROJECT ROOT]
        ├── src/ or api/ or frontend/
        ├── tests/
        └── docs/
        │
        ▼
[PR Creation] ← branch in PROJECT REPO
```

## Path Resolution Rules

| AI Output Path | Resolves To | Rule |
|----------------|-------------|------|
| `00-architect/plan.md` | `.ai-system/workspace/00-architect/plan.md` | Architect docs stay in .ai-system |
| `01-backend-engineer/api.js` | `PROJECT_ROOT/api.js` | Backend code goes to parent |
| `02-frontend-engineer/App.js` | `PROJECT_ROOT/src/App.js` | Frontend code goes to parent |
| `03-qa-engineer/tests.js` | `PROJECT_ROOT/tests/tests.js` | Tests go to parent |
| `04-code-reviewer/review.md` | `.ai-system/workspace/04-code-reviewer/review.md` | Review stays in .ai-system |

Rules:
- `00-architect/*` and `04-code-reviewer/*` → stay in `.ai-system/workspace/`
- `01-backend-engineer/*` → PROJECT_ROOT (configurable)
- `02-frontend-engineer/*` → PROJECT_ROOT (configurable)
- `03-qa-engineer/*` → PROJECT_ROOT/tests/ (configurable)

## Versioning Strategy
```bash
git tag v1.0  # Initial submodule release
git tag v1.1  # Bug fixes
git tag v2.0  # Major improvements

# Project pins version:
git submodule add -b v1.0 https://github.com/Konstantin2005/ai-dev-orchestration-system .ai-system
```

## Security Model
- NO writes into `.ai-system/` from AI output
- Path traversal strictly blocked (../, /etc/, etc.)
- validate-output.js still final gate
- Input sanitization for prompt injection
- Submodule integrity check (verify .ai-system is a valid git repo)

## Directory Layout After Changes
```
.ai-system/
├── core/
├── runtime/
│   ├── graph/
│   ├── path-resolver.js      ← NEW
│   ├── validate-output.js
│   └── legacy-pipeline.sh
├── engine/
│   ├── platform-adapter.js   ← NEW
│   └── bootstrap.sh          ← NEW
├── workflows/
│   └── agent-run.yml         ← UPDATED
├── templates/
├── workspace/                ← gitignored
├── VERSION                   ← NEW
├── package.json
├── .gitignore
└── README.md (or AI_README.md) ← NEW
```

# Multi-Platform Submodule Integration Plan

## Goal
Turn the AI orchestration system into a reusable platform layer that can be plugged into ANY repository via `git submodule` and immediately operate as an autonomous engineering team.

## Key Design Decisions
1. System lives at `.ai-system/` as a git submodule
2. Parent repo is the execution target — AI writes code INTO the parent, never into `.ai-system/`
3. Path resolution engine maps workspace paths to parent repo paths
4. Bootstrap script (`bootstrap.sh`) initializes the engine in any project
5. Versioning via git tags (v1.0, v1.1, v2.0)

## What needs to be created/modified

### NEW FILES:
- `.ai-system/bootstrap.sh` — project initialization script
- `.ai-system/engine/path-resolver.js` — path resolution engine
- `.ai-system/engine/platform-adapter.js` — platform compatibility layer
- `.ai-system/workflows/agent-run.yml` — updated workflow for submodule execution
- `.ai-system/VERSION` — version file
- `AI_README.md` — documentation for project integrators

### MODIFIED FILES:
- `.github/workflows/agent-run.yml` — add submodule checkout support
- `runtime/validate-output.js` — add path resolution for parent repo
- `runtime/graph/index.js` — add platform context to execution

## Migration Strategy
1. Architect design
2. Backend: bootstrap.sh, path-resolver.js, platform-adapter.js
3. Frontend: updated workflows, AI_README.md
4. QA: tests for path resolution, bootstrap validation
5. Reviewer: security audit, final verdict

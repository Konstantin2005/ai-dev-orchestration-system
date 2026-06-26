# Architectural Decisions — Multi-Platform

## ADR-1: .ai-system as git submodule (not subtree, not npm package)
- **Context:** Need to share the AI engine across projects.
- **Decision:** Use `git submodule` at `.ai-system/`.
- **Rationale:** Submodules allow version pinning (via tags), easy updates (`git submodule update --remote`), and are natively supported by GitHub Actions (`submodules: recursive`).
- **Alternatives:** `git subtree` (messier history), npm package (requires registry, harder to sync), git clone in CI (no version pinning).
- **Status:** ACCEPTED

## ADR-2: Path resolution based on role directory prefix
- **Context:** AI generates files with role prefixes (00-architect/, 01-backend-engineer/, etc.).
- **Decision:** Route files based on prefix — architect/reviewer → .ai-system/workspace/, backend/frontend/qa → parent repo.
- **Rationale:** Architectural docs and review artifacts are internal to the AI system. Generated code belongs to the parent project.
- **Alternatives:** All files to parent (pollutes parent with AI internals), all to workspace (code not in project).
- **Status:** ACCEPTED

## ADR-3: Configurable output root via `.ai-config.json`
- **Context:** Different projects have different directory structures.
- **Decision:** Parent repo can create `.ai-config.json` to customize where backend/frontend/qa files go.
- **Rationale:** Not all projects use `src/` or `tests/` at root. Config file makes it adaptable.
- **Alternatives:** Hardcoded paths (too rigid), CLI flags (too complex).
- **Status:** ACCEPTED

## ADR-4: GitHub Actions in parent repo, not in submodule
- **Context:** GitHub Actions only triggers from `.github/workflows/` in the default branch.
- **Decision:** Parent repo has `.github/workflows/agent-run.yml` that checks out the submodule and runs the engine from there.
- **Rationale:** Submodule workflows don't trigger automatically. Parent-side trigger is the only reliable option.
- **Alternatives:** Workflow in submodule with parent workflow call (over-engineering).
- **Status:** ACCEPTED

## ADR-5: VERSION file + git tags
- **Context:** Projects need to lock a specific version.
- **Decision:** Maintain `VERSION` file in `.ai-system/` root + git tags.
- **Rationale:** Simple, git-native, visible in file system.
- **Alternatives:** npm version (requires registry), GitHub Releases (harder to check programmatically).
- **Status:** ACCEPTED

## ADR-6: Bootstrap.sh detects project context
- **Context:** The AI system needs to understand the parent project.
- **Decision:** `bootstrap.sh` reads project structure (language, framework, test framework) and writes a context file.
- **Rationale:** The AI orchestrator needs to know what it's working with to generate appropriate code.
- **Alternatives:** Manual config (user must configure everything), AI guesses (unreliable).
- **Status:** ACCEPTED

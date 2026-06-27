# Governance Rules

## 1. Tag Standards

### Mandatory Tags

| Entity | Required Tag | Example |
|--------|-------------|---------|
| Person | `#person` | `tags: [person, дальний_круг]` |
| Project | `#project` | `tags: [project, active]` |
| Graph | `#graph` | `tags: [graph, knowledge]` |
| Script | `#script` | `tags: [script, git]` |
| Template | `#template` | `tags: [template]` |
| Daily note | `#daily` | `tags: [daily, 2026-06]` |

### Circle Tags (Соц Капитал)

| Tag | Description |
|-----|-------------|
| `ближний_круг` | Close circle |
| `1_круг` | Circle 1 |
| `2_круг` | Circle 2 |
| `3_круг` | Circle 3 |
| `дальний_круг` | Far circle |
| `познакомились` | Acquaintances |
| `особенные` | Special contacts |

### Rule
All tags in English for machine processing. Cyrillic tags allowed for social graph circles (legacy).

---

## 2. File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Zettel | `ZK-{number}.md` | `ZK-0101.md` |
| Project | `Project_{number}.md` | `Project_101.md` |
| Reflection | `Reflection_{number}.md` | `Reflection_101.md` |
| MOC | `MOC-{name}.md` | `MOC-Graphs.md` |
| Script | `{action}-{target}.ps1` | `daily-push.ps1` |
| Doc | `{Name}.md` | `DevOpsArchitecture.md` |

### Prohibited
- `?` in filenames (encoding corruption marker)
- Spaces in script names (use hyphens)
- Duplicate filenames in same directory

---

## 3. Repository Structure

### What Goes Where

| Path | Content |
|------|---------|
| `Technical/` | Scripts, docs, tests, configs |
| `Technical/Docs/` | Architecture, runbooks, roadmaps |
| `Technical/Scripts/Git/` | Git automation |
| `Technical/Scripts/Vault/` | Vault maintenance |
| `Technical/Scripts/Launchers/` | VBS/CMD wrappers |
| `Technical/Scripts/Discord/` | Discord integration |
| `Technical/Scripts/Obsidian/` | Obsidian tools |
| `Technical/Scripts/Rendering/` | Graph render tools |
| `Technical/Tests/` | Script tests |
| `vault/` | Active Obsidian vault (auto-committed) |
| `Zetl/` | Graph sources + generators |
| `.github/` | CI/CD workflows |
| `Старое/` | Archive (not synced) |

### What NOT to Put in Git
- Log files (`Technical/Scripts/Logs/*.log`)
- Lock files (`*.lock`)
- Generated cache files (`.smart-env*`)
- OS files (`Thumbs.db`, `.DS_Store`)
- Large binary files (>50MB)
- Node modules, Python venvs

---

## 4. Script Standards

### Every Script Must Have

```powershell
<#
.SYNOPSIS
  What this script does
.PARAMETER ParamName
  Description
#>
```

### Canonical Path Enforcement
- All active scripts → `Technical/Scripts/<category>/`
- No scripts in root directory
- No scripts in `Старое/` (archive only)
- Launcher VBS scripts → `Technical/Scripts/Launchers/`

### Logging
- Logs go to `Technical/Scripts/Logs/<script-name>.log`
- Use `Write-Log` function pattern (from `daily-push.ps1`)
- Log rotation: keep 7 days

---

## 5. Git Workflow

### Commit Rules
- Auto-commits: `Auto-commit: YYYY-MM-DD HH:mm:ss`
- Manual commits: `type(scope): description`
- No binary files in commits
- No large files (>50MB)

### Push Rules
- Auto-push every 5 minutes
- Use `--rebase --autostash` for safety
- Never force-push to `main` except recovery

### Recovery Branches
- Name: `recovery-YYYY-MM-DD`
- Purpose: emergency encoding/corruption fixes
- Delete after merge to main

---

## 6. Obsidian Config Rules

### .obsidian/ Directory
- Tracked in git (`.gitignore` does NOT exclude it)
- Backup of hotkeys, plugins, themes
- Restore via `Technical/vault/.obsidian/`

### Plugin Policy
| Plugin | Status | Purpose |
|--------|--------|---------|
| Kanban | ✅ Active | Task boards |
| Excalidraw | ✅ Active | Whiteboards |
| Dataview | ✅ Active | Queries |
| Templater | ✅ Active | Templates |

---

## 7. Cleanup Policy

| Action | Frequency | Owner |
|--------|-----------|-------|
| Remove stale lock files | Weekly | Auto |
| Archive Старое/ | Monthly | Manual |
| Consolidate duplicate scripts | Quarterly | Manual |
| Remove empty directories | Monthly | Auto |
| Review tag compliance | Monthly | Manual |
| GC git repo | Weekly | Auto |

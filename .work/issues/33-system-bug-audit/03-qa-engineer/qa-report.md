# QA Report — System Bug Audit

## Test Results
- Test suite: 288/288 pass, 0 fail
- Chaos test: 3/3 cycles completed
- Chaos health check: 3/27 checks passed (ожидаемо — нет OPENAI_API_KEY)

## Bug Classification

### 🔴 HIGH (9)
| # | File | Line | Issue | Impact |
|---|------|------|-------|--------|
| H1 | central-logger.js | 44 | Empty catch — FS write | Logs silently lost |
| H2 | state-manager.js | 52 | Empty catch — JSON parse | Broken state file invisible |
| H3 | state-manager.js | 58 | Empty catch — FS write | State save failures invisible |
| H4 | state-manager.js | 66 | Empty catch — FS read | State load failures invisible |
| H5 | agent-runtime.js | 16 | `objectiv` typo | State corruption |
| H6 | client.js | 1 | `@octokit/rest` undeclared | Break on clean install |
| H7 | server.js | 1 | `express` undeclared | Break on clean install |
| H8 | crewai-adapter.js | 28 | Command injection | Shell injection via task title |
| H9 | metagpt-adapter.js | 28 | Command injection | Shell injection via task title |

### 🟡 MEDIUM (10)
| # | File | Line | Issue | Impact |
|---|------|------|-------|--------|
| M1 | target-repo/manager.js | 45 | Fragile shell escape | Commit message injection |
| M2 | server.js | 37 | console.log production | No structured logging |
| M3 | graph/index.js | 50 | console.error production | No structured logging |
| M4 | edges.js | 28 | console.error production | No structured logging |
| M5 | openai.js | 67 | ReDoS regex | Catastrophic backtracking |
| M6 | adapter/github.js | 13 | Dead import | Misleading code |
| M7 | validate-output.js | x2 | Duplicate modules | Maintenance burden |
| M8 | localfs.js + manager.js | — | Duplicate walk | Maintenance burden |
| M9 | bridge + state.js | — | Duplicate sanitize | Maintenance burden |
| M10 | autonomous/sub-issue | — | Hardcoded OWNER/REPO | Not portable |

### 🟢 LOW (5)
| # | File | Line | Issue |
|---|------|------|-------|
| L1 | control-plane/index.js | 52 | Module pattern confusion |
| L2 | autonomous-runner.js | 115 | console.log in production |
| L3 | cli/index.js | 12 | console.log in CLI |
| L4 | selection-engine.js | 106 | Division by zero risk |
| L5 | validate-output.js | 30 | process.exit prevents reuse |

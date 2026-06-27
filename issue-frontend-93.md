## Parent Issue: #93

## Role: FRONTEND ENGINEER (Phase 3 & 4)

## Task
Build the web dashboard, VS Code extension, and PR checkpoint UI.

## Deliverables (in .work/issues/93-architect/02-frontend-engineer/):
- [ ] ui.md — Dashboard and extension UI specification
- [ ] components.md — React/Vue component architecture
- [ ] state-model.md — Real-time state management

## Specific Requirements

### Phase 3: Tool-Based Agent UI Integration
- [ ] **Agent Progress Stream** (`web/dashboard/components/AgentStream.jsx`)
  - [ ] Real-time token streaming from LLM
  - [ ] Tool call visualization (file_read, run_command, run_tests)
  - [ ] ReAct loop steps: Plan/Act/Observe/Reflect
  - [ ] Execution output display (stdout/stderr/coverage)

- [ ] **Sandbox Terminal** (`web/dashboard/components/SandboxTerminal.jsx`)
  - [ ] Live container logs
  - [ ] Interactive command input
  - [ ] Test run visualization

### Phase 4: PR as Checkpoint UI
- [ ] **PR Dashboard** (`web/dashboard/pages/PRDashboard.jsx`)
  - [ ] List of PRs with execution status
  - [ ] Execution results per PR (pass/fail, coverage, logs)
  - [ ] Fix cycle history
  - [ ] Manual trigger for re-execution

- [ ] **Review Interface** (`web/dashboard/components/ReviewInterface.jsx`)
  - [ ] PR diff with inline execution results
  - [ ] Security findings panel
  - [ ] Logic error annotations
  - [ ] Approve/Block with execution evidence

### VS Code Extension
- [ ] **Extension Entry** (`extensions/vscode/src/extension.ts`)
  - [ ] Issue panel: create/view issues
  - [ ] Agent status bar: current agent, progress
  - [ ] Inline execution results in editor
  - [ ] Quick actions: re-run tests, fix, approve

## Acceptance Criteria
- [ ] Dashboard shows live agent progress with tool calls
- [ ] PR dashboard displays execution results per checkpoint
- [ ] VS Code extension shows agent status and allows actions
- [ ] Real-time updates via WebSocket/SSE
- [ ] Execution logs searchable and filterable
## Parent Issue: #93

## Role: BACKEND ENGINEER (Phase 4)

## Task
Implement GitHub App integration with PR automation and webhook replacement.

## Deliverables (in .work/issues/93-architect/01-backend-engineer/):
- [ ] github-app.md — App manifest and permissions
- [ ] pr-automation.md — PR create/update/comment flow
- [ ] webhook-migration.md — Migration from webhook to App

## Specific Requirements

### GitHub App Manifest (`.github/app.yml`)
- [ ] **Permissions**
  - [ ] Contents: Read/Write
  - [ ] Issues: Read/Write
  - [ ] Pull Requests: Read/Write
  - [ ] Checks: Read/Write
  - [ ] Metadata: Read
  - [ ] Webhooks: Read

- [ ] **Events**
  - [ ] issues (opened, labeled, closed)
  - [ ] issue_comment (created)
  - [ ] pull_request (opened, synchronize, closed, reopened)
  - [ ] check_run (created, rerequested)
  - [ ] check_suite (requested)

- [ ] **Webhook URL** → `runtime/github/app-webhook.js`

### Installation Token Flow (`runtime/github/app-auth.js`)
- [ ] Generate JWT from App private key
- [ ] Exchange for installation token
- [ ] Cache tokens with TTL (55 min)
- [ ] Auto-refresh before expiry

### PR Automation (`runtime/github/pr-manager.js`)
- [ ] **Create PR** from graph output
  - [ ] Base branch: main
  - [ ] Head branch: `agent/issue-<id>-<slug>`
  - [ ] Commit all generated files
  - [ ] PR title: `[Agent] Issue #<id>: <title>`
  - [ ] PR body: Architecture summary + execution plan

- [ ] **Update PR** on fix cycles
  - [ ] Force-push new commits
  - [ ] Update PR description with execution results
  - [ ] Add labels: `status:execution-passed|failed`

- [ ] **Review Comments** (line-level)
  - [ ] Post reviewer findings as review comments
  - [ ] Link to execution logs
  - [ ] Suggest code changes via `suggestion` blocks

- [ ] **Check Runs**
  - [ ] Create check run: `Agent Pipeline`
  - [ ] Steps: architect, backend, frontend, execute, test, qa, review
  - [ ] Update status per node completion
  - [ ] Annotate failures on specific lines

### Webhook Migration
- [ ] Deprecate `runtime/github/webhook.js` (keep for transition)
- [ ] New `runtime/github/app-webhook.js` handles App events
- [ ] Verify signature with App webhook secret
- [ ] Route to same pipeline entry point

## Acceptance Criteria
- [ ] GitHub App installable on test repo
- [ ] Issue opened → App creates PR automatically
- [ ] PR shows check run with agent steps
- [ ] Reviewer posts line-level comments
- [ ] Fix cycle updates PR, re-runs checks
- [ ] Merge only after all checks pass
- [ ] Zero webhook dependency
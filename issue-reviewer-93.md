## Parent Issue: #93

## Role: CODE REVIEWER (Phase 5)

## Task
Upgrade Reviewer to active system component with execution-verified review and merge blocking.

## Deliverables (in .work/issues/93-architect/04-code-reviewer/):
- [ ] review.md — Active review framework
- [ ] risks.md — Security and logic risk detection
- [ ] security.md — Security review automation

## Specific Requirements

### Active Code Review Agent (`runtime/graph/nodes/active-reviewer.js`)
- [ ] **Execution-Verified Review**
  - [ ] Pull PR diff + execution results from QA gates
  - [ ] Simulate runtime behavior for critical paths
  - [ ] Detect logic errors: off-by-one, null deref, race conditions
  - [ ] Verify test coverage matches changed code

- [ ] **Security Review Automation**
  - [ ] SAST integration (Semgrep, CodeQL rules)
  - [ ] Secret detection in diff (not just patterns — context-aware)
  - [ ] Dependency vulnerability check (OSV, GitHub Advisories)
  - [ ] License compliance check

- [ ] **Architecture Review**
  - [ ] Detect circular dependencies introduced
  - [ ] Verify layer boundaries respected
  - [ ] Check for anti-patterns: god classes, anemic models, leaky abstractions

### Merge Blocking Logic (`runtime/graph/nodes/merge-gate.js`)
- [ ] **Merge Gate Conditions** (ALL must pass)
  - [ ] All validation gates: PASSED
  - [ ] Active reviewer: APPROVED
  - [ ] Test coverage delta: >= 0% or >80% absolute
  - [ ] No critical/high security findings
  - [ ] Execution verified: at least 1 successful run
  - [ ] No flaky tests in changed files

- [ ] **Auto-Fix Trigger**
  - [ ] On BLOCK: create fix sub-issue with context
  - [ ] Assign to Backend/Frontend agent
  - [ ] Re-run validation after fix
  - [ ] Max 3 auto-fix cycles before human escalation

### Review Feedback Format
- [ ] **PR Comments** (line-level)
  - [ ] Execution evidence links
  - [ ] Test failure reproduction steps
  - [ ] Security finding with CVE/reference
  - [ ] Architecture violation with pattern name

- [ ] **Summary Report** (review.md per PR)
  - [ ] Verdict: APPROVE / CHANGES_REQUESTED / BLOCKED
  - [ ] Execution summary table
  - [ ] Risk assessment: LOW/MEDIUM/HIGH/CRITICAL
  - [ ] Required actions checklist

## Acceptance Criteria
- [ ] Reviewer runs AFTER QA gates complete
- [ ] Merge blocked if any gate fails
- [ ] Auto-fix cycle works end-to-end
- [ ] Security findings block on CRITICAL/HIGH
- [ ] Review comments include execution evidence
- [ ] Human escalation after 3 failed auto-fixes
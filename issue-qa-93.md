## Parent Issue: #93

## Role: QA ENGINEER (Phase 5)

## Task
Build the test execution runtime, validation gates, and quality assurance framework.

## Deliverables (in .work/issues/93-architect/03-qa-engineer/):
- [ ] tests.md — Test strategy and execution model
- [ ] edge-cases.md — Failure scenarios and handling
- [ ] coverage.md — Coverage targets and reporting

## Specific Requirements

### Phase 5: Test Execution Runtime
- [ ] **Test Executor** (`runtime/qa/test-executor.js`)
  - [ ] Execute tests in sandbox for each PR checkpoint
  - [ ] Parse results: pass/fail, coverage, duration, flaky detection
  - [ ] Support: Jest, Vitest, PyTest, Cargo, Go test, Maven, Gradle
  - [ ] Parallel execution with resource limits

- [ ] **Validation Gates** (`runtime/qa/gates/`)
  - [ ] `pre-execution` — Syntax check, type check, lint
  - [ ] `unit-tests` — Must pass >90% or block
  - [ ] `integration-tests` — Run if unit pass
  - [ ] `security-scan` — Secret detection, dependency audit
  - [ ] `performance` — Bundle size, startup time, memory
  - [ ] `contract` — API schema compliance

- [ ] **Quality Metrics Collector** (`runtime/qa/metrics.js`)
  - [ ] Code coverage aggregation
  - [ ] Test duration trends
  - [ ] Flaky test detection
  - [ ] Mutation testing score

### Self-Healing Test Framework
- [ ] **Failure Analyzer** (`runtime/qa/failure-analyzer.js`)
  - [ ] Categorize: syntax, logic, dependency, flaky, environment
  - [ ] Suggest fixes based on error patterns
  - [ ] Auto-retry with exponential backoff for flaky

- [ ] **Test Generator** (`runtime/qa/test-generator.js`)
  - [ ] Generate unit tests for uncovered code paths
  - [ ] Generate integration tests for API endpoints
  - [ ] Property-based test generation

## Acceptance Criteria
- [ ] All validation gates execute in sandbox per PR
- [ ] Test results feed back to graph for ReAct loop
- [ ] Coverage reported per file, per PR
- [ ] Flaky tests detected and quarantined
- [ ] Security gate blocks on high/critical findings
- [ ] Test generation runs for new code
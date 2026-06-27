# Bug Fix Plan

## Priority 1 (High)
- [ ] H1: Empty catch blocks — central-logger.js:44, state-manager.js:52, state-manager.js:58, state-manager.js:66
- [ ] H2: Command injection — crewai-adapter.js:28, metagpt-adapter.js:28
- [ ] H3: Typo — agent-runtime.js:16 (`objectiv` → `objective`)
- [ ] H4: Undeclared deps — `@octokit/rest`, `express` в package.json

## Priority 2 (Medium)
- [ ] M1: Fragile shell escaping — target-repo/manager.js:45
- [ ] M2: console.* в production — server.js, graph/index.js, edges.js
- [ ] M3: ReDoS regex — openai.js:67
- [ ] M4: Dead import — adapter/github.js:13
- [ ] M5: Duplicate validate-output (2 копии)
- [ ] M6: Duplicate walk function (2 копии)
- [ ] M7: Duplicate sanitize/truncate (2 копии)
- [ ] M8: Hardcoded OWNER/REPO — autonomous-runner.js, sub-issue-processor.js
- [ ] M9: Dead code wrapper — client.js:120

## Priority 3 (Low)
- [ ] L1: Module pattern — control-plane/index.js:52
- [ ] L2: console.log в CLI
- [ ] L3: Division by zero — selection-engine.js:106
- [ ] L4: process.exit — validate-output.js:30

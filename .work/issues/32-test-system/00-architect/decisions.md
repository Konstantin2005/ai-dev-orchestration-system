# Architecture Decisions

## AD-1: Local-only sandbox
- Sandbox repo at `C:\ai-orchestrator-sandbox` (no remote GitHub)
- Issues simulated locally via structured objects
- Avoids GitHub API dependency for test execution

## AD-2: Use executeGraph directly
- Use `runtime/graph/index.js` `executeGraph()` function
- Skip the full `execute()` wrapper (no file writing needed)
- Capture raw state output for validation

## AD-3: Chaos between cycles
- Modify sandbox files between cycles, not during execution
- Allows clean before/after comparison per cycle

## AD-4: Three cycles minimum
- Cycle 1: Normal execution (baseline)
- Cycle 2: With forced failures (broken tests, invalid assumptions)
- Cycle 3: With race conditions and context drift

# Test Cases — Chaos Stress Test

## TC-1: Normal Cycle
- Create issue with valid body
- Run executeGraph
- Expect: architecture, files, logs, valid status

## TC-2: Cycle After Chaos (forced failures)
- Inject broken tests + buggy code
- Run executeGraph
- Expect: pipeline still completes, files generated

## TC-3: Cycle After Chaos (race conditions)
- Inject ghost code + conflicting state
- Run executeGraph
- Expect: pipeline handles gracefully

## TC-4: Multiple Issues in Parallel
- Run 3 issues concurrently
- Expect: all complete, no state corruption

## TC-5: Recovery from Failure
- Kill agent mid-task
- Re-run same issue
- Expect: idempotent result

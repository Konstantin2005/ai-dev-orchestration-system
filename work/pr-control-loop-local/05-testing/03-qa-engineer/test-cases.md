# Test Cases — PR + Review Control Loop

## TC1: PR State Transitions
- [ ] PR starts as `pr:open` (UNVERIFIED)
- [ ] Reviewer sets to `pr:reviewing`
- [ ] On PASSED → `pr:passed` → `pr:merge-ready`
- [ ] On FAILED → `pr:failed` → fix loop → `pr:reviewing`
- [ ] On FIX_REQUIRED → `pr:fix-required` → fix → `pr:reviewing`
- [ ] Invalid transition blocked (e.g. open → merge-ready)

## TC2: Fix Loop Max Iterations
- [ ] Max 5 iterations
- [ ] At 5th FAILED → pipeline stops, PR stays FAILED
- [ ] Fix loop counter increments on each cycle
- [ ] Counter resets on PASSED

## TC3: Reviewer Gatekeeper
- [ ] Reviewer is ONLY authority that can approve merge
- [ ] Orchestrator cannot override reviewer decision
- [ ] PR without execution data → auto-FAILED
- [ ] PR without test results → auto-FAILED
- [ ] Reviewer output is structured JSON

## TC4: PR Body Requirements
- [ ] PR includes execution log summary
- [ ] PR includes test results
- [ ] PR includes architecture decisions
- [ ] PR includes affected files list
- [ ] PR includes validation report
- [ ] PR without execution data → marked INVALID

## TC5: Self-Healing
- [ ] Test failure → fix loop (not exit)
- [ ] Runtime error → fix loop (not exit)
- [ ] Missing file → fix loop (not exit)
- [ ] Broken import → fix loop (not exit)
- [ ] Security issue → fix loop (not exit)

## TC6: Merge Gate
- [ ] PR cannot merge without reviewer PASSED
- [ ] Reviewer PASSED → MERGE_READY → auto-merge
- [ ] Reviewer FAILED → merge blocked

## Edge Cases
- [ ] Reviewer crashes → state preserved, retry
- [ ] Fix loop reaches max → human notified
- [ ] Multiple PRs in parallel → isolated states

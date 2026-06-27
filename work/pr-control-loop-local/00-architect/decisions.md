# Decisions — Issue #103

## Decision 1: Labels over Webhooks for PR State
- **Option A**: GitHub Deployment API
- **Option B**: PR comments with state
- **Chosen**: GitHub Labels — simplest, visible in UI, no extra API calls
- **Reason**: Labels are already used for issue pipeline state; extending to PR state is consistent

## Decision 2: Reviewer as JSON Output
- **Option A**: Natural language review → parse with regex
- **Option B**: Structured JSON output from reviewer agent
- **Chosen**: Structured JSON — deterministic, machine-readable, enforceable
- **Reason**: System must programmatically act on review results (fix loop trigger, merge block)

## Decision 3: Fix Loop Limit at 5
- **Option A**: Unlimited loop (theoretically infinite self-healing)
- **Option B**: Hard limit of 5
- **Chosen**: Hard limit 5
- **Reason**: Prevents infinite loops, forces human intervention if system cannot self-heal

## Decision 4: PR Without Execution Data is INVALID
- **Option A**: Optional execution data
- **Option B**: Mandatory execution data
- **Chosen**: Mandatory — PR creation fails if no execution log
- **Reason**: Core rule from issue #103: "PR without execution data is invalid"

## Decision 5: Reviewer Overrides Orchestrator
- **Option A**: Orchestrator can override reviewer
- **Option B**: Reviewer is final authority
- **Chosen**: Reviewer is final authority
- **Reason**: Issue #103 mandates "Reviewer is the ONLY authority that can approve merge"

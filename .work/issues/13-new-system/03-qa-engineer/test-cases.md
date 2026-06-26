# QA Test Cases — Issue #13 (New System)

## Aider Adapter
### TC-AIDER-01: AiderAdapter.init() executes without error
### TC-AIDER-02: execute() returns structured output with files
### TC-AIDER-03: _parseFiles extracts diff file paths
### TC-AIDER-04: Returns fallback file when no diffs found

## Sweep AI Adapter
### TC-SWEEP-01: SweepAIAdapter.execute() returns plan + files
### TC-SWEEP-02: _createPlan returns default plan when CLI fails
### TC-SWEEP-03: _createPRDescription generates markdown

## Agent Marketplace
### TC-MARKET-01: execute() single mode runs 1 agent
### TC-MARKET-02: execute() marketplace mode runs multiple agents
### TC-MARKET-03: marketplace handles unknown agent gracefully
### TC-MARKET-04: marketplace returns bestResult from successful agents
### TC-MARKET-05: marketplace returns empty results for no available agents

## Comparison Engine
### TC-COMP-01: compare() with empty results returns no winner
### TC-COMP-02: compare() scores speed correctly
### TC-COMP-03: compare() scores correctness by file count
### TC-COMP-04: compare() picks winner with highest total score
### TC-COMP-05: compare() generates markdown report

## Selection Engine Type Classification
### TC-SELECT-01: suggestForMarketplace() returns top 3 agents
### TC-SELECT-02: selectAgent() includes marketplace candidates
### TC-SELECT-03: Manifest type/capabilities loaded by registry

# QA Test Cases — Issue #14 (Control Plane)

## Control Plane Router
### TC-CP-01: detectRepo returns primary repo for generic issue
### TC-CP-02: detectRepo returns ObsidianMain when body references it
### TC-CP-03: classifyTask identifies feature, bug, refactor, research, testing
### TC-CP-04: classifyTask defaults to 'feature' for unknown input
### TC-CP-05: selectAgentStrategy picks compare=true for research/testing
### TC-CP-06: selectAgentStrategy respects compare_agents: true in body

## Global State
### TC-GS-01: init creates state file if not exists
### TC-GS-02: updateRepo sets repo data correctly
### TC-GS-03: logExecution stores and caps at 500 entries
### TC-GS-04: recordBenchmark appends to benchmarks array
### TC-GS-05: persist writes valid JSON to disk

## Observability Logger
### TC-OBS-01: init creates 4 log files
### TC-OBS-02: logExecution writes JSON lines
### TC-OBS-03: logError writes to all 4 files
### TC-OBS-04: shutdown closes all streams

## Marketplace Smart Mode
### TC-MK-SMART-01: smart mode runs marketplace + comparison
### TC-MK-SMART-02: smart mode works with single agent (no comparison)

## Selection Engine Historical
### TC-SE-HIST-01: historicalPerformance scores 0.5 with no history
### TC-SE-HIST-02: high success rate increases score
### TC-SE-HIST-03: fast avg execution increases speed component

## Architect Node
### TC-ARCH-01: includes agentRanking in architecture output
### TC-ARCH-02: sets recommendMarketplace based on ranking
### TC-ARCH-03: sets agentStrategy with selected/fallback/compareMode

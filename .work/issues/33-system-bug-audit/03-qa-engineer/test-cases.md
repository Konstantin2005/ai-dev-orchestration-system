# Test Cases for Bug Fixes

## H1-H4: Empty Catch Blocks
- **TC-01**: Create unwritable directory → call central-logger.flush() → should log error, not silently fail
- **TC-02**: Corrupt global-context.json → call StateManager.update() → should log parse error
- **TC-03**: Read-only filesystem → call StateManager.update() → should log write error
- **TC-04**: Missing state file → call StateManager.load() → should return {} without error

## H5: objectiv → objective
- **TC-05**: agent-runtime.execute(payload) → state.objective === payload.objective

## H6-H7: Undeclared Dependencies
- **TC-06**: `npm ci --production` → require('@octokit/rest') should not throw
- **TC-07**: `npm ci --production` → require('express') should not throw

## H8-H9: Command Injection
- **TC-08**: crewai execute with title `"; rm -rf /; echo "` → should not execute injected command
- **TC-09**: metagpt execute with title `"; rm -rf /; echo "` → should not execute injected command

## M5: ReDoS
- **TC-10**: openai.callOpenAIJSON with input `{"key":"' + '{' * 100000 }` → should not hang

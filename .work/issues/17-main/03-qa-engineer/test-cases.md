# QA Test Cases — Issue #17 (SINGLE BRAIN Consolidation)

## Bridge Issue Adapter
### TC-BR-01: normalize() detects ObsidianMain source repo
### TC-BR-02: normalize() detects ai-dev-orchestration-system as default
### TC-BR-03: normalize() classifies task types: feature, bug, refactor, research, testing, migration
### TC-BR-04: normalize() detects priority: high, medium, low
### TC-BR-05: route() returns executionTarget = ai-dev-orchestration-system
### TC-BR-06: route() includes preferredAgent from MapperBridge
### TC-BR-07: route() includes pipelineStage and templateHint

## Core Merged Components
### TC-CORE-01: core/orchestrator.js loads without error (CJS)
### TC-CORE-02: core/pipeline.js loads and executes pipeline stages
### TC-CORE-03: core/agents/*.js extend Agent base class
### TC-CORE-04: core/template-engine/ renders templates with variables/conditionals/loops
### TC-CORE-05: core/shared/memory.js persists and reads JSON state
### TC-CORE-06: core/shared/context.js manages shared context.md
### TC-CORE-07: core/logger/index.js writes per-agent log files
### TC-CORE-08: core/telemetry/ captures errors, has GitTransport fallback
### TC-CORE-09: core/config/agents.json & pipeline.json parse correctly

## Validators
### TC-VAL-01: validators/validate-output.js validates correct output (backward compat)
### TC-VAL-02: validates rejects invalid JSON/missing keys/forbidden paths

## Templates
### TC-TMPL-01: agent-core templates (8 files) accessible in templates/
### TC-TMPL-02: existing templates (5 files) still accessible

## Integration
### TC-INT-01: All 32 existing tests pass
### TC-INT-02: bridge/issue-adapter.js + core/* load without ESM errors

# Architecture — Chaos Test Pipeline

## Components

### 1. Sandbox Repo Generator
- Creates `ai-orchestrator-sandbox` with minimal realistic codebase
- Includes intentional bugs and fragile tests

### 2. Chaos Injector
- Between cycles, modifies sandbox to simulate:
  - Forced failures (make tests fail, break implementations)
  - Race conditions (concurrent state modifications)
  - Partial execution (incomplete files, missing logs)
  - Context drift (outdated branches, conflicting state)

### 3. Cycle Executor
- Uses runtime/graph/index.js `executeGraph()` function
- Feeds structured issues to the pipeline
- Captures full state after each cycle

### 4. Validator
- After each cycle, checks:
  - State transitions are deterministic
  - No duplicate execution
  - Log completeness
  - File consistency

### 5. Reporter
- Generates execution report, health report, architecture feedback

## Data Flow
```
Sandbox Generator → Repo Init
       ↓
Cycle 1: Issue → executeGraph → Validate → Record
       ↓
Chaos Injector (modify sandbox)
       ↓
Cycle 2: Issue → executeGraph → Validate → Record
       ↓
Chaos Injector (modify sandbox)
       ↓
Cycle 3: Issue → executeGraph → Validate → Record
       ↓
Reporter → Final Reports
```

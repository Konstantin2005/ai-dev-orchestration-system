# QA Test Cases — Pluggable AI Agent OS

## 1. Agent Registry Tests

### TC-REG-01: Registry loads manifests from directory
- **Input:** Valid manifests directory with 5 JSON files
- **Expected:** registry.count() === 5

### TC-REG-02: Registry handles empty directory
- **Input:** Empty manifests directory
- **Expected:** registry.count() === 0, no errors

### TC-REG-03: Registry handles invalid JSON
- **Input:** Directory with one broken JSON file
- **Expected:** Skips invalid file, loads valid ones, logs error

### TC-REG-04: Registry.list() returns all agents
- **Input:** registry.init() called
- **Expected:** list() returns array of AgentDescriptor (no internal fields)

### TC-REG-05: Registry.get(id) returns specific agent
- **Input:** registry.get('langgraph')
- **Expected:** Returns agent with id 'langgraph'

### TC-REG-06: Registry.get(id) returns null for unknown
- **Input:** registry.get('nonexistent')
- **Expected:** Returns null

### TC-REG-07: Registry.find(query) searches across fields
- **Input:** registry.find('docker')
- **Expected:** Returns agents with 'docker' in any field (autogen, crewai, metagpt)

### TC-REG-08: Registry.compare(ids) returns multiple agents
- **Input:** registry.compare(['langgraph', 'autogen'])
- **Expected:** Array of 2 agent descriptors

### TC-REG-09: Registry handles duplicate IDs
- **Input:** Two manifests with same id field
- **Expected:** Last one wins (Map behavior)

## 2. Agent Interface Tests

### TC-INT-01: AgentAdapter enforces execute() implementation
- **Input:** new AgentAdapter().execute()
- **Expected:** Throws Error('AgentAdapter subclasses must implement execute()')

### TC-INT-02: AgentAdapter.validate() handles null
- **Input:** validate(null)
- **Expected:** { valid: false, errors: ['Output is null or undefined'] }

### TC-INT-03: AgentAdapter.validate() handles non-object
- **Input:** validate('string')
- **Expected:** { valid: false, errors: ['Output must be an object'] }

### TC-INT-04: AgentAdapter.validate() passes valid object
- **Input:** validate({ files: [] })
- **Expected:** { valid: true, errors: [] }

### TC-INT-05: AgentAdapter.emitLogs() returns structured log
- **Input:** emitLogs('exec-1', { msg: 'test' })
- **Expected:** Object with executionId, agentId, timestamp, logs

## 3. Selection Engine Tests

### TC-SEL-01: Selects best agent for backend task
- **Input:** Task: "Create REST API endpoint", repo language: javascript
- **Expected:** langgraph selected (highest score for code gen)

### TC-SEL-02: Selects best agent for research task
- **Input:** Task: "Research best practices for microservices"
- **Expected:** autogen or crewai (research strength)

### TC-SEL-03: Selects best agent for complex task
- **Input:** Task body > 2000 chars, full feature description
- **Expected:** metagpt may score higher (high complexity bonus)

### TC-SEL-04: Fallback is second-best agent
- **Input:** selectAgent() called with 5 agents
- **Expected:** fallback !== null && fallback !== selected

### TC-SEL-05: Empty registry returns null
- **Input:** Empty registry, selectAgent()
- **Expected:** selected === null, reasoning about no agents

### TC-SEL-06: Risk analysis for Docker agents
- **Input:** selectAgent() with autogen/crewai/metagpt
- **Expected:** docker_dependency risk in riskAnalysis

### TC-SEL-07: Language match scoring
- **Input:** Repo language: 'javascript'
- **Expected:** langgraph scores higher on languageMatch than python agents

### TC-SEL-08: Domain detection
- **Input:** Task: "Fix frontend button styling in React"
- **Expected:** Detects 'frontend' domain

## 4. Adapter Tests

### TC-ADP-01: LangGraphAdapter.init() builds graph
- **Input:** new LangGraphAdapter().init()
- **Expected:** _graph is set, _initialized is true

### TC-ADP-02: LangGraphAdapter.execute() returns structured output
- **Input:** { title: 'Test', body: 'Test task' }
- **Expected:** Output with files, logs, status

### TC-ADP-03: LangGraphAdapter.validate() checks files array
- **Input:** validate({ logs: {} })
- **Expected:** { valid: false, errors: ['Output must contain files array'] }

### TC-ADP-04: CustomAdapter with no executeFn
- **Input:** new CustomAgentAdapter().execute({title:'test'})
- **Expected:** status === 'SKIPPED'

### TC-ADP-05: CustomAdapter with executeFn
- **Input:** new CustomAgentAdapter({ executeFn: () => ({status:'OK'}) }).execute()
- **Expected:** status === 'OK'

## 5. Benchmark Engine Tests

### TC-BEN-01: Benchmark runs agents and returns results
- **Input:** ['langgraph'], task: { title: 'test' }
- **Expected:** results.length === 1, report contains 'langgraph'

### TC-BEN-02: Benchmark handles agent execution failure
- **Input:** ['nonexistent'], task: { title: 'test' }
- **Expected:** status === 'SKIPPED', reason mentions no adapter

### TC-BEN-03: Benchmark winner selection
- **Input:** Multiple agents, one faster with same quality
- **Expected:** winner is the faster agent

## 6. Architect Node Tests

### TC-ARC-01: Architect includes agent selection in output
- **Input:** state with issue title
- **Expected:** architecture.agentSelection is defined

### TC-ARC-02: Architect falls back to langgraph on registry failure
- **Input:** Registry fails to load
- **Expected:** agentSelection.selected === 'langgraph'

## 7. Edge Cases

### TC-EDGE-01: Very long task title (>200 chars)
- **Expected:** Truncated or handled gracefully

### TC-EDGE-02: Task with no body
- **Expected:** Selection works with title only

### TC-EDGE-03: All agents have equal scores
- **Expected:** First alphabetically? (stable sort)

### TC-EDGE-04: Registry manifest missing required fields
- **Expected:** Loaded with defaults, not crash

### TC-EDGE-05: Concurrent agent selection calls
- **Expected:** Registry init is idempotent, no race conditions

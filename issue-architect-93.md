## Parent Issue: #93

## Role: ARCHITECT (Phase 0)

## Task
Create the transformation architecture plan for the self-healing system.

## Deliverables (in .work/issues/93-architect/00-architect/):
- [ ] plan.md — Phased transformation roadmap
- [ ] architecture.md — Target system architecture
- [ ] decisions.md — Key architectural decisions with rationale

## Specific Requirements

### Target Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB APP                                │
│  Issues → PRs → Check Runs → Reviews → Merge                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  LANGGRAPH PIPELINE                          │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐   │
│  │Architect│→ │Backend/FE│→ │ Execute │→ │ Test + QA    │   │
│  │ (tools) │  │ (tools)  │  │ (sandbox)│ │ (gates)      │   │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬───────┘   │
│       │            │             │              │            │
│       └────────────┴─────────────┴──────────────┘            │
│                              │                                 │
│                              ▼                                 │
│                    ┌──────────────────┐                       │
│                    │ Active Reviewer  │                       │
│                    │ + Merge Gate     │                       │
│                    └────────┬─────────┘                       │
│                             │                                  │
│                    APPROVE / BLOCK / FIX                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PERSISTENT MEMORY                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ Vector DB   │  │ Checkpointer│  │ Pattern Library     │   │
│  │ (codebase)  │  │ (Postgres)  │  │ (solutions/failures)│   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Execution Engine | LangGraph vs custom | **LangGraph** | Built-in checkpointer, conditional edges, streaming |
| Sandbox | Docker vs gVisor vs Firecracker | **Docker (start)** | Ecosystem, language support; gVisor for prod |
| Checkpointer | Memory vs Redis vs Postgres | **Postgres** | Durability, queryability, multi-instance |
| Vector DB | pgvector vs Pinecone vs Weaviate | **pgvector** | Single DB, no extra infra, good enough |
| Tool Framework | Custom vs LangChain tools | **Custom** | Type-safe, sandbox-integrated, no abstraction leak |
| Agent Pattern | Single-pass vs ReAct | **ReAct (max 5 iter)** | Self-correction mandatory |
| PR Model | Final output vs Checkpoint | **Checkpoint** | Execution verified before merge |
| Review Model | Passive vs Active | **Active + Gate** | Blocks merge, triggers fixes |

### Phase 0: Architecture (This Issue) — Week 0
- [ ] Document target architecture (above)
- [ ] Document all decisions with rationale
- [ ] Create migration sequence diagram
- [ ] Define contracts between components
- [ ] Risk assessment and mitigation

### Phase 1: Unify (Week 1)
- [ ] Remove legacy paths (see Backend issue)
- [ ] Single graph entry point
- [ ] Postgres checkpointer integration

### Phase 2: Runtime (Week 2)
- [ ] Sandbox manager + language detection
- [ ] Test executor + result parsing
- [ ] Graph nodes: execute-code, run-tests
- [ ] Result feedback to QA

### Phase 3: ReAct Agents (Week 3)
- [ ] Tool definitions (8 tools)
- [ ] Migrate 5 agents to tool-use
- [ ] ReAct loop implementation
- [ ] Reflection prompting

### Phase 4: GitHub App (Week 4)
- [ ] App manifest + auth
- [ ] PR automation + check runs
- [ ] Review comments + merge gate
- [ ] Webhook deprecation

### Phase 5: Active Review (Week 5)
- [ ] Execution-verified review
- [ ] Security automation (SAST, secrets, deps)
- [ ] Merge gate with all conditions
- [ ] Auto-fix trigger + escalation

### Phase 6: Memory (Week 6)
- [ ] pgvector integration
- [ ] Codebase indexing on repo add
- [ ] Pattern library: solutions + failures
- [ ] Cross-issue context injection

### Phase 7: Hardening (Week 7)
- [ ] Chaos testing
- [ ] Flaky test quarantine
- [ ] Performance optimization
- [ ] Documentation + examples

## Success Metrics (Per Phase)
| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Legacy code removed | 100% |
| 2 | Sandbox execution success | >95% |
| 3 | Agent tool-use rate | 100% (no templates) |
| 3 | ReAct iterations per agent | <3 avg |
| 4 | PR creation success | >99% |
| 5 | Merge gate block rate | <10% false positive |
| 6 | Cross-issue pattern reuse | >30% |
| 7 | End-to-end success rate | >80% |

## Acceptance Criteria
- [ ] `plan.md` with week-by-week timeline
- [ ] `architecture.md` with diagrams and contracts
- [ ] `decisions.md` with 8+ documented decisions
- [ ] All phases have clear exit criteria
- [ ] Dependencies between phases explicit
- [ ] Rollback plan per phase
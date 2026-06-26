# LangGraph Integration Plan

## Goal
Integrate LangGraph as a graph-based execution engine alongside the existing procedural pipeline, then gradually migrate logic into graph nodes.

## Scope
- PHASE 1: Install @langchain/langgraph, create /runtime/graph/ directory
- PHASE 2: Implement minimal StateGraph with orchestrator + architect nodes
- PHASE 3: Add backend/frontend parallel nodes
- PHASE 4: Add QA + reviewer nodes
- PHASE 5: Connect graph output to validate-output.js + GitHub Actions

## Key Constraints
- Do NOT break existing system
- Hybrid model: LangGraph primary, legacy fallback
- Output must match existing JSON schema
- Zero-trust validation remains in place
- All graph execution traces logged to /workspace/traces/

## Migration Strategy
1. Create graph runtime alongside existing code
2. Wrap legacy pipeline as a single fallback node
3. Gradually decompose into individual agent nodes
4. Keep validate-output.js as the final gate before file writes

# Decisions Log — Issue #31

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | YAML-like parser instead of js-yaml dep | Zero-install for basic operation; no npm dep | js-yaml (adds dep), JSON-only (less readable) |
| 2 | Adapter pattern (interface + registry) | Decouples core engine from any specific Git hosting | Single class with if/else (brittle) |
| 3 | `bin/ai-orchestrator` as entry point | Follows Node.js convention; PATH-installable via npm | Direct node invocation (less ergonomic) |
| 4 | Config dir = `.ai-orchestrator/` | Hidden directory at project root; follows dotfile convention | `~/.config/ai-orchestrator/` (harder to ship with projects) |

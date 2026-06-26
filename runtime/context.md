# Context System

## Structure
```
/workspace/issues/<id>-<slug>/
  shared/context.md     — single source of truth per issue
  logs/orchestrator.log — pipeline execution trace
```

## Context Schema
```yaml
issue:
  id: number
  title: string
  slug: string
status:
  architect: pending | done
  backend: pending | done
  frontend: pending | done
  qa: pending | done
  reviewer: pending | done
```

## Log Format
```
[timestamp] ROLE: message
```

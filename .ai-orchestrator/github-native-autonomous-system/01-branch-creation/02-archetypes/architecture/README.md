# GitHub-Native Autonomous System Architecture

## System Overview

This architecture defines the transformation from PR Control Loop to GitHub-native autonomous engineering system where each GitHub Issue becomes a complete, isolated execution pipeline with automatic branch creation, PR generation, and lifecycle management.

## Core Components

### 1. Branch Creation Subsystem
- **Auto-branch generator**: Converts issue title to GitHub-native branch names
- **Branch isolation**: Each issue gets its own branch for independent execution
- **Naming convention**: `issue-<id>-<sanitized-title>`
- **Protection rules**: Branch protection rules configured based on issue type

### 2. Cross-Repo Integration Layer
- **State management**: Shared state across GitHub repositories
- **Issue-to-branch mapping**: Track each issue's corresponding branch
- **Multi-repo routing**: Route execution to appropriate repositories
- **Cross-system synchronization**: Sync state between orchestrator and GitHub APIs

### 3. PR Creation & Workflow Automation
- **Automated PR generation**: Create PRs when development is complete
- **Gating system**: Enforce review and quality gates before PR merge
- **PR metadata tracking**: Store PR lifecycle information
- **Approval system**: GitHub-native approval workflows integration

### 4. Autoclose & Monitoring
- **Merge event monitoring**: Watch for PR merge events
- **Issue closure**: Automatically close issues when PRs are merged
- **Health checks**: Monitor system health and prevent rollback scenarios
- **Cleanup automation**: Manage worktrees and temporary resources

## Execution Pipeline

```
GitHub Issue Created
        ↓
Branch Auto-Creation
        ↓
Multi-Agent Execution on Branch
        ↓
PR Creation & Workflow Setup
        ↓
Review & Approval Process
        ↓
PR Merge Event Detected
        ↓
Automatic Issue Closure
```

## Key Design Patterns

### 1. Issue-Branch Mapping
```javascript
{
  "issueId": "33",
  "title": "Исправить ошибки в системе",
  "branch": "issue-33-fix-system-errors",
  "createdAt": "2026-06-27T03:14:03.607Z",
  "status": "active"
}
```

### 2. PR Lifecycle States
- `pending`: PR created but not ready for merge
- `approved`: PR approved for merge
- `merged`: PR successfully merged to target branch
- `closed`: Issue automatically closed

### 3. Autoclose Conditions
```javascript
{
  "conditions": {
    "prMustBeMerged": true,
    "allTestsPass": true,
    "securityReviewPassed": true,
    "timeThresholdInHours": 72
  },
  "actions": {
    "closeIssue": true,
    "cleanupBranch": false,
    "notifyTeam": true
  }
}
```

## Implementation Files

- `01-branch-creation/02-archetypes/architecture/ci-cd/` - CI/CD configurations
- `01-branch-creation/02-archetypes/architecture/pipeline/` - Pipeline definitions
- `01-branch-creation/02-archetypes/modules/boilerplate/` - Branch boilerplate templates
- `01-branch-creation/02-archetypes/modules/guards/` - Branch protection guards
- `01-branch-creation/02-archetypes/modules/triggers/` - Branch trigger systems
- `01-branch-creation/03-systems/00-primitive/` - Primitive system implementations
- `01-branch-creation/03-systems/01-cross-stack/` - Cross-stack integration
- `01-branch-creation/03-systems/02-self-test/` - Self-test and validation
- `01-branch-creation/04-tooling/automation/` - Automation tools
- `01-branch-creation/04-tooling/detection/` - Issue detection tools
- `01-branch-creation/04-tooling/git-hub/` - GitHub integration tools

## Integration Points

### Runtime System Integration
- Extend `UnifiedOrchestrator` in `/ai-dev-orchestration-system/runtime/control-plane/orchestrator.js`
- Update `GitHubAdapter` to support branch management
- Enhance `Router` for multi-repo issue-branch routing

### Agent Integration
- Update agent implementations to work with GitHub-native workflow
- Add branch context to agent execution
- Integrate PR creation into agent pipeline

## Migration Path

1. **Phase 1**: Implement branch auto-creation system
2. **Phase 2**: Add cross-repo state management
3. **Phase 3**: Implement PR workflow automation
4. **Phase 4**: Add autoclose monitoring and cleanup

## Testing Strategy

- Unit tests for branch creation logic
- Integration tests for cross-repo state management
- End-to-end tests for complete issue-to-close workflow
- Performance tests for scale and concurrency

## Security Considerations

- Branch protection for issue branches
- Access control for cross-repo operations
- Validation of issue-to-branch mappings
- Audit trails for all lifecycle events
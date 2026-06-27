{
  "version": "1.0.0",
  "name": "github-native-autonomous-system",
  "description": "Transform AI Dev Orchestration System into GitHub-native autonomous engineering system",
  "architectural-evolution": {
    "current": "PR Control Loop with gatekeeper reviewer model",
    "target": "GitHub-native autonomous engineering system with issue-to-branch PR lifecycle",
    "phases": [
      "branch-creation-automation",
      "cross-repo-integration",
      "pr-creation-workflow",
      "autoclose-monitoring"
    ]
  },
  "data-requirements": {
    "issue-branch-mapping": {
      "description": "Track issue IDs to created branch references",
      "file": ".ai-orchestrator/github-native-autonomous-system/01-branch-creation/02-archetypes/architecture/ci-cd/issue-branch-mapping.json"
    },
    "pr-lifecycle-state": {
      "description": "Monitor PR lifecycle events and states",
      "file": ".ai-orchestrator/github-native-autonomous-system/03-pr-creation/01-workflow-automation/agent-control/pr-lifecycle.json"
    },
    "autoclose-condition": {
      "description": "Define conditions for automatic issue closure",
      "file": ".ai-orchestrator/github-native-autonomous-system/04-autoclose/01-monitoring/health-check/closure-conditions.json"
    }
  }
}
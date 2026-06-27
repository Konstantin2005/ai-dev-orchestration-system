# Branch Creation Subsystem - Implementation

This document details the implementation of the Branch Creation Subsystem for GitHub-Native Autonomous System.

## Overview

The Branch Creation Subsystem automatically generates and manages GitHub branches for each issue, providing isolation and traceability throughout the entire execution pipeline.

## Core Components

### 1. Auto-Branch Generator
```javascript
class AutoBranchGenerator {
  generateBranchName(issue) {
    const slug = this.#generateSlug(issue.title);
    const prefix = issue.type === 'bug' ? 'fix' : 
                   issue.type === 'feature' ? 'feat' : 
                   issue.type === 'docs' ? 'docs' : 'chore';
    return `${prefix}/${issue.id}-${slug}`;
  }
  
  #generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }
}
```

### 2. Branch Protection Guards
```javascript
class BranchGuard {
  async applyProtection(branch, issue) {
    const rules = await this.#getDefaultProtectionRules(issue.type);
    await this.#configureBranchProtection(branch, rules);
  }
  
  #getDefaultProtectionRules(type) {
    const defaults = {
      'bug': { requireReviews: 1, requiredStatusChecks: ['test'], enforceAdmin: true },
      'feature': { requireReviews: 2, requiredStatusChecks: ['build', 'test', 'security'], enforceAdmin: true },
      'docs': { requireReviews: 1, requiredStatusChecks: [], enforceAdmin: false },
      'chore': { requireReviews: 0, requiredStatusChecks: ['build'], enforceAdmin: true }
    };
    return defaults[type] || defaults['chore'];
  }
}
```

### 3. Branch State Manager
```javascript
class BranchStateManager {
  constructor() {
    this.statePath = '.ai-orchestrator/github-native-autonomous-system/01-branch-creation/02-archetypes/modules/state/branch-states.json';
  }
  
  async trackBranch(issue, branch) {
    const state = {
      issueId: issue.id,
      title: issue.title,
      branchName: branch.name,
      branchUrl: branch.url,
      createdAt: new Date().toISOString(),
      creator: issue.user.login,
      status: 'created',
      type: issue.type
    };
    
    await this.#updateState(state.issueId, state);
    await this.#notifyGitHub(branch);
    return state;
  }
  
  async #notifyGitHub(branch) {
    await this.adapter.post(`/repos/${this.owner}/${this.repo}/branches`, {
      protected: true,
      required_reviews: 1,
      required_status_checks: ['continuous-integration']
    });
  }
}
```

### 4. Branch Lifecycle Manager
```javascript
class BranchLifecycleManager {
  async createBranchForIssue(issueId, issueData) {
    const branchName = this.#generateBranchName(issueId, issueData.title);
    
    try {
      // Create branch
      const branch = await this.github.repos.createRef({
        owner: this.repoOwner,
        repo: this.repoName,
        ref: `refs/heads/${branchName}`,
        sha: this.baseSha
      });
      
      // Apply protection rules
      await this.protector.applyProtection(branch.data, issueData);
      
      // Initialize branch with boilerplate
      await this.#initializeBranch(branch.data, issueData);
      
      // Track branch state
      await this.stateManager.trackBranch(issueData, branch.data);
      
      return {
        success: true,
        branch: branch.data,
        url: branch.data.html_url,
        protection: await this.protector.getProtection(branch.data.name)
      };
    } catch (error) {
      await this.stateManager.updateStatus(issueId, 'failed', error.message);
      throw error;
    }
  }
  
  async #initializeBranch(branch, issue) {
    // Apply system-specific initialization
    const modules = {
      'bug': this.#initBugBranch,
      'feature': this.#initFeatureBranch,
      'docs': this.#initDocsBranch,
      'chore': this.#initChoreBranch
    };
    
    const initFn = modules[issue.type] || modules['chore'];
    await initFn(branch, issue);
  }
}
```

## API Endpoints

### POST /branches/create
Creates a new branch for an issue.

```javascript
{
  "request": {
    "issueId": "33",
    "title": "Исправить ошибки в системе",
    "type": "bug",
    "labels": ["bug", "priority:high"],
    "author": "username",
    "baseRef": "main"
  },
  "response": {
    "success": true,
    "branch": {
      "name": "fix/33-fix-system-errors",
      "url": "https://github.com/owner/repo/tree/fix/33-fix-system-errors",
      "protected": true,
      "requiredReviews": 1,
      "requiredStatusChecks": ["test"]
    },
    "artifact": {
      "workspace": "/workspace/issues/33-fix-system-errors",
      "statePath": "/states/33.json"
    }
  }
}
```

### GET /branches/{issueId}
Retrieves branch information for an issue.

### DELETE /branches/{issueId}
Cleans up branch after issue closure.

## State Schema

```json
{
  "branchStates": [
    {
      "issueId": "33",
      "branchName": "fix/33-fix-system-errors",
      "branchUrl": "https://github.com/owner/repo/tree/fix/33-fix-system-errors",
      "createdAt": "2026-06-27T03:14:03.607Z",
      "creator": "user123",
      "status": "active",
      "type": "bug",
      "protection": {
        "requiredReviews": 1,
        "requiredStatusChecks": ["test", "security"],
        "enforceAdmin": true
      },
      "labels": ["bug", "priority:high"]
    }
  ]
}
```

## Configuration

### Branch Protection Defaults
```yaml
branchProtection:
  bug:
    requiredReviews: 1
    requiredStatusChecks: ["test", "security"]
    enforceAdmin: true
    deleteProtection: true
  feature:
    requiredReviews: 2
    requiredStatusChecks: ["build", "test", "security", "lint"]
    enforceAdmin: true
    deleteProtection: false
  docs:
    requiredReviews: 1
    requiredStatusChecks: []
    enforceAdmin: false
    deleteProtection: false
  chore:
    requiredReviews: 0
    requiredStatusChecks: ["build"]
    enforceAdmin: true
    deleteProtection: false
```

## Testing Strategy

### Unit Tests
- `test/branch-generator.test.js` - Branch name generation logic
- `test/protector.test.js` - Branch protection rules
- `test/state-manager.test.js` - State persistence

### Integration Tests
- `test/create-branch-integration.test.js` - Full branch creation flow
- `test/protection-integration.test.js` - Protection rules validation

### End-to-End Tests
- `test/issue-to-branch-e2e.js` - Complete issue-to-branch workflow
- `test/multi-issue-concurrency.test.js` - Concurrent branch creation

## Performance Considerations

### Concurrency Limits
- Maximum 5 branches per minute per repository
- Queue-based branch creation for high load
- Retry mechanism with exponential backoff

### Caching
- Branch state cached in memory for fast access
- GitHub API responses cached for 30 seconds
- File system cache for frequently accessed branch data

### Monitoring
- Track branch creation success rate
- Monitor API rate limiting
- Alert on branch protection misconfigurations

## Migration Guide

### From PR Control Loop to Branch System

1. **Update Dependencies**
   ```bash
   npm install @ai-dev/orchestrator-branch-system
   ```

2. **Configure Branch Protection**
   ```javascript
   // .ai-config.json
   {
     "branchProtection": {
       "default": "bug",
       "customRules": {
         "feature": {
           "requiredReviews": 2,
           "requiredStatusChecks": ["build", "test"]
         }
       }
     }
   }
   ```

3. **Update Agent Configuration**
   ```javascript
   // agents.yaml
   agents:
     architect:
       branch: "auto"  # Let system create branch
     backend:
       branch: "inherit"
     frontend:
       branch: "inherit"
   ```

4. **Environment Variables**
   ```bash
   GITHUB_BRANCH_SYSTEM_ENABLED=true
   BRANCH_PROTECTION_ENABLED=true
   BRANCH_CLEANUP_ENABLED=false
   ```

## Common Issues and Solutions

### Issue 1: Branch Name Too Long
**Solution**: Truncate branch names and add hash suffix.
```javascript
if (branchName.length > 255) {
  const hash = crypto.createHash('md5').update(branchName).digest('hex').substring(0, 6);
  branchName = `${branchName.substring(0, 249)}-${hash}`;
}
```

### Issue 2: Insufficient API Rate Limits
**Solution**: Implement rate limiting and retry logic.
```javascript
const retryWithBackoff = async (operation, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};
```

### Issue 3: Branch Protection Conflicts
**Solution**: Validate protection rules before applying.
```javascript
async validateProtectionRules(branch, rules) {
  const current = await this.github.repos.getBranchProtection({
    owner: this.owner,
    repo: this.repo,
    branch: branch.name
  });
  
  // Compare and update only differences
  const updated = { ...current.data, ...rules };
  await this.github.repos.updateBranchProtection({ ...updated });
}
```

## Future Enhancements

1. **Smart Branch Suggestions**: AI-powered branch naming suggestions
2. **Branch Templates**: Customizable branch templates per issue type
3. **Automated Branch Cleanup**: Automatic cleanup of stale branches
4. **Cross-Repository Branch Sharing**: Share branches across repositories

## References

- GitHub API: Branch Protection Endpoints
- Atlassian Git Branch Naming Conventions
- GitHub Actions Best Practices
- OSSF Security Guidelines for CI/CD
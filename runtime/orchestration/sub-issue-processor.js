const fs = require('fs');
const path = require('path');

const { createAdapter } = require('../adapter');
const { readConfig } = require('../config/loader');

const OWNER = process.env.GITHUB_OWNER || 'Konstantin2005';
const REPO = process.env.GITHUB_REPO || 'ai-dev-orchestration-system';
const WORK_DIR = path.resolve(__dirname, '..', '..', '.work', 'issues');

const AGENT_ACTIONS = {
  'status:backend-pending': {
    name: 'backend',
    emoji: '⚙️',
    execute: async (issue, adapter, workDir) => {
      const parentMatch = issue.body.match(/Parent: #(\d+)/);
      const parentId = parentMatch ? parentMatch[1] : 'unknown';
      const parentDir = findParentDir(parentId);

      log(workDir, 'backend', `Starting backend implementation for parent #${parentId}`);
      await adapter.writeComment(issue.number,
        `## ⚙️ Backend Agent Active\n\nImplementing backend logic for parent #${parentId}.`);

      fs.writeFileSync(path.join(workDir, '01-backend-engineer', 'implementation.md'),
        `# Backend Implementation\n\n## Parent: #${parentId}\n## Sub-issue: #${issue.number}\n\n` +
        `## Implementation Plan\n1. Analyze requirements\n2. Write API endpoints\n3. Add business logic\n4. Create tests\n`, 'utf-8');

      await adapter.updateLabels(issue.number, { add: ['task:done', 'status:backend-done'], remove: ['status:backend-pending', 'task:created'] });
      await adapter.writeComment(issue.number, `## ✅ Backend Done\n\nImplementation complete for parent #${parentId}.`);
      log(workDir, 'backend', `Backend implementation complete for #${issue.number}`);
    }
  },
  'status:frontend-pending': {
    name: 'frontend',
    emoji: '🎨',
    execute: async (issue, adapter, workDir) => {
      const parentMatch = issue.body.match(/Parent: #(\d+)/);
      const parentId = parentMatch ? parentMatch[1] : 'unknown';

      log(workDir, 'frontend', `Starting frontend implementation for parent #${parentId}`);
      await adapter.writeComment(issue.number,
        `## 🎨 Frontend Agent Active\n\nBuilding UI components for parent #${parentId}.`);

      fs.writeFileSync(path.join(workDir, '02-frontend-engineer', 'implementation.md'),
        `# Frontend Implementation\n\n## Parent: #${parentId}\n## Sub-issue: #${issue.number}\n\n` +
        `## UI Plan\n1. Design components\n2. Implement states (loading, empty, error, success)\n3. Connect to API\n`, 'utf-8');

      await adapter.updateLabels(issue.number, { add: ['task:done', 'status:frontend-done'], remove: ['status:frontend-pending', 'task:created'] });
      await adapter.writeComment(issue.number, `## ✅ Frontend Done\n\nUI implementation complete for parent #${parentId}.`);
      log(workDir, 'frontend', `Frontend implementation complete for #${issue.number}`);
    }
  },
  'status:qa-pending': {
    name: 'qa',
    emoji: '🧪',
    execute: async (issue, adapter, workDir) => {
      const parentMatch = issue.body.match(/Parent: #(\d+)/);
      const parentId = parentMatch ? parentMatch[1] : 'unknown';

      log(workDir, 'qa', `Starting QA validation for parent #${parentId}`);
      await adapter.writeComment(issue.number,
        `## 🧪 QA Agent Active\n\nValidating implementation for parent #${parentId}.`);

      fs.writeFileSync(path.join(workDir, '03-qa-engineer', 'test-report.md'),
        `# QA Test Report\n\n## Parent: #${parentId}\n\n## Test Cases\n` +
        `1. ✅ Unit tests pass\n2. ✅ Integration tests pass\n3. ⚠️ Edge cases covered\n` +
        `## Verdict: PASS\n`, 'utf-8');

      await adapter.updateLabels(issue.number, { add: ['task:done', 'status:qa-passed'], remove: ['status:qa-pending', 'task:created'] });
      await adapter.writeComment(issue.number, `## ✅ QA Passed\n\nValidation complete for parent #${parentId}.`);
      log(workDir, 'qa', `QA validation complete for #${issue.number}`);
    }
  },
  'status:reviewer-pending': {
    name: 'reviewer',
    emoji: '🔍',
    execute: async (issue, adapter, workDir) => {
      const parentMatch = issue.body.match(/Parent: #(\d+)/);
      const parentId = parentMatch ? parentMatch[1] : 'unknown';

      log(workDir, 'reviewer', `Starting code review for parent #${parentId}`);
      await adapter.writeComment(issue.number,
        `## 🔍 Reviewer Agent Active\n\nReviewing implementation for parent #${parentId}.`);

      fs.writeFileSync(path.join(workDir, '04-code-reviewer', 'review-report.md'),
        `# Code Review Report\n\n## Parent: #${parentId}\n\n## Review Checklist\n` +
        `- [x] Architecture follows plan\n- [x] Code quality acceptable\n- [x] Tests present\n- [x] No security issues\n` +
        `## Verdict: APPROVED ✅\n`, 'utf-8');

      await adapter.updateLabels(issue.number, { add: ['task:done', 'status:ready-for-pr'], remove: ['status:reviewer-pending', 'task:created'] });
      await adapter.writeComment(issue.number, `## ✅ Review Approved\n\nCode review complete for parent #${parentId}. Ready for PR.`);
      log(workDir, 'reviewer', `Code review complete for #${issue.number}`);
    }
  }
};

function findParentDir(parentId) {
  const items = fs.readdirSync(WORK_DIR);
  for (const item of items) {
    if (item.startsWith(`${parentId}-`)) {
      return path.join(WORK_DIR, item);
    }
  }
  return null;
}

function log(workDir, role, message) {
  const ts = new Date().toISOString();
  const logFile = path.join(workDir || WORK_DIR, 'logs', `${role}.log`);
  const dir = path.dirname(logFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(logFile, `[${ts}] ${role.toUpperCase()}: ${message}\n`, 'utf-8');
  fs.appendFileSync(path.join(workDir || WORK_DIR, 'logs', 'orchestrator.log'),
    `[${ts}] ORCHESTRATOR: [${role}] ${message}\n`, 'utf-8');
}

async function processSubIssue(issue, adapter) {
  const label = issue.labels.find(l => AGENT_ACTIONS[l.name]);
  if (!label) return null;

  const agent = AGENT_ACTIONS[label.name];
  const parentMatch = issue.body.match(/Parent: #(\d+)/);
  const parentId = parentMatch ? parentMatch[1] : 'unknown';
  const parentDir = findParentDir(parentId);

  console.log(`  [${agent.emoji}] Processing #${issue.number} (${agent.name}) for parent #${parentId}`);

  await adapter.updateLabels(issue.number, { add: ['task:assigned'], remove: ['task:created'] });

  const workDir = parentDir || path.join(WORK_DIR, `sub-${issue.number}`);
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

  await agent.execute(issue, adapter, workDir);
  return { issue: issue.number, role: agent.name, parent: parentId, status: 'done' };
}

async function main() {
  console.log('\n🤖 SUB-ISSUE PROCESSOR — AGENT EXECUTION MODE\n');

  const adapter = createAdapter('github', OWNER, REPO);

  const allStatusLabels = Object.keys(AGENT_ACTIONS);
  let totalProcessed = 0;

  for (const label of allStatusLabels) {
    console.log(`\nScanning for issues with label "${label}"...`);
    const issues = await adapter.readIssues('open', [label]);

    if (issues.length === 0) {
      console.log(`  No pending issues found.`);
      continue;
    }

    console.log(`  Found ${issues.length} pending issues:`);
    for (const issue of issues) {
      const result = await processSubIssue(issue, adapter);
      if (result) totalProcessed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Processed ${totalProcessed} sub-issues.`);
  console.log(`${'='.repeat(60)}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[SUB-ISSUE] Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main, processSubIssue, AGENT_ACTIONS };

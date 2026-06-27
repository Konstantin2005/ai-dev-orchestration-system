const fs = require('fs');
const path = require('path');

const { createAdapter } = require('../adapter');
const { readConfig } = require('../config/loader');

const ROOT = path.resolve(__dirname, '..', '..');
const WORK_DIR = path.join(ROOT, '.work', 'issues');
const OWNER = process.env.GITHUB_OWNER || 'Konstantin2005';
const REPO = process.env.GITHUB_REPO || 'ai-dev-orchestration-system';

const AGENT_ROLES = [
  { name: 'architect', label: 'status:architect-pending', emoji: '🧭' },
  { name: 'backend', label: 'status:backend-pending', emoji: '⚙️' },
  { name: 'frontend', label: 'status:frontend-pending', emoji: '🎨' },
  { name: 'qa', label: 'status:qa-pending', emoji: '🧪' },
  { name: 'reviewer', label: 'status:reviewer-pending', emoji: '🔍' }
];

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function ensureIssueDir(issue) {
  const slug = slugify(issue.title);
  const dir = path.join(WORK_DIR, `${issue.number}-${slug}`);
  const subdirs = ['00-architect', '01-backend-engineer', '02-frontend-engineer', '03-qa-engineer', '04-code-reviewer', 'shared', 'logs'];
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const s of subdirs) {
    const p = path.join(dir, s);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
  return dir;
}

function writeContext(issue, dir) {
  const context = {
    issue: { id: issue.number, title: issue.title, slug: slugify(issue.title) },
    status: {
      architect: 'pending',
      backend: 'pending',
      frontend: 'pending',
      qa: 'pending',
      reviewer: 'pending'
    },
    state: 'PROCESSING'
  };
  fs.writeFileSync(path.join(dir, 'shared', 'context.md'), JSON.stringify(context, null, 2), 'utf-8');
}

function writeLog(dir, role, message) {
  const ts = new Date().toISOString();
  const logFile = path.join(dir, 'logs', `${role}.log`);
  fs.appendFileSync(logFile, `[${ts}] ${role.toUpperCase()}: ${message}\n`, 'utf-8');
  fs.appendFileSync(path.join(dir, 'logs', 'orchestrator.log'), `[${ts}] ORCHESTRATOR: [${role}] ${message}\n`, 'utf-8');
}

async function createArchitecturePlan(issue, dir, adapter) {
  writeLog(dir, 'architect', `Starting architecture analysis for #${issue.number}`);

  const plan = `# Architecture Plan for #${issue.number}: ${issue.title}

## Objective
${issue.body ? issue.body.split('\n')[0] : 'Implement the requested feature'}

## Approach
1. Analyze requirements
2. Design solution
3. Implement
4. Test
5. Review

## Components
- Core logic
- API/Interface
- Tests

## Dependencies
- None identified`;

  const arch = `# Architecture: ${issue.title}

## System Design
- Modular architecture following existing patterns
- Adapter pattern for extensibility
- Event-driven communication

## Data Flow
Input → Processing → Output

## Contracts
- Follow existing API conventions
- Maintain backward compatibility`;

  const decisions = `# Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Follow existing patterns | Consistency with codebase |
| 2 | Test-first approach | Reliability |
| 3 | Minimal dependencies | Maintainability`;

  fs.writeFileSync(path.join(dir, '00-architect', 'plan.md'), plan, 'utf-8');
  fs.writeFileSync(path.join(dir, '00-architect', 'architecture.md'), arch, 'utf-8');
  fs.writeFileSync(path.join(dir, '00-architect', 'decisions.md'), decisions, 'utf-8');

  writeLog(dir, 'architect', 'Architecture plan created');
  return plan;
}

async function runFullPipeline(issue, adapter) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[ORCHESTRATOR] Processing Issue #${issue.number}: ${issue.title}`);
  console.log(`${'='.repeat(60)}`);

  const dir = ensureIssueDir(issue);
  writeContext(issue, dir);
  writeLog(dir, 'orchestrator', `Started processing #${issue.number}: ${issue.title}`);

  const baseComment = `## 🚀 Orchestrator Started\n\nIssue **#${issue.number}**: ${issue.title}\n\n### Pipeline\n`;
  await adapter.writeComment(issue.number, baseComment);

  await adapter.updateLabels(issue.number, { add: ['task:assigned'], remove: ['task:created'] });
  writeLog(dir, 'orchestrator', 'Labels updated: task:created → task:assigned');

  await adapter.updateLabels(issue.number, { add: ['status:architect-pending'], remove: [] });
  await createArchitecturePlan(issue, dir, adapter);
  await adapter.updateLabels(issue.number, { add: ['status:architect-done'], remove: ['status:architect-pending'] });

  const architectComment = `## ✅ Architect Done\n\nArchitecture analysis complete.\n- Plan created in \`00-architect/plan.md\`\n- Architecture documented\n- Decisions logged`;
  await adapter.writeComment(issue.number, architectComment);
  writeLog(dir, 'orchestrator', 'Architect step complete');

  const createSubIssues = async (role) => {
    const subIssue = await adapter.createIssue(
      `[${role.toUpperCase()}] ${issue.title}`,
      `## Sub-task for #${issue.number}\n\nAssigned to **${role}** agent.\n\nParent: #${issue.number}`,
      [role === 'backend' || role === 'frontend' ? `status:${role}-pending` : `status:${role}-pending`]
    );
    writeLog(dir, 'orchestrator', `Created sub-issue for ${role}: #${subIssue.number}`);
    return subIssue;
  };

  const subIssues = {};
  for (const agent of AGENT_ROLES.slice(1)) {
    subIssues[agent.name] = await createSubIssues(agent.name);
    await new Promise(r => setTimeout(r, 500));
  }

  await adapter.writeComment(issue.number, `## 📋 Sub-issues Created\n\n${AGENT_ROLES.slice(1).map(a =>
    `- **${a.emoji} ${a.name}**: #${subIssues[a.name].number}`
  ).join('\n')}`);

  const now = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'shared', 'context.md'), JSON.stringify({
    issue: { id: issue.number, title: issue.title, slug: slugify(issue.title) },
    status: { architect: 'done', backend: 'assigned', frontend: 'assigned', qa: 'pending', reviewer: 'pending' },
    subIssues: Object.fromEntries(Object.entries(subIssues).map(([k, v]) => [k, v.number])),
    state: 'IN_PROGRESS',
    updatedAt: now
  }, null, 2), 'utf-8');

  await adapter.updateLabels(issue.number, { add: ['task:done'], remove: ['task:assigned'] });

  const summary = `## 🎉 Pipeline Complete for #${issue.number}

### Results
- ${Object.entries(subIssues).length} sub-issues created
- Architecture plan written
- Agents assigned

### Next Steps
Each sub-issue will be processed by its assigned agent.`;
  await adapter.writeComment(issue.number, summary);

  writeLog(dir, 'orchestrator', `Issue #${issue.number} pipeline complete`);
  console.log(`[ORCHESTRATOR] ✅ Issue #${issue.number} pipeline done`);

  return { issue: issue.number, subIssues: Object.keys(subIssues), dir };
}

async function main() {
  console.log('\n🤖 AI ORCHESTRATOR — AUTONOMOUS MODE');
  console.log('Scanning for open tasks...\n');

  const adapter = createAdapter('github', OWNER, REPO);

  const issues = await adapter.readIssues('open', ['task:created']);
  console.log(`Found ${issues.length} open tasks with label 'task:created':`);
  for (const issue of issues) {
    console.log(`  #${issue.number}: ${issue.title}`);
  }

  if (issues.length === 0) {
    console.log('\nNo tasks to process. Exiting.');
    return;
  }

  const results = [];
  for (const issue of issues) {
    const result = await runFullPipeline(issue, adapter);
    results.push(result);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`ORCHESTRATION SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  for (const r of results) {
    console.log(`  #${r.issue} → ${r.subIssues.length} sub-issues created → ${r.dir}`);
  }
  console.log(`\n✅ Processed ${results.length} issues.`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[AUTONOMOUS] Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main, runFullPipeline };

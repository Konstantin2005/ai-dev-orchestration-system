const fs = require("fs/promises");
const path = require("path");

export class ContextManager {
  constructor(workspace) {
    this.workspace = workspace;
    this.contextPath = path.join(workspace, 'shared', 'context.md');
  }

  async init(issue) {
    const content = `# Context: ${issue.title}

## Issue
- **ID:** ${issue.id}
- **Title:** ${issue.title}
- **Description:** ${issue.body || 'N/A'}

## Status
- [ ] Architect
- [ ] Backend
- [ ] Frontend
- [ ] QA
- [ ] Code Review

## Decisions
- None yet
`;

    const sharedDir = path.dirname(this.contextPath);
    await fs.mkdir(sharedDir, { recursive: true });
    await fs.writeFile(this.contextPath, content, 'utf-8');
  }

  async updateStatus(role, done = true) {
    const content = await fs.readFile(this.contextPath, 'utf-8');
    const updated = content.replace(
      new RegExp(`- \\[ \\] ${role}`, 'i'),
      `- [${done ? 'x' : ' '}] ${role}`
    );
    await fs.writeFile(this.contextPath, updated, 'utf-8');
  }

  async appendDecision(decision) {
    const line = `\n- ${new Date().toISOString()} — ${decision}`;
    await fs.appendFile(this.contextPath, line, 'utf-8');
  }
}

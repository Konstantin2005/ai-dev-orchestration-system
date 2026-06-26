const { Agent  } = require("../agent");
const fs = require("fs/promises");
const path = require("path");

module.exports = class ReviewerAgent extends Agent {
  constructor() {
    super('reviewer', 'Code Reviewer');
  }

  async execute(context) {
    const { workspace, memory } = context;
    const issue = memory.get('issue') || {};
    const reviewDir = path.join(workspace, '04-code-reviewer');

    await fs.mkdir(reviewDir, { recursive: true });

    const vars = {
      id: issue.id || 'N/A',
      title: issue.title || 'Untitled',
      reviewer: 'ai-agent',
      security_issues: [],
      architecture_issues: [],
      quality_issues: [],
    };

    const content = await this.renderTemplate('review', vars);
    await fs.writeFile(path.join(reviewDir, 'review.md'), content, 'utf-8');

    await memory.set('reviewer.done', true);
    this.log(context, 'Review artifacts created from templates');

    return { role: 'reviewer', status: 'done', path: reviewDir };
  }
}

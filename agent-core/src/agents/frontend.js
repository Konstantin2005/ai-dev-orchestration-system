import { Agent } from '../core/agent.js';
import fs from 'fs/promises';
import path from 'path';

export default class FrontendAgent extends Agent {
  constructor() {
    super('frontend', 'Frontend Engineer');
  }

  async execute(context) {
    const { workspace, memory } = context;
    const issue = memory.get('issue') || {};
    const frontendDir = path.join(workspace, '02-frontend-engineer');

    await fs.mkdir(frontendDir, { recursive: true });

    const vars = {
      id: issue.id || 'N/A',
      title: issue.title || 'Untitled',
      components: ['App', 'ResourceList', 'ResourceDetail'],
    };

    const content = await this.renderTemplate('frontend-ui', vars);
    await fs.writeFile(path.join(frontendDir, 'ui.md'), content, 'utf-8');

    await memory.set('frontend.done', true);
    this.log(context, 'Frontend artifacts created from templates');

    return { role: 'frontend', status: 'done', path: frontendDir };
  }
}

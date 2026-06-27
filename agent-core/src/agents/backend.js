import { Agent } from '../core/agent.js';
import fs from 'fs/promises';
import path from 'path';

export default class BackendAgent extends Agent {
  constructor() {
    super('backend', 'Backend Engineer');
  }

  async execute(context) {
    const { workspace, memory } = context;
    const issue = memory.get('issue') || {};
    const backendDir = path.join(workspace, '01-backend-engineer');

    await fs.mkdir(backendDir, { recursive: true });

    const vars = {
      id: issue.id || 'N/A',
      title: issue.title || 'Untitled',
      endpoints: [
        { method: 'GET', path: '/api/resource', description: 'List resources', request: '-', response: 'Resource[]' },
      ],
    };

    const content = await this.renderTemplate('backend-api', vars);
    await fs.writeFile(path.join(backendDir, 'api.md'), content, 'utf-8');

    await memory.set('backend.done', true);
    this.log(context, 'Backend artifacts created from templates');

    return { role: 'backend', status: 'done', path: backendDir };
  }
}

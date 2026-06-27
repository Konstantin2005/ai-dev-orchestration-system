import { Agent } from '../core/agent.js';
import fs from 'fs/promises';
import path from 'path';

export default class ArchitectAgent extends Agent {
  constructor() {
    super('architect', 'Architect');
  }

  async execute(context) {
    const { workspace, memory } = context;
    const issue = memory.get('issue') || {};
    const archDir = path.join(workspace, '00-architect');

    await fs.mkdir(archDir, { recursive: true });

    const vars = {
      id: issue.id || 'N/A',
      title: issue.title || 'Untitled',
      slug: memory.get('slug') || 'unknown',
      decision: 'TBD after analysis',
      rationale: 'TBD',
    };

    const plan = await this.renderTemplate('plan', vars);
    const architecture = await this.renderTemplate('architecture', { ...vars, flow: 'TBD', selected: 'TBD', alternative1: 'None', alternative2: 'None' });
    const decisions = await this.renderTemplate('decisions', vars);

    await fs.writeFile(path.join(archDir, 'plan.md'), plan, 'utf-8');
    await fs.writeFile(path.join(archDir, 'architecture.md'), architecture, 'utf-8');
    await fs.writeFile(path.join(archDir, 'decisions.md'), decisions, 'utf-8');

    await memory.set('architect.done', true);
    this.log(context, 'Architecture artifacts created from templates');

    return { role: 'architect', status: 'done', path: archDir };
  }
}

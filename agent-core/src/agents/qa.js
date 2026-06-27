import { Agent } from '../core/agent.js';
import fs from 'fs/promises';
import path from 'path';

export default class QAAgent extends Agent {
  constructor() {
    super('qa', 'QA Engineer');
  }

  async execute(context) {
    const { workspace, memory } = context;
    const issue = memory.get('issue') || {};
    const qaDir = path.join(workspace, '03-qa-engineer');

    await fs.mkdir(qaDir, { recursive: true });

    const vars = {
      id: issue.id || 'N/A',
      title: issue.title || 'Untitled',
      test_cases: [
        { id: 1, name: 'Basic flow', input: 'Valid input', expected: 'Success', actual: 'TBD' },
      ],
    };

    const content = await this.renderTemplate('qa-tests', vars);
    await fs.writeFile(path.join(qaDir, 'test-cases.md'), content, 'utf-8');

    await memory.set('qa.done', true);
    this.log(context, 'QA artifacts created from templates');

    return { role: 'qa', status: 'done', path: qaDir };
  }
}

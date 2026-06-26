const { AgentAdapter } = require('../interface');

class SweepAIAdapter extends AgentAdapter {
  constructor(config = {}) {
    super(config);
  }

  async init() {
    if (this._initialized) return;
    console.error('[SWEEP-ADAPTER] Initializing Sweep AI pattern adapter...');
    this._initialized = true;
    console.error('[SWEEP-ADAPTER] Sweep AI adapter initialized');
  }

  async execute(task, context = {}) {
    if (!this._initialized) await this.init();
    console.error(`[SWEEP-ADAPTER] Executing task with Sweep pattern: ${task.title || 'untitled'}`);

    const plan = await this._createPlan(task);
    const codeChanges = await this._generateCode(plan, context);
    const prDescription = this._createPRDescription(task, codeChanges);

    return {
      status: 'COMPLETED',
      files: codeChanges,
      logs: {
        sweep: JSON.stringify({ plan, prDescription }, null, 2)
      }
    };
  }

  async _createPlan(task) {
    const { execSync } = require('child_process');
    const planPrompt = `Analyze this GitHub Issue and create a step-by-step plan:\n\nTitle: ${task.title}\nBody: ${task.body || ''}`;

    try {
      const output = execSync(
        `echo ${JSON.stringify(planPrompt)}`,
        { encoding: 'utf-8', timeout: 5000 }
      );

      return {
        summary: `Plan for: ${task.title}`,
        steps: [
          '1. Analyze requirements',
          '2. Identify files to change',
          '3. Implement changes',
          '4. Create PR'
        ]
      };
    } catch {
      return {
        summary: `Plan for: ${task.title}`,
        steps: ['1. Analyze → 2. Code → 3. PR'],
        error: 'Plan generation failed, using default'
      };
    }
  }

  async _generateCode(plan, context) {
    return [{
      path: 'sweep-changes.md',
      content: `# Sweep AI Changes\n\n## Plan\n${plan.summary}\n\n## Files Changed\n- Implementation based on Issue\n`,
      description: 'Sweep AI generated changes'
    }];
  }

  _createPRDescription(task, files) {
    return `## Description\n\nFixes: ${task.title}\n\n## Changes\n- ${files.map(f => f.path).join('\n- ')}\n\n## Checklist\n- [ ] Code reviewed\n- [ ] Tests pass\n- [ ] Documentation updated`;
  }

  getMetadata() {
    return {
      id: 'sweep',
      name: 'Sweep AI Agent',
      type: 'hybrid',
      capabilities: ['code', 'plan', 'pr', 'research'],
      framework: 'sweep-pattern',
      language: 'python',
      version: '1.0.0'
    };
  }
}

module.exports = { SweepAIAdapter };

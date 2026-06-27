class UnifiedAgent {
  constructor(name, role) {
    this.name = name;
    this.role = role;
  }

  async execute(context, issue) {
    const artifacts = await this.generate(context, issue);

    return {
      files: artifacts.map(a => ({
        path: a.path,
        content: a.content,
      })),
      execution_scope: {
        target_repo: context.targetRepo || 'unknown',
        issue_id: issue.id,
        agent: this.name,
      },
    };
  }

  async generate(context, issue) {
    throw new Error(`${this.role} must implement generate()`);
  }
}

module.exports = { UnifiedAgent };

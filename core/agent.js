export class Agent {
  constructor(name, role) {
    this.name = name;
    this.role = role;
    this.templateRegistry = null;
  }

  setTemplateRegistry(registry) {
    this.templateRegistry = registry;
  }

  async renderTemplate(name, variables = {}) {
    if (!this.templateRegistry) {
      throw new Error('TemplateRegistry not set. Call setTemplateRegistry() first.');
    }
    return this.templateRegistry.render(name, variables);
  }

  async execute(context) {
    throw new Error(`${this.role} agent must implement execute()`);
  }

  log(context, message) {
    const logger = context.logger;
    if (logger) {
      logger.info(`[${this.role}] ${message}`);
    }
  }
}

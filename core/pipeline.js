const { TemplateRegistry  } = require("./template-engine/registry");

export class Pipeline {
  constructor(stages = []) {
    this.stages = stages.length > 0 ? stages : this.#defaultStages();
    this.templateRegistry = new TemplateRegistry();
  }

  async init() {
    await this.templateRegistry.init();
  }

  #defaultStages() {
    return [
      { name: 'architect', parallel: false },
      { name: 'backend', parallel: true },
      { name: 'frontend', parallel: true },
      { name: 'qa', parallel: false },
      { name: 'reviewer', parallel: false },
    ];
  }

  async execute(workspace, memory) {
    await this.init();
    const results = [];

    for (const stage of this.stages) {
      if (stage.parallel) {
        const parallelResults = await Promise.all(
          this.#getParallelStages(stage.name).map(s => this.#runStage(s, workspace, memory))
        );
        results.push(...parallelResults);
      } else {
        const result = await this.#runStage(stage, workspace, memory);
        results.push(result);
      }
    }

    return results;
  }

  #getParallelStages(name) {
    return this.stages.filter(s => s.name === name);
  }

  async #runStage(stage, workspace, memory) {
    const { default: AgentClass } = await import(`../agents/${stage.name}.js`);
    const agent = new AgentClass();
    agent.setTemplateRegistry(this.templateRegistry);
    return agent.execute({ workspace, memory });
  }
}

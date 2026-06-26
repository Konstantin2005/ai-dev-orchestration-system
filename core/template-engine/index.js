const { TemplateRegistry  } = require("./registry");

const registry = new TemplateRegistry();

export async function initTemplates() {
  await registry.init();
  return registry;
}

export function getRegistry() {
  return registry;
}

export async function render(name, variables = {}) {
  return registry.render(name, variables);
}

export { TemplateEngine } from './engine.js';
export { TemplateLoader } from './loader.js';
export { TemplateRegistry } from './registry.js';

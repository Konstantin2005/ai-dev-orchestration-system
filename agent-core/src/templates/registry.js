import { TemplateEngine } from './engine.js';
import { TemplateLoader } from './loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'templates');

export class TemplateRegistry {
  constructor(templatesDir = DEFAULT_TEMPLATES_DIR) {
    this.engine = new TemplateEngine();
    this.loader = new TemplateLoader(templatesDir);
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    const templates = await this.loader.loadAll();
    this.initialized = true;
  }

  async render(name, variables = {}) {
    const template = await this.loader.load(name);
    return this.engine.render(template, variables);
  }

  getEngine() {
    return this.engine;
  }

  getLoader() {
    return this.loader;
  }
}

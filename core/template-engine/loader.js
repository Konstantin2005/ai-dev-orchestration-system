const fs = require("fs/promises");
const path = require("path");

export class TemplateLoader {
  constructor(templatesDir) {
    this.templatesDir = templatesDir;
    this.cache = new Map();
  }

  async load(name) {
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    const filePath = path.join(this.templatesDir, `${name}.md`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.cache.set(name, content);
      return content;
    } catch {
      throw new Error(`Template not found: ${name} (${filePath})`);
    }
  }

  async loadAll() {
    const files = await fs.readdir(this.templatesDir);
    const templates = {};

    for (const file of files) {
      if (file.endsWith('.md')) {
        const name = path.basename(file, '.md');
        templates[name] = await this.load(name);
      }
    }

    return templates;
  }

  async exists(name) {
    const filePath = path.join(this.templatesDir, `${name}.md`);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export class TemplateEngine {
  constructor() {
    this.cache = new Map();
  }

  render(template, variables = {}) {
    let result = template;

    const eachPattern = /\{% each (\S+) as (\S+) %\}([\s\S]*?)\{% endeach %\}/g;
    result = result.replace(eachPattern, (match, arrayKey, itemVar, tmpl) => {
      const array = this.#resolveNestedKey(variables, arrayKey);
      if (!Array.isArray(array)) return '';
      const itemRegex = new RegExp(`\\[${itemVar}\\.([^\\]]+)\\]`, 'g');
      return array.map(item => {
        if (typeof item === 'object') {
          return tmpl.replace(itemRegex, (m, prop) => {
            return String(item[prop] ?? m);
          });
        }
        return tmpl.replace(new RegExp(`\\[${itemVar}\\]`, 'g'), String(item));
      }).join('\n');
    });

    const condPattern = /\{% if (\S+) %\}([\s\S]*?)\{% endif %\}/g;
    result = result.replace(condPattern, (match, key, content) => {
      const value = this.#resolveNestedKey(variables, key);
      return value ? content : '';
    });

    const varPattern = /\[([a-zA-Z_][a-zA-Z0-9_.]*)\]/g;
    result = result.replace(varPattern, (match, key) => {
      const value = this.#resolveNestedKey(variables, key);
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  #resolveNestedKey(obj, key) {
    const keys = key.split('.');
    let value = obj;
    for (const k of keys) {
      if (value == null || typeof value !== 'object') return undefined;
      value = value[k];
    }
    return value;
  }

  clearCache() {
    this.cache.clear();
  }
}

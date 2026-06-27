const ALLOWED_EXTENSIONS = ['.js', '.ts', '.md', '.json', '.jsonc', '.yml', '.yaml', '.css', '.html'];
const BLOCKED_PATTERNS = [/\.env/, /secret/i, /token/i, /password/i, /key\./i];
const MAX_FILE_SIZE = 1024 * 1024;

class ZeroTrustValidator {
  constructor(options = {}) {
    this.allowedExtensions = options.allowedExtensions || ALLOWED_EXTENSIONS;
    this.blockedPatterns = options.blockedPatterns || BLOCKED_PATTERNS;
    this.maxFileSize = options.maxFileSize || MAX_FILE_SIZE;
    this.allowedPaths = options.allowedPaths || null;
  }

  validate(file, targetRepo) {
    const errors = [];

    const ext = this.#getExtension(file.path);
    if (!this.allowedExtensions.includes(ext)) {
      errors.push(`Extension not allowed: ${ext}`);
    }

    if (file.content && file.content.length > this.maxFileSize) {
      errors.push(`File too large: ${file.content.length} bytes`);
    }

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(file.path)) {
        errors.push(`Path blocked by pattern: ${pattern}`);
      }
      if (file.content && pattern.test(file.content)) {
        errors.push(`Content blocked by pattern: ${pattern}`);
      }
    }

    if (this.allowedPaths) {
      const allowed = this.allowedPaths.some(p => file.path.startsWith(p));
      if (!allowed) errors.push(`Path not in allowed paths: ${file.path}`);
    }

    return { valid: errors.length === 0, errors, reason: errors.join('; ') };
  }

  #getExtension(filePath) {
    const idx = filePath.lastIndexOf('.');
    return idx >= 0 ? filePath.slice(idx) : '';
  }
}

module.exports = { ZeroTrustValidator };

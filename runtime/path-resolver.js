/**
 * path-resolver.js
 *
 * Maps role-prefixed AI-generated file paths to the correct location in the
 * parent project or the .ai-system/workspace directory.
 *
 * Security rules:
 *   - 00-architect/*  → .ai-system/workspace/00-architect/
 *   - 04-code-reviewer/* → .ai-system/workspace/04-code-reviewer/
 *   - 01-backend-engineer/*  → PROJECT_ROOT/<config.backend>
 *   - 02-frontend-engineer/* → PROJECT_ROOT/<config.frontend>
 *   - 03-qa-engineer/*       → PROJECT_ROOT/<config.qa>
 *   - All other paths are rejected.
 *   - Path traversal (..) is strictly blocked.
 *   - No writes to .ai-system/ except architect and reviewer.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ─── Role prefix constants ──────────────────────────────────────────────────
const ROLE_PREFIXES = {
    '00-architect':        { type: 'internal' },
    '04-code-reviewer':    { type: 'internal' },
    '01-backend-engineer': { type: 'external' },
    '02-frontend-engineer':{ type: 'external' },
    '03-qa-engineer':      { type: 'external' },
};

const INTERNAL_ROOTS = {
    '00-architect':     '00-architect',
    '04-code-reviewer': '04-code-reviewer',
};

// ─── Default output roots (overridable via .ai-config.json) ─────────────────
const DEFAULT_ROOTS = {
    '01-backend-engineer': '',
    '02-frontend-engineer': '',
    '03-qa-engineer':       'tests',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Read .ai-config.json from the project root and return parsed config.
 * Returns an empty object on any read/parse error.
 */
function readConfig(projectRoot) {
    try {
        const configPath = path.resolve(projectRoot, '.ai-config.json');
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch {
        // silently ignore — config is optional
    }
    return {};
}

/**
 * Check whether the given AI path is safe: no path-traversal components,
 * and it starts with a recognised role prefix.
 *
 * @param {string} aiPath  – path like "01-backend-engineer/api.js"
 * @returns {{ valid: boolean, role: string|null, relativePath: string|null }}
 */
function parseAiPath(aiPath) {
    // Normalise separators and collapse dots
    const normalised = path.normalize(aiPath).replace(/\\/g, '/');

    // Block path traversal
    const parts = normalised.split('/');
    for (const part of parts) {
        if (part === '..' || part === '.') {
            return { valid: false, role: null, relativePath: null };
        }
    }

    // Must have at least a role prefix segment
    const first = parts[0];
    if (first in ROLE_PREFIXES) {
        const relativePath = parts.slice(1).join('/');
        return { valid: true, role: first, relativePath };
    }

    return { valid: false, role: null, relativePath: null };
}

/**
 * Resolve a single AI-generated path to an absolute filesystem path.
 *
 * @param {string} aiPath       – e.g. "01-backend-engineer/src/api.js"
 * @param {string} projectRoot  – absolute path to the parent project root
 * @param {object} [config]     – optional config (overrides defaults)
 * @returns {{ resolved: string|null, error: string|null }}
 */
function resolvePath(aiPath, projectRoot, config) {
    if (!aiPath || typeof aiPath !== 'string') {
        return { resolved: null, error: 'aiPath must be a non-empty string' };
    }
    if (!projectRoot || typeof projectRoot !== 'string') {
        return { resolved: null, error: 'projectRoot must be a non-empty string' };
    }

    const parsed = parseAiPath(aiPath);
    if (!parsed.valid) {
        return { resolved: null, error: `Invalid or unsafe AI path: "${aiPath}"` };
    }

    const { role, relativePath } = parsed;
    const cfg = config || readConfig(projectRoot);
    const outputConfig = cfg.output || {};
    const projectRootResolved = path.resolve(projectRoot);

    // ── Internal paths (architect, reviewer) → .ai-system/workspace/ ────────
    if (ROLE_PREFIXES[role].type === 'internal') {
        const subDir = INTERNAL_ROOTS[role] || role;
        // The .ai-system directory is one level above engine/
        const aiSystemDir = path.resolve(__dirname, '..');
        const workspaceDir = path.join(aiSystemDir, 'workspace');
        const resolved = path.join(workspaceDir, subDir, relativePath || '');

        // Security: ensure resolved path is still inside workspace
        const resolvedReal = path.resolve(resolved);
        const workspaceReal = path.resolve(workspaceDir);
        if (!resolvedReal.startsWith(workspaceReal)) {
            return { resolved: null, error: `Path traversal blocked for internal path: "${aiPath}"` };
        }

        return { resolved: resolvedReal, error: null };
    }

    // ── External paths (backend, frontend, qa) → PROJECT_ROOT + config root ─
    const configuredRoot = outputConfig[role.replace(/^\d+-/, '')] ||
                            outputConfig[role] ||
                            DEFAULT_ROOTS[role] ||
                            '';

    const baseDir = path.join(projectRootResolved, configuredRoot);
    const resolved = path.join(baseDir, relativePath || '');

    // Security: ensure resolved path stays within projectRoot or its children
    const resolvedReal = path.resolve(resolved);
    const projectRootReal = path.resolve(projectRootResolved);
    if (!resolvedReal.startsWith(projectRootReal + path.sep) &&
        resolvedReal !== projectRootReal) {
        return { resolved: null, error: `Path traversal blocked for external path: "${aiPath}" resolves outside project root` };
    }

    // Security: block writes into .ai-system/ for external paths
    // Only enforce when projectRoot is different (submodule mode).
    const aiSystemDir = path.resolve(__dirname, '..');
    const aiSystemReal = path.resolve(aiSystemDir);
    if (projectRootReal !== aiSystemReal &&
        (resolvedReal.startsWith(aiSystemReal + path.sep) ||
         resolvedReal === aiSystemReal)) {
        return { resolved: null, error: `Blocked: external role "${role}" may not write into .ai-system/` };
    }

    return { resolved: resolvedReal, error: null };
}

/**
 * Resolve multiple AI-generated file paths in a single call.
 *
 * @param {string[]} files       – array of AI paths
 * @param {string}   projectRoot – absolute path to the parent project root
 * @param {object}   [config]    – optional config
 * @returns {{ resolved: Array<{ aiPath: string, resolved: string|null, error: string|null }> }}
 */
function resolveFiles(files, projectRoot, config) {
    if (!Array.isArray(files)) {
        throw new TypeError('files must be an array');
    }

    const cfg = config || readConfig(projectRoot);
    return files.map((aiPath) => {
        const result = resolvePath(aiPath, projectRoot, cfg);
        return {
            aiPath,
            resolved: result.resolved,
            error: result.error,
        };
    });
}

// ─── Exports ────────────────────────────────────────────────────────────────
module.exports = {
    resolvePath,
    resolveFiles,
    // Exposed for testing
    _parseAiPath: parseAiPath,
    _readConfig: readConfig,
};

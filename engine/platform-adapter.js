/**
 * platform-adapter.js
 *
 * Detects the parent project's platform (Node.js, Python, Rust, etc.),
 * reads `.ai-config.json` if present, and provides a structured execution
 * context for the AI orchestrator.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Detection signatures ───────────────────────────────────────────────────

const LANGUAGE_SIGNATURES = [
    { name: 'nodejs',     files: ['package.json'] },
    { name: 'python',     files: ['requirements.txt', 'setup.py', 'setup.cfg', 'pyproject.toml'] },
    { name: 'rust',       files: ['Cargo.toml'] },
    { name: 'go',         files: ['go.mod'] },
    { name: 'ruby',       files: ['Gemfile'] },
    { name: 'php',        files: ['composer.json'] },
    { name: 'java',       files: ['pom.xml', 'build.gradle', 'build.gradle.kts'] },
    { name: 'cpp',        files: ['CMakeLists.txt', 'Makefile'] },
    { name: 'dotnet',     files: ['*.csproj', '*.sln'] },
];

const TEST_SIGNATURES = {
    nodejs: [
        { name: 'jest',        check: (root) => fileContains(root, 'package.json', '"jest"') },
        { name: 'mocha',       check: (root) => fileContains(root, 'package.json', '"mocha"') },
        { name: 'vitest',      check: (root) => fileContains(root, 'package.json', '"vitest"') },
        { name: 'node:test',   check: (root) =>
            fileContains(root, 'package.json', '"node --test"') ||
            fileContains(root, 'package.json', '"node:test"') },
    ],
    python: [
        { name: 'pytest',      check: (root) =>
            fileContains(root, 'pytest.ini', '') ||
            fileContains(root, 'pyproject.toml', 'pytest') },
        { name: 'unittest',    check: () => true }, // fallback
    ],
    rust: [
        { name: 'cargo-test',  check: () => true },
    ],
    go: [
        { name: 'go-test',     check: () => true },
    ],
    ruby: [
        { name: 'rspec',       check: (root) =>
            fileContains(root, 'Gemfile', 'rspec') ||
            fs.existsSync(path.join(root, '.rspec')) },
        { name: 'minitest',    check: () => true },
    ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check whether a file exists and (optionally) contains a given substring.
 */
function fileContains(root, fileName, search) {
    const filePath = path.join(root, fileName);
    if (!fs.existsSync(filePath)) return false;
    if (!search) return true;
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.includes(search);
    } catch {
        return false;
    }
}

/**
 * Check whether a glob-like pattern matches any file in root.
 * Supports simple '*' wildcard at the start of a filename.
 */
function globExists(root, pattern) {
    if (!pattern.includes('*')) {
        return fs.existsSync(path.join(root, pattern));
    }
    const prefix = pattern.replace(/^\*/, '');
    try {
        const entries = fs.readdirSync(root);
        return entries.some((e) => e.endsWith(prefix));
    } catch {
        return false;
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Detect the project language by scanning for known files.
 *
 * @param {string} projectRoot  – absolute path to the project root
 * @returns {string}             – language identifier ("nodejs", "python", etc.)
 */
function detectProjectType(projectRoot) {
    if (!projectRoot || typeof projectRoot !== 'string') {
        return 'unknown';
    }

    const root = path.resolve(projectRoot);
    if (!fs.existsSync(root)) {
        return 'unknown';
    }

    for (const sig of LANGUAGE_SIGNATURES) {
        for (const file of sig.files) {
            if (file.includes('*')) {
                if (globExists(root, file)) {
                    return sig.name;
                }
            } else {
                if (fs.existsSync(path.join(root, file))) {
                    return sig.name;
                }
            }
        }
    }

    return 'unknown';
}

/**
 * Read the optional `.ai-config.json` from the project root.
 *
 * @param {string} projectRoot
 * @returns {object} parsed config object (empty object if absent / invalid)
 */
function readProjectConfig(projectRoot) {
    if (!projectRoot || typeof projectRoot !== 'string') {
        return {};
    }

    try {
        const configPath = path.resolve(projectRoot, '.ai-config.json');
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch {
        // Config is optional — silently return empty
    }

    return {};
}

/**
 * Detect the test framework in use.
 *
 * @param {string} projectRoot
 * @param {string} language     – result of detectProjectType()
 * @returns {string} framework name
 */
function detectTestFramework(projectRoot, language) {
    const signatures = TEST_SIGNATURES[language];
    if (!signatures) return 'unknown';

    for (const sig of signatures) {
        if (sig.check(path.resolve(projectRoot))) {
            return sig.name;
        }
    }

    return 'unknown';
}

/**
 * Build a full execution context object for the AI orchestrator.
 *
 * @param {string} projectRoot  – absolute path to the parent project root
 * @returns {object} structured context
 */
function getExecutionContext(projectRoot) {
    const root = projectRoot ? path.resolve(projectRoot) : null;
    const config = readProjectConfig(root);
    let language = config.language;
    if (!language || language === 'auto') {
        language = detectProjectType(root);
    }

    let testFramework = config.testFramework;
    if (!testFramework || testFramework === 'auto') {
        testFramework = detectTestFramework(root, language);
    }

    return {
        projectRoot: root,
        language,
        testFramework,
        config,
        isGitRepo: root ? fs.existsSync(path.join(root, '.git')) : false,
        detectedAt: new Date().toISOString(),
    };
}

// ─── Exports ────────────────────────────────────────────────────────────────
module.exports = {
    detectProjectType,
    readProjectConfig,
    detectTestFramework,
    getExecutionContext,
};

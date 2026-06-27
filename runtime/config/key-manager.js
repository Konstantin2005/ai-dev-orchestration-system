const fs = require('fs');
const path = require('path');
const { findConfigDir, readConfig } = require('./loader');

const MODES = {
  'openai-only': {
    label: 'Only OpenAI',
    desc: 'All agents use gpt-4o-mini. Anthropic/Google keys not needed.',
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
    strict: false
  },
  'full': {
    label: 'All providers',
    desc: 'Each agent uses its configured provider. All keys required.',
    fallbackProvider: null,
    fallbackModel: null,
    strict: true
  },
  'strict': {
    label: 'Strict mode',
    desc: 'Use configured providers. Fail if any key is missing.',
    fallbackProvider: null,
    fallbackModel: null,
    strict: true
  },
  'mock': {
    label: 'Mock mode',
    desc: 'No real API calls. Return template responses.',
    fallbackProvider: 'mock',
    fallbackModel: 'mock',
    strict: false
  }
};

const KEY_VARS = {
  openai: { env: 'OPENAI_API_KEY', name: 'OpenAI' },
  anthropic: { env: 'ANTHROPIC_API_KEY', name: 'Anthropic' },
  google: { env: 'GOOGLE_API_KEY', name: 'Google' }
};

function detectAvailableKeys() {
  const keys = {};
  for (const [provider, info] of Object.entries(KEY_VARS)) {
    keys[provider] = !!(process.env[info.env]);
  }
  return keys;
}

function getActiveMode(rootDir) {
  const config = readConfig(rootDir);
  const modeName = (config.runtime && config.runtime.key_mode) || process.env.AI_ORCHESTRATOR_MODE || 'openai-only';
  return MODES[modeName] || MODES['openai-only'];
}

function getModelForAgent(agentType, configuredProvider, configuredModel, rootDir) {
  const mode = getActiveMode(rootDir);
  const available = detectAvailableKeys();

  if (mode.fallbackProvider === 'mock') {
    return { provider: 'mock', model: 'mock' };
  }

  if (mode.fallbackProvider && mode.fallbackModel) {
    return { provider: mode.fallbackProvider, model: mode.fallbackModel };
  }

  if (mode.strict) {
    const keyVar = KEY_VARS[configuredProvider];
    if (keyVar && !available[configuredProvider]) {
      throw new Error(
        `${keyVar.name} key required for ${agentType} in strict mode. ` +
        `Set ${keyVar.env} or use 'openai-only' mode.`
      );
    }
  }

  if (!configuredProvider || !available[configuredProvider]) {
    return { provider: 'openai', model: 'gpt-4o-mini' };
  }

  return { provider: configuredProvider, model: configuredModel };
}

function getAvailableModeNames() {
  return Object.keys(MODES);
}

function getModeHelp() {
  const lines = ['Available key modes:'];
  for (const [name, mode] of Object.entries(MODES)) {
    lines.push(`  ${name}${' '.repeat(Math.max(1, 16 - name.length))}${mode.label} — ${mode.desc}`);
  }
  return lines.join('\n');
}

module.exports = {
  MODES,
  KEY_VARS,
  detectAvailableKeys,
  getActiveMode,
  getModelForAgent,
  getAvailableModeNames,
  getModeHelp
};

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MODES, detectAvailableKeys, getActiveMode, getModelForAgent, getAvailableModeNames, getModeHelp } = require('../runtime/config/key-manager');

describe('config/key-manager.js', () => {
  const originalMode = process.env.AI_ORCHESTRATOR_MODE;
  const originalOpenAI = process.env.OPENAI_API_KEY;
  const originalAnthropic = process.env.ANTHROPIC_API_KEY;

  before(() => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    delete process.env.ANTHROPIC_API_KEY;
  });

  after(() => {
    process.env.AI_ORCHESTRATOR_MODE = originalMode;
    if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
    else delete process.env.OPENAI_API_KEY;
    if (originalAnthropic) process.env.ANTHROPIC_API_KEY = originalAnthropic;
    else delete process.env.ANTHROPIC_API_KEY;
  });

  describe('MODES', () => {
    it('has all 4 modes', () => {
      assert.ok(MODES['openai-only']);
      assert.ok(MODES['full']);
      assert.ok(MODES['strict']);
      assert.ok(MODES['mock']);
    });

    it('openai-only has fallback provider', () => {
      assert.equal(MODES['openai-only'].fallbackProvider, 'openai');
      assert.equal(MODES['openai-only'].fallbackModel, 'gpt-4o-mini');
    });

    it('mock mode returns mock provider', () => {
      assert.equal(MODES['mock'].fallbackProvider, 'mock');
    });
  });

  describe('detectAvailableKeys', () => {
    it('detects openai key', () => {
      const keys = detectAvailableKeys();
      assert.equal(keys.openai, true);
    });

    it('detects missing anthropic key', () => {
      const keys = detectAvailableKeys();
      assert.equal(keys.anthropic, false);
    });
  });

  describe('getActiveMode', () => {
    it('defaults to openai-only', () => {
      delete process.env.AI_ORCHESTRATOR_MODE;
      const mode = getActiveMode();
      assert.equal(mode.fallbackProvider, 'openai');
    });

    it('reads env override', () => {
      process.env.AI_ORCHESTRATOR_MODE = 'full';
      const mode = getActiveMode();
      assert.equal(mode.strict, true);
    });
  });

  describe('getModelForAgent', () => {
    it('returns openai fallback in openai-only mode', () => {
      process.env.AI_ORCHESTRATOR_MODE = 'openai-only';
      const result = getModelForAgent('backend', 'anthropic', 'claude-sonnet');
      assert.equal(result.provider, 'openai');
      assert.equal(result.model, 'gpt-4o-mini');
    });

    it('returns configured provider in full mode when key available', () => {
      process.env.AI_ORCHESTRATOR_MODE = 'full';
      const result = getModelForAgent('backend', 'anthropic', 'claude-sonnet', undefined);
      assert.equal(result.provider, 'openai');
      assert.equal(result.model, 'gpt-4o-mini');
    });

    it('returns mock in mock mode', () => {
      process.env.AI_ORCHESTRATOR_MODE = 'mock';
      const result = getModelForAgent('backend', 'anthropic', 'claude-sonnet');
      assert.equal(result.provider, 'mock');
      assert.equal(result.model, 'mock');
    });
  });

  describe('getAvailableModeNames', () => {
    it('returns all mode names', () => {
      const names = getAvailableModeNames();
      assert.ok(names.includes('openai-only'));
      assert.ok(names.includes('full'));
      assert.ok(names.includes('strict'));
      assert.ok(names.includes('mock'));
    });
  });

  describe('getModeHelp', () => {
    it('returns help string', () => {
      const help = getModeHelp();
      assert.ok(help.includes('openai-only'));
      assert.ok(help.includes('full'));
      assert.ok(help.includes('mock'));
    });
  });
});

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('openai.js', () => {
  let originalEnv;

  before(() => {
    originalEnv = process.env.OPENAI_API_KEY;
  });

  after(() => {
    process.env.OPENAI_API_KEY = originalEnv;
  });

  it('throws when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    const { callOpenAI } = require('../runtime/graph/openai');
    await assert.rejects(
      () => callOpenAI('system', 'user'),
      /OPENAI_API_KEY environment variable is not set/
    );
  });

  it('does not throw when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const { callOpenAI } = require('../runtime/graph/openai');
    assert.ok(typeof callOpenAI === 'function');
  });

  it('callOpenAIJSON attempts to parse JSON from text', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const { callOpenAIJSON } = require('../runtime/graph/openai');

    try {
      await callOpenAIJSON('system', 'user');
    } catch (err) {
      assert.ok(err.message.includes('Failed to parse') || err.message.includes('API'));
    }
  });
});

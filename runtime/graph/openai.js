const { ChatOpenAI } = require('@langchain/openai');

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenAI(systemPrompt, userInput, options = {}) {
  const {
    temperature = 0.3,
    maxTokens = 4000,
    model = 'gpt-4o-mini'
  } = options;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        temperature,
        maxTokens
      });

      const response = await llm.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ]);

      const text = response.content;

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from OpenAI');
      }

      return text;

    } catch (err) {
      lastError = err;
      console.error(`[OPENAI] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        console.error(`[OPENAI] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`OpenAI call failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

async function callOpenAIJSON(systemPrompt, userInput, options = {}) {
  const text = await callOpenAI(systemPrompt, userInput, options);

  try {
    return JSON.parse(text);
  } catch (err) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse OpenAI response as JSON: ${err.message}`);
  }
}

module.exports = { callOpenAI, callOpenAIJSON };

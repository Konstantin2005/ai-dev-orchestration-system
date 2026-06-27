const fs = require('fs');
const path = require('path');
const { executeCommand } = require('../sandbox/executor');

const TIMEOUT = 15000;

const tools = {
  file_read: {
    name: 'file_read',
    description: 'Read a file from the workspace. Returns file content.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file (relative to workspace root)' }
      },
      required: ['filePath']
    },
    execute: (args, context) => {
      const fullPath = path.resolve(context.workspace || process.cwd(), args.filePath);
      if (!fullPath.startsWith(path.resolve(context.workspace || process.cwd()))) {
        return { success: false, error: 'Path traversal denied' };
      }
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `File not found: ${args.filePath}` };
      }
      const content = fs.readFileSync(fullPath, 'utf-8');
      return { success: true, data: content };
    }
  },

  file_write: {
    name: 'file_write',
    description: 'Write content to a file in the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file (relative to workspace root)' },
        content: { type: 'string', description: 'File content to write' }
      },
      required: ['filePath', 'content']
    },
    execute: (args, context) => {
      const fullPath = path.resolve(context.workspace || process.cwd(), args.filePath);
      if (!fullPath.startsWith(path.resolve(context.workspace || process.cwd()))) {
        return { success: false, error: 'Path traversal denied' };
      }
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, args.content, 'utf-8');
      return { success: true, data: `Written ${args.content.length} bytes to ${args.filePath}` };
    }
  },

  run_command: {
    name: 'run_command',
    description: 'Run a shell command in the workspace. Returns stdout and stderr.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        timeout: { type: 'number', description: 'Timeout in ms (default 15000)' }
      },
      required: ['command']
    },
    execute: (args, context) => {
      return executeCommand(args.command, {
        cwd: context.workspace || process.cwd(),
        timeout: args.timeout || TIMEOUT
      });
    }
  },

  run_tests: {
    name: 'run_tests',
    description: 'Run the project test suite. Returns test output.',
    inputSchema: {
      type: 'object',
      properties: {
        testCommand: { type: 'string', description: 'Test command (default: "node --test")' },
        timeout: { type: 'number', description: 'Timeout in ms (default 60000)' }
      },
      required: []
    },
    execute: (args, context) => {
      const cmd = args.testCommand || 'node --test';
      return executeCommand(cmd, {
        cwd: context.workspace || process.cwd(),
        timeout: args.timeout || 60000
      });
    }
  },

  search_codebase: {
    name: 'search_codebase',
    description: 'Search for a pattern in the codebase. Returns matching files and lines.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        include: { type: 'string', description: 'File pattern to include (e.g. "*.js")' }
      },
      required: ['pattern']
    },
    execute: (args, context) => {
      const grepCmd = args.include
        ? `rg --no-heading -n "${args.pattern}" --glob "${args.include}"`
        : `rg --no-heading -n "${args.pattern}"`;
      const result = executeCommand(grepCmd, {
        cwd: context.workspace || process.cwd(),
        timeout: TIMEOUT
      });
      if (!result.success) return { success: true, data: 'No matches found' };
      const lines = result.stdout.split('\n').filter(l => l.trim());
      return { success: true, data: lines.slice(0, 50) };
    }
  },

  fetch_repo_state: {
    name: 'fetch_repo_state',
    description: 'Get current repository state: branch, changes, files.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: (args, context) => {
      const branch = executeCommand('git rev-parse --abbrev-ref HEAD', { cwd: context.workspace || process.cwd(), timeout: 5000 });
      const status = executeCommand('git status --short', { cwd: context.workspace || process.cwd(), timeout: 5000 });
      const log = executeCommand('git log --oneline -5', { cwd: context.workspace || process.cwd(), timeout: 5000 });
      return {
        success: true,
        data: {
          branch: branch.success ? branch.stdout.trim() : 'unknown',
          changes: status.success ? status.stdout : '',
          recentCommits: log.success ? log.stdout : ''
        }
      };
    }
  }
};

function getTool(name) {
  return tools[name] || null;
}

function listTools() {
  return Object.keys(tools).map(name => ({
    name,
    description: tools[name].description,
    inputSchema: tools[name].inputSchema
  }));
}

function executeTool(name, args, context) {
  const tool = tools[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.execute(args, context);
}

const REACT_MAX_ITERATIONS = 10;

function buildToolPrompt(toolsMap) {
  const toolDescriptions = Object.values(toolsMap).map(t =>
    `## ${t.name}\n${t.description}\nInput Schema: ${JSON.stringify(t.inputSchema, null, 2)}`
  ).join('\n\n');

  return `You have access to the following tools:\n\n${toolDescriptions}\n\nWhen you need to use a tool, respond with:\nTHOUGHT: your reasoning\nACTION: tool_name\nARGS: {"key": "value"}\n\nWhen you have the final answer, respond with:\nTHOUGHT: my final reasoning\nFINAL: your answer`;
}

function parseThoughtAction(response) {
  if (typeof response !== 'string') {
    return { type: 'unknown', response: String(response) };
  }

  const actionMatch = response.match(/ACTION:\s*(\w+)/);
  const argsMatch = response.match(/ARGS:\s*(\{[\s\S]*?\})/);
  const finalMatch = response.match(/FINAL:\s*([\s\S]*)/);

  if (finalMatch) {
    return { type: 'final', answer: finalMatch[1].trim() };
  }

  if (actionMatch) {
    let args = {};
    if (argsMatch) {
      try { args = JSON.parse(argsMatch[1]); } catch (e) { args = {}; }
    }
    return { type: 'action', tool: actionMatch[1], args };
  }

  return { type: 'final', answer: response.trim() };
}

async function reactLoop(prompt, { toolsMap = tools, callLLM, context = {}, maxIterations = REACT_MAX_ITERATIONS }) {
  const systemPrompt = buildToolPrompt(toolsMap);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];
  const trace = [];

  for (let i = 0; i < maxIterations; i++) {
    const response = await callLLM(messages);
    trace.push({ iteration: i + 1, response });

    const parsed = parseThoughtAction(response);

    if (parsed.type === 'final') {
      return { success: true, answer: parsed.answer, iterations: i + 1, trace };
    }

    if (parsed.type === 'action') {
      try {
        const observation = executeTool(parsed.tool, parsed.args, context);
        messages.push({ role: 'assistant', content: response });
        messages.push({ role: 'tool', content: JSON.stringify(observation), name: parsed.tool });
        trace[trace.length - 1].observation = observation;
      } catch (err) {
        const errorObs = { success: false, error: `Tool execution error: ${err.message}` };
        messages.push({ role: 'assistant', content: response });
        messages.push({ role: 'tool', content: JSON.stringify(errorObs), name: parsed.tool });
        trace[trace.length - 1].observation = errorObs;
      }
      continue;
    }

    return { success: true, answer: response, iterations: i + 1, trace };
  }

  return { success: false, error: `ReAct loop exceeded max iterations (${maxIterations})`, iterations: maxIterations, trace };
}

module.exports = { tools, getTool, listTools, executeTool, reactLoop, parseThoughtAction, buildToolPrompt };

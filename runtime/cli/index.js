const path = require('path');
const { initConfig, readConfig, addRepository, getRepositories, findConfigDir } = require('../config/loader');
const { createAdapter, listAdapters } = require('../adapter');
const { main: runAutonomous } = require('../orchestration/autonomous-runner');
const { main: runSubIssues } = require('../orchestration/sub-issue-processor');
const { printKeyStatus, getModeHelp, getActiveMode, getAvailableModeNames } = require('../orchestration/model-router');
const { detectAvailableKeys } = require('../config/key-manager');

const COMMANDS = ['init', 'connect', 'run', 'watch', 'keys', 'help'];

function parseRepoUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function main(argv) {
  const args = argv || process.argv.slice(2);
  const command = args[0] || 'help';

  if (!COMMANDS.includes(command)) {
    console.error(`Unknown command: "${command}". Available: ${COMMANDS.join(', ')}`);
    process.exit(1);
  }

  switch (command) {
    case 'init':
      return cmdInit(args.slice(1));
    case 'connect':
      return cmdConnect(args.slice(1));
    case 'run':
      return cmdRun(args.slice(1));
    case 'watch':
      return cmdWatch(args.slice(1));
    case 'keys':
      return cmdKeys(args.slice(1));
    case 'help':
    default:
      return cmdHelp();
  }
}

function cmdInit(args) {
  const rootDir = args[0] || process.cwd();
  console.log(`[CLI] Initializing AI Orchestrator in ${rootDir}...`);
  const result = initConfig(rootDir);
  console.log(`[CLI] Created ${result.configDir}/`);
  for (const file of result.files) {
    console.log(`[CLI]   - ${file}`);
  }
  console.log('[CLI] Done. Run `ai-orchestrator connect <repo-url>\` to add a repository.');
  return result;
}

function cmdConnect(args) {
  const repoUrl = args[0];
  if (!repoUrl) {
    console.error('[CLI] Usage: ai-orchestrator connect <repo-url> [adapter-type]');
    process.exit(1);
  }
  const adapterType = args[1] || 'github';
  const rootDir = args[2] || process.cwd();

  const connection = addRepository(rootDir, repoUrl, adapterType);
  console.log(`[CLI] Repository registered. Total repositories: ${connection.repositories.length}`);
  return connection;
}

function cmdRun(args) {
  return (async () => {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    let issueNumber, owner, repo;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--issue' || args[i] === '-i') issueNumber = parseInt(args[++i], 10);
      else if (args[i] === '--owner' || args[i] === '-o') owner = args[++i];
      else if (args[i] === '--repo' || args[i] === '-r') repo = args[++i];
      else if (args[i] === '--mode' || args[i] === '-m') {
        const modeVal = args[++i];
        process.env.AI_ORCHESTRATOR_MODE = modeVal;
      }
    }

    if (!owner || !repo) {
      const config = readConfig();
      const repos = config.connection ? config.connection.repositories : [];
      if (repos.length === 0) {
        console.error('[CLI] No repositories configured. Run `ai-orchestrator connect <repo-url>\` first.');
        process.exit(1);
      }
      const entry = repos[0];
      const parsed = parseRepoUrl(entry.url);
      if (!parsed) {
        console.error(`[CLI] Cannot parse repo URL: ${entry.url}`);
        process.exit(1);
      }
      owner = owner || parsed.owner;
      repo = repo || parsed.repo;
    }

    console.log(`[CLI] Target: ${owner}/${repo}`);
    if (issueNumber) console.log(`[CLI] Processing single issue: #${issueNumber}`);

    printKeyStatus();

    console.log(`\n[CLI] Starting orchestrator pipeline...\n`);

    const adapter = createAdapter('github', owner, repo, { token });
    const info = await adapter.getInfo();
    console.log(`[CLI] Adapter ready: ${JSON.stringify(info)}`);

    if (issueNumber) {
      const { processIssue } = require('../orchestration/autonomous-runner');
      const result = await processIssue(issueNumber, owner, repo, token);
      console.log(`[CLI] Issue #${issueNumber} pipeline complete`);
      return result;
    }

    const result = await runAutonomous({ owner, repo, token });
    console.log(`\n[CLI] Processing sub-issues...`);
    await runSubIssues({ owner, repo, token });

    console.log(`\n[CLI] Run complete.`);
    return result;
  })();
}

function cmdWatch(args) {
  return (async () => {
    const rootDir = args[0] || process.cwd();
    const interval = parseInt(args[1], 10) || 60000;

    const config = readConfig(rootDir);
    if (!config.connection || !config.connection.repositories || config.connection.repositories.length === 0) {
      console.error('[CLI] No repositories configured. Run `ai-orchestrator connect <repo-url>\` first.');
      process.exit(1);
    }

    console.log(`[CLI] Watch mode started. Polling every ${interval}ms`);
    console.log(`[CLI] Press Ctrl+C to stop.`);

    const runLoop = async () => {
      console.log(`\n[CLI] Watch cycle at ${new Date().toISOString()}`);
      try {
        await cmdRun([]);
      } catch (err) {
        console.error(`[CLI] Watch cycle error: ${err.message}`);
      }
    };

    await runLoop();
    const timer = setInterval(runLoop, interval);

    process.on('SIGINT', () => {
      console.log('\n[CLI] Watch mode stopped.');
      clearInterval(timer);
      process.exit(0);
    });
  })();
}

function cmdKeys() {
  printKeyStatus();
  console.log(`\n${getModeHelp()}`);
  console.log(`\nSet mode: AI_ORCHESTRATOR_MODE=<mode> or --mode <mode>`);
}

function cmdHelp() {
  const keys = detectAvailableKeys();
  const mode = getActiveMode();

  const help = `
AI Orchestrator — Portable Runtime CLI

Key status: ${Object.entries(keys).map(([k, v]) => `${k}:${v ? '✅' : '❌'}`).join(' ')}
Key mode: ${mode.label} (${process.env.AI_ORCHESTRATOR_MODE || 'openai-only'})

Usage:
  ai-orchestrator <command> [options]

Commands:
  init                      Initialize config in current directory
  connect <repo-url>        Register a repository as execution target
  run                       Execute orchestration pipeline
    --issue, -i <number>    Process a single issue by number
    --owner, -o <owner>     GitHub owner (or from config)
    --repo, -r <repo>       GitHub repo (or from config)
    --mode, -m <mode>       Key mode: ${getAvailableModeNames().join(' | ')}
  watch [interval]          Watch mode — poll for new tasks every N ms (default: 60000)
  keys                      Show API key status and available modes
  help                      Show this help

Examples:
  ai-orchestrator init
  ai-orchestrator keys
  ai-orchestrator connect https://github.com/owner/target-repo
  ai-orchestrator run
  ai-orchestrator run --issue 42
  ai-orchestrator run --owner user --repo my-project --mode full
  ai-orchestrator watch 30000
`;
  console.log(help);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[CLI] Fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main, COMMANDS, cmdInit, cmdConnect, cmdRun, cmdWatch, cmdHelp };

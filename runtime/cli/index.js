const path = require('path');
const { initConfig, readConfig, addRepository, getRepositories } = require('../config/loader');
const { createAdapter, listAdapters } = require('../adapter');

const COMMANDS = ['init', 'connect', 'run', 'watch', 'help'];

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
  console.log('[CLI] Done. Run \`ai-orchestrator connect <repo-url>\` to add a repository.');
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

  console.log(`[CLI] Connecting repository: ${repoUrl}`);
  console.log(`[CLI] Adapter: ${adapterType}`);

  const connection = addRepository(rootDir, repoUrl, adapterType);
  console.log(`[CLI] Repository registered. Total repositories: ${connection.repositories.length}`);
  return connection;
}

async function cmdRun(args) {
  const rootDir = args[0] || process.cwd();
  const config = readConfig(rootDir);

  if (!config.connection || !config.connection.repositories || config.connection.repositories.length === 0) {
    console.error('[CLI] No repositories configured. Run \`ai-orchestrator connect <repo-url>\` first.');
    process.exit(1);
  }

  console.log(`[CLI] Starting AI Orchestrator run...`);
  console.log(`[CLI] Found ${config.connection.repositories.length} configured repositories`);

  const results = [];

  for (const repo of config.connection.repositories) {
    console.log(`[CLI] Processing repository: ${repo.url}`);

    const repoMatch = repo.url.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (!repoMatch) {
      console.error(`[CLI]   Cannot parse owner/repo from: ${repo.url}`);
      continue;
    }

    const owner = repoMatch[1];
    const repoName = repoMatch[2].replace(/\.git$/, '');
    const adapter = createAdapter(repo.adapter || 'github', owner, repoName, {
      repoUrl: repo.url
    });

    try {
      const info = await adapter.getInfo();
      console.log(`[CLI]   Repo info: ${JSON.stringify(info)}`);

      const issues = await adapter.readIssues('open', ['task:created']);
      console.log(`[CLI]   Found ${issues.length} open tasks`);

      for (const issue of issues) {
        console.log(`[CLI]   Processing task #${issue.number}: ${issue.title}`);
        await adapter.writeComment(issue.number, '## Pipeline Started\n\nTask picked up by AI Orchestrator.');
      }

      results.push({ repo: repo.url, status: 'processed', tasksFound: issues.length });
    } catch (err) {
      console.error(`[CLI]   Error: ${err.message}`);
      results.push({ repo: repo.url, status: 'failed', error: err.message });
    }
  }

  console.log(`[CLI] Run complete. Processed ${results.length} repositories.`);
  return results;
}

async function cmdWatch(args) {
  const rootDir = args[0] || process.cwd();
  const interval = parseInt(args[1], 10) || 60000;

  const config = readConfig(rootDir);
  if (!config.connection || !config.connection.repositories || config.connection.repositories.length === 0) {
    console.error('[CLI] No repositories configured. Run `ai-orchestrator connect <repo-url>` first.');
    process.exit(1);
  }

  console.log(`[CLI] Watch mode started. Polling every ${interval}ms`);
  console.log(`[CLI] Repositories: ${config.connection.repositories.map(r => r.url).join(', ')}`);
  console.log('[CLI] Press Ctrl+C to stop.');

  const runLoop = async () => {
    console.log(`[CLI] Watch cycle at ${new Date().toISOString()}`);
    try {
      await cmdRun([rootDir]);
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

  return { watching: true, interval };
}

function cmdHelp() {
  const help = `
AI Orchestrator — Portable Runtime CLI

Usage:
  ai-orchestrator <command> [options]

Commands:
  init                      Initialize config in current directory
  connect <repo-url>        Register a repository as execution target
  run                       Execute orchestration pipeline
  watch [interval]          Watch mode — poll for new tasks every N ms (default: 60000)
  help                      Show this help

Examples:
  ai-orchestrator init
  ai-orchestrator connect https://github.com/owner/target-repo
  ai-orchestrator run
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

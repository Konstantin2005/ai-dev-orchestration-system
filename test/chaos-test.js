const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { writeFileSync, readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

const SANDBOX = 'C:\\ai-orchestrator-sandbox';
const CYCLES = 3;
const results = [];
const ORCHESTRATOR_DIR = 'C:\\ai-dev-orchestration-system';

function makeIssue(title, body, labels = []) {
  return {
    id: Math.floor(Math.random() * 10000),
    title,
    body,
    labels,
    user: { login: 'chaos-test' },
    created_at: new Date().toISOString(),
  };
}

function runIssueThroughPipeline(issue) {
  try {
    const { executeGraph } = require(join(ORCHESTRATOR_DIR, 'runtime/graph/index'));
    return executeGraph(issue, `chaos-${Date.now()}`);
  } catch (err) {
    return { output: null, trace: [] };
  }
}

function resetSandbox() {
  execSync('git checkout -- .', { cwd: SANDBOX, encoding: 'utf-8', stdio: 'pipe' });
  execSync('git clean -fd', { cwd: SANDBOX, encoding: 'utf-8', stdio: 'pipe' });
}

function injectChaos(cycle) {
  if (cycle === 1) {
    const mathPath = join(SANDBOX, 'tests', 'math.test.js');
    const valPath = join(SANDBOX, 'src', 'validation.js');
    writeFileSync(mathPath,
      readFileSync(mathPath, 'utf-8')
        .replace('assert.equal(add(2, 3), 5)', 'assert.equal(add(2, 3), 999)'));
    writeFileSync(valPath,
      readFileSync(valPath, 'utf-8')
        .replace("if (!data) return ['No data provided']", "if (!data) return ['No data']"));
    console.error('[CHAOS] Injected forced failures (broken test + validation)');
  } else if (cycle === 2) {
    writeFileSync(join(SANDBOX, 'src', 'index.js'),
      readFileSync(join(SANDBOX, 'src', 'index.js'), 'utf-8') + '\n\n// GHOST CODE — should not exist\n');
    writeFileSync(join(SANDBOX, 'README.md'), '# CONFLICTING BRANCH STATE\n');
    console.error('[CHAOS] Injected race condition (ghost code + conflicting state)');
  }
}

function validateCycle(cycle, result) {
  const checks = [];
  const output = result?.output || {};
  const trace = result?.trace || [];

  const pipelineRan = result && result.output !== null;
  checks.push({ name: 'Pipeline executed', pass: pipelineRan });

  if (pipelineRan) {
    checks.push({ name: 'Architecture generated', pass: !!output.architecture?.summary });
    checks.push({ name: 'Logs present', pass: Object.values(output.logs || {}).some(v => v) });
    checks.push({ name: 'Files generated', pass: Array.isArray(output.files) && output.files.length > 0 });
    checks.push({ name: 'Valid status', pass: ['READY_FOR_PR', 'CHANGES_REQUESTED'].includes(output.status) });
    checks.push({ name: 'Execution trace', pass: trace.length > 0 });
    checks.push({ name: 'Review performed', pass: !!(output.logs?.reviewer || '').trim() });
    checks.push({ name: 'QA performed', pass: !!(output.logs?.qa || '').trim() });
    checks.push({ name: 'Backend work done', pass: !!(output.logs?.backend || '').trim() });
  } else {
    checks.push({ name: 'Pipeline failure reason', pass: true, info: 'Pipeline did not complete (expected with no OpenAI key)' });
  }

  return checks;
}

describe('Chaos Test — 3 Full Cycles', () => {
  before(() => {
    if (!existsSync(SANDBOX)) throw new Error(`Sandbox ${SANDBOX} does not exist`);
    resetSandbox();
  });

  for (let cycle = 0; cycle < CYCLES; cycle++) {
    it(`Cycle ${cycle + 1}: execute pipeline against sandbox`, () => {
      if (cycle > 0) injectChaos(cycle - 1);

      const issue = makeIssue(
        `[Cycle ${cycle + 1}] Fix validation and add error handling`,
        `## Task\n\nImprove the validation module in \`src/validation.js\` to handle edge cases.\n\n## Requirements\n- Add proper error messages\n- Handle undefined values\n- Add type checking\n- Update tests`
      );

      const result = runIssueThroughPipeline(issue);
      const checks = validateCycle(cycle, result);

      results.push({ cycle: cycle + 1, result, checks });

      const passed = checks.filter(c => c.pass).length;
      const total = checks.length;
      console.error(`[CYCLE ${cycle + 1}] Checks: ${passed}/${total} passed`);

      const fails = checks.filter(c => !c.pass);
      for (const f of fails) {
        console.error(`[CYCLE ${cycle + 1}] FAIL: ${f.name}`);
      }
    });
  }

  after(() => {
    console.error('\n========== CHAOS TEST REPORT ==========');
    for (const r of results) {
      console.error(`\n--- Cycle ${r.cycle} ---`);
      if (r.result?.output) {
        console.error(`  Status: ${r.result.output.status}`);
        console.error(`  Files: ${r.result.output.files?.length || 0}`);
        console.error(`  Trace steps: ${r.result.trace?.length || 0}`);
      }
      for (const c of r.checks) {
        console.error(`  ${c.pass ? '✓' : '✗'} ${c.name}${c.info ? ': ' + c.info : ''}`);
      }
    }

    const allPassed = results.every(r => r.checks.every(c => c.pass));
    const totalChecks = results.reduce((a, r) => a + r.checks.length, 0);
    const passedChecks = results.reduce((a, r) => a + r.checks.filter(c => c.pass).length, 0);

    console.error('\n--- Health Summary ---');
    console.error(`  Total checks: ${passedChecks}/${totalChecks} passed`);
    console.error(`  All checks passed: ${allPassed ? 'YES' : 'NO'}`);
    console.error(`  Cycles completed: ${results.length}/${CYCLES}`);

    if (!allPassed) {
      console.error('\n--- Architecture Feedback ---');
      for (const r of results) {
        const fails = r.checks.filter(c => !c.pass);
        if (fails.length > 0) {
          console.error(`  Cycle ${r.cycle}: ${fails.map(f => f.name).join(', ')}`);
        }
      }
    }
    console.error('=========================================\n');
  });
});

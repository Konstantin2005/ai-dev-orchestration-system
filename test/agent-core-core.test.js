const { TemplateEngine  } = require("../src/templates/engine");
const { TemplateLoader  } = require("../src/templates/loader");
const { TemplateRegistry  } = require("../src/templates/registry");
const { Orchestrator  } = require("../src/core/orchestrator");
const fs = require("fs/promises");
const path = require("path");
const { fileURLToPath  } = require("url");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', 'temp-test');

async function testTemplateEngine() {
  console.log('--- TemplateEngine ---');

  const engine = new TemplateEngine();

  const simple = engine.render('Hello [name]!', { name: 'World' });
  console.assert(simple === 'Hello World!', `Expected "Hello World!" got "${simple}"`);
  console.log('  ✓ Simple variable substitution');

  const conditional = engine.render('{% if show %}visible{% endif %}', { show: true });
  console.assert(conditional === 'visible', `Expected "visible" got "${conditional}"`);
  console.log('  ✓ Conditional block (true)');

  const conditionalFalse = engine.render('{% if show %}visible{% endif %}', { show: false });
  console.assert(conditionalFalse === '', `Expected "" got "${conditionalFalse}"`);
  console.log('  ✓ Conditional block (false)');

  const each = engine.render('{% each items as item %}- [item]\n{% endeach %}', { items: ['a', 'b'] });
  console.assert(each.includes('- a'), `Should include "- a"`);
  console.assert(each.includes('- b'), `Should include "- b"`);
  console.log('  ✓ Each loop');

  const nested = engine.render('[user.name]', { user: { name: 'Alice' } });
  console.assert(nested === 'Alice', `Expected "Alice" got "${nested}"`);
  console.log('  ✓ Nested key resolution');
}

async function testTemplateLoader() {
  console.log('\n--- TemplateLoader ---');

  const loader = new TemplateLoader(path.join(__dirname, '..', 'templates'));

  const plan = await loader.load('plan');
  console.assert(plan.includes('[title]'), 'plan.md should contain placeholder');
  console.log('  ✓ Loaded plan.md');

  const exists = await loader.exists('plan');
  console.assert(exists === true, 'plan.md should exist');
  console.log('  ✓ exists() returns true');

  const notExists = await loader.exists('nonexistent');
  console.assert(notExists === false, 'nonexistent should not exist');
  console.log('  ✓ exists() returns false for missing template');

  const all = await loader.loadAll();
  const expectedFiles = ['plan', 'architecture', 'decisions', 'context', 'backend-api', 'frontend-ui', 'qa-tests', 'review'];
  for (const name of expectedFiles) {
    console.assert(all[name] !== undefined, `Expected template "${name}" to be loaded`);
  }
  console.log(`  ✓ loadAll() loaded ${Object.keys(all).length} templates`);
}

async function testTemplateRegistry() {
  console.log('\n--- TemplateRegistry ---');

  const registry = new TemplateRegistry(path.join(__dirname, '..', 'templates'));
  await registry.init();

  const rendered = await registry.render('plan', { id: 1, title: 'Test', slug: 'test' });
  console.assert(rendered.includes('Test'), 'Rendered plan should contain title');
  console.assert(rendered.includes('#1'), 'Rendered plan should contain ID');
  console.log('  ✓ TemplateRegistry.render() works');
}

async function testOrchestrator() {
  console.log('\n--- Orchestrator with Templates ---');

  const orchestrator = new Orchestrator();

  const mockIssue = {
    id: 999,
    title: 'Template-System-Test',
    body: 'Testing template integration with orchestrator.',
  };

  try {
    const result = await orchestrator.run(mockIssue);
    console.log('  ✓ Pipeline executed successfully');

    const workspace = `.work/issues/999-template-system-test`;
    const archPlan = await fs.readFile(path.join(workspace, '00-architect', 'plan.md'), 'utf-8');
    console.assert(archPlan.includes('Template-System-Test'), 'Plan should contain title');
    console.assert(archPlan.includes('#999'), 'Plan should contain issue ID');
    console.log('  ✓ Architect used templates');

    const review = await fs.readFile(path.join(workspace, '04-code-reviewer', 'review.md'), 'utf-8');
    console.assert(review.includes('Approve'), 'Review should contain verdict section');
    console.log('  ✓ Reviewer used templates');

    await fs.rm(workspace, { recursive: true, force: true });
    console.log('  ✓ Clean up temporary workspace');
  } catch (err) {
    console.error('  ✗ Pipeline failed:', err.message);
    throw err;
  }
}

async function main() {
  console.log('=== Agent Core + Templates Tests ===\n');

  try {
    await testTemplateEngine();
    await testTemplateLoader();
    await testTemplateRegistry();
    await testOrchestrator();
    console.log('\n=== All tests passed ===');
  } catch (err) {
    console.error('\n=== Tests FAILED ===', err);
    process.exit(1);
  }
}

main();

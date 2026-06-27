const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { validateAndNormalize, formatForGraph } = require('../runtime/bridge/issue-adapter');

describe('bridge adapter: validateAndNormalize', () => {
  it('normalizes a valid issue object', () => {
    const issue = { id: 42, title: 'Test Issue', body: 'This is a test body', labels: [{ name: 'bug' }], url: 'https://github.com/owner/repo/issues/42' };
    const result = validateAndNormalize(issue);
    assert.equal(result.source, 'github_issue');
    assert.equal(result.issue.id, 42);
    assert.equal(result.issue.title, 'Test Issue');
    assert.equal(result.issue.body, 'This is a test body');
    assert.deepEqual(result.issue.labels, ['bug']);
    assert.equal(result.issue.url, 'https://github.com/owner/repo/issues/42');
    assert.equal(result.execution.mode, 'standalone');
    assert.ok(result.execution.requestedAt);
  });

  it('sanitizes control characters from title and body', () => {
    const issue = { id: 1, title: 'Test\x00Title', body: 'Body\x1Ftext' };
    const result = validateAndNormalize(issue);
    assert.equal(result.issue.title, 'TestTitle');
    assert.equal(result.issue.body, 'Bodytext');
  });

  it('truncates long title to 200 chars', () => {
    const issue = { id: 1, title: 'x'.repeat(500), body: 'body' };
    const result = validateAndNormalize(issue);
    assert.equal(result.issue.title.length, 200);
  });

  it('truncates long body to 10240 chars', () => {
    const issue = { id: 1, title: 'Test', body: 'x'.repeat(20000) };
    const result = validateAndNormalize(issue);
    assert.equal(result.issue.body.length, 10240);
  });

  it('throws when title is missing', () => {
    const issue = { id: 1, body: 'body' };
    assert.throws(() => validateAndNormalize(issue), /issue title is required/);
  });

  it('throws when body is missing', () => {
    const issue = { id: 1, title: 'Test' };
    assert.throws(() => validateAndNormalize(issue), /issue body is required/);
  });

  it('throws when input is null', () => {
    assert.throws(() => validateAndNormalize(null), /input must be an object/);
  });

  it('throws when input is not an object', () => {
    assert.throws(() => validateAndNormalize('string'), /input must be an object/);
  });

  it('handles string labels', () => {
    const issue = { id: 1, title: 'Test', body: 'body', labels: ['bug', 'enhancement'] };
    const result = validateAndNormalize(issue);
    assert.deepEqual(result.issue.labels, ['bug', 'enhancement']);
  });

  it('handles missing optional fields gracefully', () => {
    const issue = { id: 1, title: 'Test', body: 'body' };
    const result = validateAndNormalize(issue);
    assert.equal(result.issue.labels.length, 0);
    assert.equal(result.issue.url, '');
  });

  it('handles id as string number', () => {
    const issue = { id: '99', title: 'Test', body: 'body' };
    const result = validateAndNormalize(issue);
    assert.equal(result.issue.id, 99);
  });
});

describe('bridge adapter: formatForGraph', () => {
  it('formats normalized issue for graph consumption', () => {
    const normalized = {
      source: 'github_issue',
      issue: { id: 42, title: 'Add User Authentication', body: 'We need login', labels: ['feature'] },
      execution: { mode: 'standalone', requestedAt: new Date().toISOString() }
    };
    const result = formatForGraph(normalized);
    assert.equal(result.id, 42);
    assert.equal(result.title, 'Add User Authentication');
    assert.equal(result.slug, 'add-user-authentication');
    assert.equal(result.body, 'We need login');
    assert.deepEqual(result.labels, ['feature']);
  });

  it('generates slug from title', () => {
    const normalized = {
      issue: { id: 1, title: 'Fix Critical Bug!!!', body: 'urgent' },
      execution: {}
    };
    const result = formatForGraph(normalized);
    assert.equal(result.slug, 'fix-critical-bug');
  });

  it('truncates slug to 80 chars', () => {
    const normalized = {
      issue: { id: 1, title: 'a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z-'.repeat(10), body: 'body' },
      execution: {}
    };
    const result = formatForGraph(normalized);
    assert.ok(result.slug.length <= 80);
  });
});

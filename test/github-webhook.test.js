const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const {
  verifySignature,
  parseEvent,
  routeEvent,
  routeIssueEvent,
  routeIssueCommentEvent,
  formatEventSummary,
  SUPPORTED_EVENTS
} = require('../runtime/github/webhook');

const { __setMockOctokit } = require('../runtime/github/client');

const { createApp } = require('../runtime/github/server');

function mockOctokit() {
  __setMockOctokit(() => ({
    rest: {
      issues: {
        create: async () => ({ data: { id: 2, number: 2, title: '', html_url: '' } }),
        createComment: async () => ({ data: { id: 1, html_url: '' } }),
        get: async () => ({ data: { number: 1, title: 'Test', body: '', labels: [], html_url: '', state: 'open' } }),
        listComments: async () => ({ data: [] }),
        setLabels: async () => ({ data: [] }),
        addLabels: async () => ({ data: [] }),
        removeLabel: async () => ({ data: {} }),
        update: async () => ({ data: { state: 'closed' } })
      },
      pulls: {
        create: async () => ({ data: { id: 1, number: 1, html_url: '' } })
      }
    }
  }));
}

function resetMockOctokit() {
  __setMockOctokit(null);
}

describe('webhook.js — GitHub webhook handler', () => {

  describe('verifySignature', () => {
    it('returns true when no secret configured', () => {
      assert.equal(verifySignature('payload', 'signature', null), true);
      assert.equal(verifySignature('payload', 'signature', ''), true);
    });

    it('returns true for valid signature', () => {
      const secret = 'mysecret';
      const payload = '{"action":"opened"}';
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      const signature = `sha256=${hmac.update(payload).digest('hex')}`;
      assert.equal(verifySignature(payload, signature, secret), true);
    });

    it('returns false for invalid signature', () => {
      const secret = 'mysecret';
      const payload = '{"action":"opened"}';
      const signature = 'sha256:invalidsignature';
      assert.equal(verifySignature(payload, signature, secret), false);
    });

    it('returns false for tampered payload', () => {
      const secret = 'mysecret';
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      const signature = `sha256=${hmac.update('original').digest('hex')}`;
      assert.equal(verifySignature('tampered', signature, secret), false);
    });

    it('returns false when signature is missing and secret is set', () => {
      assert.equal(verifySignature('payload', null, 'secret'), false);
      assert.equal(verifySignature('payload', undefined, 'secret'), false);
    });

    it('handles timing-safe comparison correctly', () => {
      const secret = 'mysecret';
      const payload = 'test';
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      const signature = `sha256=${hmac.update(payload).digest('hex')}`;
      assert.equal(verifySignature(payload, signature, secret), true);
      assert.equal(verifySignature(payload, signature + 'x', secret), false);
    });
  });

  describe('parseEvent', () => {
    it('parses event headers from request', () => {
      const req = {
        headers: {
          'x-github-event': 'issues',
          'x-github-delivery': 'abc-123',
          'x-hub-signature-256': 'sha256=abc',
          'x-request-id': 'req-1'
        }
      };
      const result = parseEvent(req);
      assert.equal(result.event, 'issues');
      assert.equal(result.delivery, 'abc-123');
      assert.equal(result.signature, 'sha256=abc');
      assert.equal(result.id, 'req-1');
    });

    it('falls back to delivery for id', () => {
      const req = {
        headers: {
          'x-github-event': 'ping',
          'x-github-delivery': 'del-1'
        }
      };
      const result = parseEvent(req);
      assert.equal(result.event, 'ping');
      assert.equal(result.id, 'del-1');
    });

    it('handles missing headers', () => {
      const req = { headers: {} };
      const result = parseEvent(req);
      assert.equal(result.event, undefined);
      assert.equal(result.delivery, undefined);
      assert.equal(result.signature, undefined);
    });
  });

  describe('routeEvent', () => {
    it('routes issues.opened action', async () => {
      mockOctokit();
      try {
        const result = await routeEvent('issues', {
          action: 'opened',
          issue: { number: 1, title: 'Test', body: '', labels: [], html_url: 'https://github.com/owner/repo/issues/1' },
          repository: { owner: { login: 'owner' }, name: 'repo' }
        }, { token: 'test-token' });
        assert.equal(result.handled, true);
        assert.equal(result.action, 'issue_opened');
      } finally {
        resetMockOctokit();
      }
    });

    it('routes ping event', async () => {
      const result = await routeEvent('ping', {});
      assert.equal(result.handled, true);
      assert.equal(result.action, 'pong');
    });

    it('returns unsupported for unknown event', async () => {
      const result = await routeEvent('unknown', {});
      assert.equal(result.handled, false);
      assert.equal(result.action, 'unsupported_event');
    });

    it('routes issue_comment.created', async () => {
      const payload = {
        action: 'created',
        comment: { body: 'test comment', user: { type: 'User', login: 'testuser' } },
        issue: { number: 1, title: 'Test', body: '', labels: [], html_url: 'https://github.com/owner/repo/issues/1' },
        repository: { owner: { login: 'owner' }, name: 'repo' }
      };
      const result = await routeEvent('issue_comment', payload, { token: 'test-token' });
      assert.equal(result.handled, true);
      assert.equal(result.action, 'issue_comment.created');
    });

    it('ignores bot comments in issue_comment.created', async () => {
      const payload = {
        action: 'created',
        comment: { body: 'bot comment', user: { type: 'Bot', login: 'some-bot' } },
        issue: { number: 1, title: 'Test', body: '', labels: [], html_url: 'https://github.com/owner/repo/issues/1' },
        repository: { owner: { login: 'owner' }, name: 'repo' }
      };
      const result = await routeEvent('issue_comment', payload);
      assert.equal(result.handled, false);
      assert.equal(result.action, 'issue_comment.created_by_bot');
    });
  });

  describe('routeIssueEvent', () => {
    it('handles labeled action', async () => {
      const payload = {
        action: 'labeled',
        issue: { number: 1, title: 'Test', body: '', labels: [], html_url: 'https://github.com/owner/repo/issues/1' },
        label: { name: 'status:architect:done' },
        repository: { owner: { login: 'owner' }, name: 'repo' }
      };
      const result = await routeIssueEvent('labeled', payload);
      assert.equal(result.handled, true);
      assert.equal(result.action, 'issue_labeled');
      assert.equal(result.label, 'status:architect:done');
    });

    it('handles closed action', async () => {
      const payload = {
        action: 'closed',
        issue: { number: 1, title: 'Test', body: '', labels: [], html_url: 'https://github.com/owner/repo/issues/1' },
        repository: { owner: { login: 'owner' }, name: 'repo' }
      };
      const result = await routeIssueEvent('closed', payload);
      assert.equal(result.handled, true);
      assert.equal(result.action, 'issue_closed');
    });

    it('returns unsupported for unknown issue action', async () => {
      const payload = {
        action: 'reopened',
        issue: { number: 1, title: 'Test', body: '', labels: [] },
        repository: { owner: { login: 'owner' }, name: 'repo' }
      };
      const result = await routeIssueEvent('reopened', payload);
      assert.equal(result.handled, false);
    });
  });

  describe('routeIssueCommentEvent', () => {
    it('returns unsupported for non-created action', async () => {
      const result = await routeIssueCommentEvent('edited', {});
      assert.equal(result.handled, false);
      assert.equal(result.action, 'issue_comment.edited');
    });

    it('returns unsupported for deleted action', async () => {
      const result = await routeIssueCommentEvent('deleted', {});
      assert.equal(result.handled, false);
      assert.equal(result.action, 'issue_comment.deleted');
    });
  });

  describe('formatEventSummary', () => {
    it('formats pong event', () => {
      assert.equal(formatEventSummary({ action: 'pong' }), 'GitHub webhook is alive');
    });

    it('returns no result for null', () => {
      assert.equal(formatEventSummary(null), 'No result');
    });

    it('formats unsupported event', () => {
      assert.equal(formatEventSummary({ action: 'unsupported_event', event: 'star' }), 'Event: unsupported_event');
    });
  });

  describe('SUPPORTED_EVENTS', () => {
    it('includes issues, issue_comment, pull_request', () => {
      assert.ok(SUPPORTED_EVENTS.includes('issues'));
      assert.ok(SUPPORTED_EVENTS.includes('issue_comment'));
      assert.ok(SUPPORTED_EVENTS.includes('pull_request'));
    });
  });
});

describe('server.js — Express webhook server', () => {
  let app;
  let server;

  before(async () => {
    app = createApp({ webhookSecret: 'test-secret' });
  });

  after(() => {
    if (server) server.close();
  });

  it('createApp returns Express app', () => {
    assert.ok(app);
    assert.equal(typeof app.listen, 'function');
    assert.equal(typeof app.use, 'function');
  });

  it('GET /health returns ok status', async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        http.get(`http://localhost:${port}/health`, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            const body = JSON.parse(data);
            assert.equal(res.statusCode, 200);
            assert.equal(body.status, 'ok');
            server.close();
            server = null;
            resolve();
          });
        });
      });
    });
  });

  it('POST /webhook returns 400 when missing event header', async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        const postData = JSON.stringify({});
        const req = http.request({
          hostname: 'localhost',
          port,
          path: '/webhook',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            const body = JSON.parse(data);
            assert.equal(res.statusCode, 400);
            assert.equal(body.error, 'Missing X-GitHub-Event header');
            server.close();
            server = null;
            resolve();
          });
        });
        req.write(postData);
        req.end();
      });
    });
  });

  it('POST /webhook/sync returns 401 for invalid signature', async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        const postData = JSON.stringify({ action: 'opened' });
        const req = http.request({
          hostname: 'localhost',
          port,
          path: '/webhook/sync',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'X-GitHub-Event': 'ping',
            'X-Hub-Signature-256': 'sha256=invalid'
          }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            const body = JSON.parse(data);
            assert.equal(res.statusCode, 401);
            assert.equal(body.error, 'Invalid signature');
            server.close();
            server = null;
            resolve();
          });
        });
        req.write(postData);
        req.end();
      });
    });
  });

  it('POST /webhook/sync processes ping event', async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        const crypto = require('crypto');
        const secret = 'test-secret';
        const payload = JSON.stringify({ action: 'ping' });
        const hmac = crypto.createHmac('sha256', secret);
        const signature = `sha256=${hmac.update(payload).digest('hex')}`;
        const postData = payload;
        const req = http.request({
          hostname: 'localhost',
          port,
          path: '/webhook/sync',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'X-GitHub-Event': 'ping',
            'X-Hub-Signature-256': signature,
            'X-GitHub-Delivery': 'test-delivery'
          }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            const body = JSON.parse(data);
            assert.equal(res.statusCode, 200);
            assert.equal(body.status, 'processed');
            assert.equal(body.event, 'ping');
            server.close();
            server = null;
            resolve();
          });
        });
        req.write(postData);
        req.end();
      });
    });
  });

  it('GET unknown route returns 404', async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        http.get(`http://localhost:${port}/unknown`, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            assert.equal(res.statusCode, 404);
            server.close();
            server = null;
            resolve();
          });
        });
      });
    });
  });
});

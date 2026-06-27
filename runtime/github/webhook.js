const crypto = require('crypto');

const { handleIssueOpened, handleIssueComment } = require('./pipeline');

const SUPPORTED_EVENTS = [
  'issues',
  'issue_comment',
  'pull_request'
];

function verifySignature(payload, signature, secret) {
  if (!secret) return true;
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;

  try {
    const given = Buffer.from(signature);
    const expected = Buffer.from(digest);
    if (given.length !== expected.length) return false;
    return crypto.timingSafeEqual(given, expected);
  } catch {
    return false;
  }
}

function parseEvent(req) {
  const event = req.headers['x-github-event'];
  const delivery = req.headers['x-github-delivery'];
  const signature = req.headers['x-hub-signature-256'];
  const id = req.headers['x-request-id'] || delivery;

  return { event, delivery, signature, id };
}

async function routeEvent(eventName, payload, options = {}) {
  const action = payload.action;

  switch (eventName) {
    case 'issues':
      return routeIssueEvent(action, payload, options);

    case 'issue_comment':
      return routeIssueCommentEvent(action, payload, options);

    case 'ping':
      return { handled: true, action: 'pong' };

    default:
      return { handled: false, action: 'unsupported_event', event: eventName };
  }
}

async function routeIssueEvent(action, payload, options = {}) {
  const issue = { ...payload.issue, _repo: { owner: payload.repository.owner.login, repo: payload.repository.name } };

  switch (action) {
    case 'opened':
      return {
        handled: true,
        action: 'issue_opened',
        result: await handleIssueOpened({ issue }, options)
      };

    case 'labeled': {
      const labelName = payload.label ? payload.label.name : '';
      return { handled: true, action: 'issue_labeled', label: labelName, issue };
    }

    case 'closed':
      return { handled: true, action: 'issue_closed', issue };

    default:
      return { handled: false, action: `issues.${action}`, issue };
  }
}

async function routeIssueCommentEvent(action, payload, options = {}) {
  if (action !== 'created') {
    return { handled: false, action: `issue_comment.${action}` };
  }

  const event = {
    comment: payload.comment,
    issue: { ...payload.issue, _repo: { owner: payload.repository.owner.login, repo: payload.repository.name } }
  };

  const isBot = payload.comment && payload.comment.user && payload.comment.user.type === 'Bot';
  if (isBot) {
    return { handled: false, action: 'issue_comment.created_by_bot' };
  }

  return {
    handled: true,
    action: 'issue_comment.created',
    result: await handleIssueComment(event, options)
  };
}

function formatEventSummary(result) {
  if (!result) return 'No result';
  if (result.action === 'pong') return 'GitHub webhook is alive';
  if (result.action === 'issue_opened') {
    const r = result.result;
    return `Pipeline started for #${r.parentIssue.number}, created sub-issue #${r.childIssues[0]?.issue?.number || '?'}`;
  }
  if (result.action === 'issue_comment.created') {
    const r = result.result;
    return `Comment processed for #${r.issue?.number}: action=${r.action} step=${r.currentStep || 'none'}`;
  }
  if (result.action === 'issue_labeled') {
    return `Label "${result.label}" added to #${result.issue?.number}`;
  }
  return `Event: ${result.action}`;
}

module.exports = {
  SUPPORTED_EVENTS,
  verifySignature,
  parseEvent,
  routeEvent,
  routeIssueEvent,
  routeIssueCommentEvent,
  formatEventSummary
};

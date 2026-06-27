'use strict';

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 10240;
const MIN_BODY_LENGTH = 1;

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function truncate(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function validateAndNormalize(issue) {
  if (!issue || typeof issue !== 'object') {
    throw new Error('bridge adapter: input must be an object');
  }

  const id = issue.id || null;
  const rawTitle = issue.title || '';
  const rawBody = issue.body || '';
  const rawLabels = Array.isArray(issue.labels) ? issue.labels : [];
  const rawUrl = issue.url || '';

  const title = truncate(sanitize(rawTitle), MAX_TITLE_LENGTH);
  const body = truncate(sanitize(rawBody), MAX_BODY_LENGTH);

  if (!title || title.trim().length === 0) {
    throw new Error('bridge adapter: issue title is required and must be non-empty after sanitization');
  }

  if (!body || body.trim().length < MIN_BODY_LENGTH) {
    throw new Error('bridge adapter: issue body is required and must be non-empty after sanitization');
  }

  const labels = rawLabels.map(l => {
    if (typeof l === 'string') return sanitize(l).trim();
    if (typeof l === 'object' && l.name) return sanitize(String(l.name)).trim();
    return '';
  }).filter(Boolean);

  return {
    source: 'github_issue',
    issue: {
      id: typeof id === 'number' ? id : (id ? parseInt(id, 10) : null),
      title: title.trim(),
      body: body.trim(),
      labels: labels,
      url: sanitize(String(rawUrl)).trim()
    },
    execution: {
      mode: 'standalone',
      requestedAt: new Date().toISOString()
    }
  };
}

function formatForGraph(normalized) {
  return {
    id: normalized.issue.id,
    title: normalized.issue.title,
    slug: (normalized.issue.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80),
    body: normalized.issue.body,
    labels: normalized.issue.labels
  };
}

module.exports = { validateAndNormalize, formatForGraph };

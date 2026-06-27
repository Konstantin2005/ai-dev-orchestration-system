const express = require('express');
const { verifySignature, parseEvent, routeEvent, formatEventSummary } = require('./webhook');

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

function createApp(options = {}) {
  const app = express();
  const webhookSecret = options.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;

  app.use(express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    }
  }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/webhook', async (req, res) => {
    const { event, delivery, signature, id } = parseEvent(req);

    if (!event) {
      return res.status(400).json({ error: 'Missing X-GitHub-Event header' });
    }

    if (!verifySignature(req.rawBody || JSON.stringify(req.body), signature, webhookSecret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    res.status(202).json({ status: 'accepted', event, delivery, id });

    try {
      const result = await routeEvent(event, req.body, {});
      const summary = formatEventSummary(result);
      console.log(`[WEBHOOK] ${event} ${req.body.action} | ${summary}`);
    } catch (err) {
      console.error(`[WEBHOOK] Error processing ${event}: ${err.message}`);
    }
  });

  app.post('/webhook/sync', async (req, res) => {
    const { event, delivery, signature, id } = parseEvent(req);

    if (!event) {
      return res.status(400).json({ error: 'Missing X-GitHub-Event header' });
    }

    if (!verifySignature(req.rawBody || JSON.stringify(req.body), signature, webhookSecret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    try {
      const result = await routeEvent(event, req.body, {});
      res.json({ status: 'processed', event, action: req.body.action, result, id });
    } catch (err) {
      res.status(500).json({ error: err.message, event, id });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found. Use POST /webhook for GitHub webhooks, GET /health for health check.' });
  });

  return app;
}

function startServer(port = DEFAULT_PORT, host = DEFAULT_HOST, options = {}) {
  const app = createApp(options);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`[SERVER] GitHub webhook server listening on http://${host}:${port}`);
      console.log(`[SERVER] Webhook endpoint: POST http://${host}:${port}/webhook`);
      console.log(`[SERVER] Health check: GET http://${host}:${port}/health`);
      resolve(server);
    });

    server.on('error', (err) => {
      console.error(`[SERVER] Failed to start: ${err.message}`);
      reject(err);
    });
  });
}

if (require.main === module) {
  const port = parseInt(process.env.PORT, 10) || DEFAULT_PORT;
  const host = process.env.HOST || DEFAULT_HOST;

  startServer(port, host).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createApp, startServer };

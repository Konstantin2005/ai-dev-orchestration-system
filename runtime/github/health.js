const { version } = require('../../package.json');

function handler(_req, res) {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version
  });
}

module.exports = { handler };

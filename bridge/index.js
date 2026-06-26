const { IssueAdapter } = require('./issue-adapter');
const MapperBridge = require('./mapper/index');

module.exports = {
  IssueAdapter,
  MapperBridge,
  createAdapter: (config) => new IssueAdapter(config)
};

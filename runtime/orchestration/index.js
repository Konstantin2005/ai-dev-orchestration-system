const logger = require('./logger');
const task = require('./task');
const progress = require('./progress');

module.exports = {
  ...logger,
  ...task,
  ...progress
};

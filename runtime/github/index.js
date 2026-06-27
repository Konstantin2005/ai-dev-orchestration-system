const client = require('./client');
const state = require('./state');
const pipeline = require('./pipeline');

module.exports = {
  ...client,
  ...state,
  ...pipeline
};

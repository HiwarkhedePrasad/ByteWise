/**
 * Central export point for all generator modules
 */

const htmlGenerator = require('./htmlGenerator');
const markdownGenerator = require('./markdownGenerator');

module.exports = {
  ...htmlGenerator,
  ...markdownGenerator
};

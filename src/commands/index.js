const { moderationBuilders, publicBuilders, staffBuilders } = require('./builders.js');

module.exports = {
  moderationBuilders,
  publicBuilders,
  staffBuilders,
  all: [...moderationBuilders, ...publicBuilders, ...staffBuilders],
};

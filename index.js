if (!global._babelPolyfill) { require('babel-polyfill'); }

module.exports.localStorage = require('./lib/local_storage');

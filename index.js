if (!global._babelPolyfill) { require('babel-polyfill'); }

module.exports.localStorage = require('./lib/local_storage');
module.exports.minioStorage = require('./lib/minio_storage');
module.exports.s3Storage = require('./lib/s3_storage');

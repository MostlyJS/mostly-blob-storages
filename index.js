if (!global._babelPolyfill) { require('babel-polyfill'); }

module.exports.localStorage = require('./lib/multer/local_storage');
module.exports.minioStorage = require('./lib/multer/minio_storage');
module.exports.s3Storage = require('./lib/multer/s3_storage');

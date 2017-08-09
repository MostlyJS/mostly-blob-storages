if (!global._babelPolyfill) { require('babel-polyfill'); }

module.exports.localStorage = require('./lib/multer/local_storage');
module.exports.localBlobStore = require('./lib/local_blob_store');

module.exports.minioStorage = require('./lib/multer/minio_storage');
module.exports.minioBlobStore = require('./lib/minio_blob_store');
module.exports.serveMinio = require('./lib/express/serve_minio');

module.exports.s3Storage = require('./lib/multer/s3_storage');
module.exports.s3BlobStore = require('./lib/s3_blob_store');

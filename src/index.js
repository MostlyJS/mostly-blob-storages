const localStorage = require('./multer/local_storage');
const localBlobStore = require('./local_blob_store');
const minioStorage = require('./multer/minio_storage');
const minioBlobStore = require('./minio_blob_store');
const serveMinio = require('./express/serve_minio');
const s3Storage = require('./multer/s3_storage');
const s3BlobStore = require('./s3_blob_store');

module.exports = {
  localStorage,
  localBlobStore,
  minioStorage,
  minioBlobStore,
  serveMinio,
  s3Storage,
  s3BlobStore
};
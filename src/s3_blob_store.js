import downloader from 's3-download-stream';
import makeDebug from 'debug';
import mime from 'mime-types';
import uploadStream from 's3-stream-upload';

const debug = makeDebug('mostly:blob-storages:s3-blob-store');

export default class S3BlobStore {
  constructor (opts) {
    if (!(this instanceof S3BlobStore)) return new S3BlobStore(opts);
    opts = opts || {};
    if (!opts.client) throw Error("S3BlobStore client option required (aws-sdk AWS.S3 instance)");
    if (!opts.bucket) throw Error("S3BlobStore bucket option required");
    this.accessKey = opts.accessKey;
    this.secretKey = opts.secretKey;
    this.bucket = opts.bucket;
    this.s3 = opts.client;
  }

  createReadStream (opts) {
    if (typeof opts === 'string') opts = { key: opts };
    var config = { client: this.s3, params: this.downloadParams(opts) };
    var stream = downloader(config);
    // not sure if this a test bug or if I should be doing this in
    // s3-download-stream...
    stream.read(0);
    return stream;
  }

  uploadParams (opts) {
    opts = opts || {};

    var params = opts.params || {};
    var filename = opts.name || opts.filename;
    var key = opts.key || filename;
    var contentType = opts.contentType;

    params.Bucket = params.Bucket || this.bucket;
    params.Key = params.Key || key;

    if (!contentType) {
      contentType = filename? mime.lookup(filename) : mime.lookup(opts.key);
    }
    if (contentType) params.ContentType = contentType;

    return params;
  }

  downloadParams (opts) {
    var params = this.uploadParams(opts);
    delete params.ContentType;
    return params;
  }


  createWriteStream (opts, s3opts, done) {
    if (typeof(s3opts) === 'function') {
      done = s3opts;
      s3opts = {};
    }
    if (typeof opts === 'string') opts = { key: opts };
    var params = this.uploadParams(opts);
    var out = uploadStream(this.s3, params);
    out.on('error', function (err) {
      debug('got err %j', err);
      return done && done(err);
    });
    out.on('finish', function () {
      debug('uploaded');
      done && done(null, { key: params.Key });
    });
    return out;
  }

  remove (opts, done) {
    var key = typeof opts === 'string' ? opts : opts.key;
    this.s3.deleteObject({ Bucket: this.bucket, Key: key }, done);
    return this;
  }

  exists (opts, done) {
    if (typeof opts === 'string') opts = { key: opts };
    this.s3.headObject({ Bucket: this.bucket, Key: opts.key }, function(err, res){
      if (err && err.statusCode === 404) return done(null, false);
      done(err, !err);
    });
  }
}
import assert from 'assert';
import makeDebug from 'debug';
import stream from 'stream';

const debug = makeDebug('mostly:blob-storages:s3-blob-store');

class MinioBlobStore {
  constructor (opts) {
    if (!(this instanceof MinioBlobStore)) return new MinioBlobStore(opts);
    opts = opts || {};

    if (!opts.client) throw Error("MinioBlobStore client option required (minio-js client instance)");
    if (!opts.bucket) throw Error("MinioBlobStore bucket option required");
    
    this.client = opts.client;
    this.bucket = opts.bucket;
  }

  get name () {
    return 'minio';
  }

  createReadStream (opts) {
    let bucket = opts.bucket || this.bucket;

    assert(opts.key, 'opts.key is not provided');
    assert(opts.bucket, 'opts.bucket is not provided');

    let passThrough = new stream.PassThrough()
    this.client.getObject(bucket, opts.key, (err, dataStream) => {
      if (err) return passThrough.emit('error', err);
      dataStream.pipe(passThrough);
    });

    return passThrough;
  }

  createWriteStream (opts, cb) {
    let bucket = opts.bucket || this.bucket;
    cb = cb || function () {};
    
    assert(opts.key, 'opts.key is not provided');
    assert(opts.bucket, 'opts.bucket is not provided');

    let bufferStream = new stream.PassThrough();
    let buffer = new Buffer(0);

    bufferStream.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk], buffer.length + chunk.length)
    });

    bufferStream.on('end', () => {
      this.client.putObject(bucket, opts.key, buffer, (err, etag) => {
        if (err) return cb(err);
        return cb(null, { etag: etag });
      });
    });

    bufferStream.on('error', cb);

    return bufferStream;
  }


  exists (opts, cb) {
    assert(opts.key, 'opts.key is not provided');

    this.client.statObject(this.bucket, opts.key, (err, stat) => {
      if (err) return cb(null, false);
      cb(err, !err);
    });
  }

  remove (opts, cb) {
    assert(opts.key, 'opts.key is not provided');

    this.client.removeObject(this.bucket, opts.key, cb);
  }
}

module.exports = function (opts) {
  return new MinioBlobStore(opts);
};
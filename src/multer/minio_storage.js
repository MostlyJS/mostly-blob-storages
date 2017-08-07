import async from 'async';
import crypto from 'crypto';
import stream from 'stream';
import fileType from 'file-type';
import concat from 'concat-stream';

function staticValue (value) {
  return function (req, file, cb) {
    cb(null, value);
  };
}

function defaultKey (req, file, cb) {
  crypto.pseudoRandomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'));
  });
}

function autoContentType (req, file, cb) {
  file.stream.once('data', function (firstChunk) {
    var type = fileType(firstChunk);
    var mime = (type === null ? 'application/octet-stream' : type.mime);
    var outStream = new stream.PassThrough();

    outStream.write(firstChunk);
    file.stream.pipe(outStream);

    cb(null, mime, outStream);
  });
}

function collect (storage, req, file, cb) {
  async.parallel([
    storage.getRegion.bind(storage, req, file),
    storage.getBucket.bind(storage, req, file),
    storage.getKey.bind(storage, req, file),
  ], function (err, values) {
    if (err) return cb(err);

    storage.getContentType(req, file, function (err, contentType, replacementStream) {
      if (err) return cb(err);

      cb.call(storage, null, {
        region: values[0],
        bucket: values[1],
        key: values[2],
        contentType: contentType,
        replacementStream: replacementStream,
        size: replacementStream && replacementStream.bytesWritten
      });
    });
  });
}

class MinioStorage {
  constructor(opts) {
    switch (typeof opts.minio) {
      case 'object': this.minio = opts.minio; break;
      default: throw new TypeError('Expected opts.minio to be object');
    }
    
    switch (typeof opts.region) {
      case 'string': this.getRegion = opts.region; break;
      case 'undefined': this.getRegion = staticValue(process.env.MINIO_REGION || 'us-west-1'); break;
      default: throw new TypeError('Expected opts.contentType to be undefined or string');
    }

    switch (typeof opts.bucket) {
      case 'function': this.getBucket = opts.bucket; break;
      case 'string': this.getBucket = staticValue(opts.bucket); break;
      case 'undefined': throw new Error('bucket is required');
      default: throw new TypeError('Expected opts.bucket to be string or function');
    }
    
    switch (typeof opts.key) {
      case 'function': this.getKey = opts.key; break;
      case 'undefined': this.getKey = defaultKey; break;
      default: throw new TypeError('Expected opts.key to be function');
    }

    switch (typeof opts.contentType) {
      case 'function': this.getContentType = opts.contentType; break;
      case 'undefined': this.getContentType = staticValue('application/octet-stream'); break;
      default: throw new TypeError('Expected opts.contentType to be undefined or function');
    }
  }

  _handleFile(req, file, cb) {
    collect(this, req, file, (err, opts) => {
      if (err) return cb(err);

      let stream = opts.replacementStream || file.stream;
      stream.pipe(concat(fileBuffer => {
        this.minio.putObject(opts.bucket, opts.key, fileBuffer, function(err, etag) {
          if (err) return cb(err);
          cb(null, {
            bucket: opts.bucket,
            key: opts.key,
            size: opts.size,
            etag: etag
          });
        });
      }));
    });
  }

  _removeFile (req, file, cb) {
    this.minio.removeObject(file.bucket, file.key, function(err) {
      if (err) console.error('Unable to remove object', err);
    });
  }
}

export default function (opts) {
  return new MinioStorage(opts);
}
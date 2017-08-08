import async from 'async';
import stream from 'stream';
import concat from 'concat-stream';
import helpers from '../helpers';

function collect (storage, req, file, cb) {
  async.parallel([
    storage.getRegion.bind(storage, req, file),
    storage.getBucket.bind(storage, req, file),
    storage.getKey.bind(storage, req, file),
  ], function (err, values) {
    if (err) return cb(err);

    storage.getContentType(req, file, function (err, contentType, outStream) {
      if (err) return cb(err);

      cb.call(storage, null, {
        region: values[0],
        bucket: values[1],
        key: values[2],
        contentType: contentType,
        stream: outStream,
        size: outStream && outStream.bytesWritten
      });
    });
  });
}

class MinioStorage {
  constructor(opts) {
    this.minio = helpers.getOption(opts, 'minio', {
      'object': opts.minio
    }, true);

    this.region = helpers.getOption(opts, 'region', {
      'string': opts.region,
      'undefined': helpers.staticValue(process.env.MINIO_REGION || 'us-west-1')
    });

    this.getBucket = helpers.getOption(opts, 'bucket', {
      'function': opts.bucket,
      'string': helpers.staticValue(opts.bucket),
    }, true);
    
    this.getKey = helpers.getOption(opts, 'key', {
      'function': opts.key,
      'undefined': helpers.defaultKey,
    }, true);

    this.getContentType = helpers.getOption(opts, 'contentType', {
      'function': opts.contentType,
      'undefined': helpers.defaultContentType,
    }, true);
  }

  _handleFile(req, file, cb) {
    collect(this, req, file, (err, opts) => {
      if (err) return cb(err);

      let stream = opts.stream || file.stream;
      stream.pipe(concat(fileBuffer => {
        this.minio.putObject(opts.bucket, opts.key, fileBuffer, function(err, etag) {
          if (err) return cb(err);
          cb(null, {
            bucket: opts.bucket,
            key: opts.key,
            contentType: opts.contentType,
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
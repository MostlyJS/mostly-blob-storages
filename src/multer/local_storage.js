import async from 'async';
import concat from 'concat-stream';
import fs from 'fs';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import url from 'url';
import helpers from '../helpers';

function collect (storage, req, file, cb) {
  async.parallel([
    storage.getBucket.bind(storage, req, file),
    storage.getKey.bind(storage, req, file)
  ], function (err, values) {
    if (err) return cb(err);

    storage.getContentType(req, file, (err, contentType, outStream) => {
      if (err) return cb(err);

      cb.call(storage, null, {
        bucket: values[0],
        key: values[1],
        contentType: contentType,
        stream: outStream,
        size: outStream && outStream.bytesWritten
      });
    });
  });
}

class LocalStorage {
  constructor(opts) {
    this.getBucket = helpers.getOption(opts, 'bucket', {
      'function': opts.bucket,
      'string': helpers.staticValue(opts.bucket),
      'undefined': helpers.staticValue(os.tmpdir()),
    }, true);
    
    if (typeof opts.bucket === 'string') {
      mkdirp.sync(opts.bucket);
    }

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

      let finalPath = path.join(opts.bucket, opts.key);
      var outStream = fs.createWriteStream(finalPath);
      var finalUrl = url.resolve(`${req.protocol}://${req.get('host')}`, `${opts.bucket}/${opts.key}`);

      stream.pipe(outStream);
      outStream.on('error', cb);
      outStream.on('finish', function () {
        cb(null, {
          bucket: opts.bucket,
          key: opts.key,
          contentType: opts.contentType,
          size: outStream.bytesWritten,
          url: finalUrl,
        });
      });
    });
  }

  _removeFile (req, file, cb) {
    var path = file.path;

    delete file.destination;
    delete file.filename;
    delete file.path;

    fs.unlink(path, cb);
  }
}

module.exports = function (opts) {
  return new LocalStorage(opts);
};
import async from 'async';
import concat from 'concat-stream';
import fs from 'fs';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import url from 'url';
import { getOption, defaultKey, defaultContentType, staticValue } from '../helpers';

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
  constructor (opts) {
    this.destination = getOption(opts, 'destination', {
      'string': opts.destination,
      'undefined': staticValue(os.tmpdir())
    });

    this.getBucket = getOption(opts, 'bucket', {
      'function': opts.bucket,
      'string': staticValue(opts.bucket),
      'undefined': staticValue(os.tmpdir()),
    }, true);

    this.getKey = getOption(opts, 'key', {
      'function': opts.key,
      'undefined': defaultKey,
    }, true);

    this.getContentType = getOption(opts, 'contentType', {
      'function': opts.contentType,
      'undefined': defaultContentType,
    }, true);

    if (typeof opts.destination === 'string') {
      mkdirp.sync(opts.destination);
    }
  }

  _handleFile (req, file, cb) {
    collect(this, req, file, (err, opts) => {
      if (err) return cb(err);

      let stream = opts.stream || file.stream;

      let finalPath = path.join(this.destination, opts.key);
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
    var path = path.join(this.destination, file.key);

    delete file.bucket;
    delete file.key;

    fs.unlink(path, cb);
  }
}

module.exports = function (opts) {
  return new LocalStorage(opts);
};
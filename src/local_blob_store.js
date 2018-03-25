import assert from 'assert';
import endOf from 'end-of-stream';
import duplexify from 'duplexify';
import fs from 'fs';
import LRU from 'lru-cache';
import mkdirp from 'mkdirp';
import path from 'path';

var listen = function (stream, opts, cb) {
  if (!cb) return stream;
  endOf(stream, function (err) {
    if (err) return cb(err);
    cb(null, opts);
  });
  return stream;
};

class LocalBlobStore {
  constructor (opts = {}) {
    if (!(this instanceof LocalBlobStore)) return new LocalBlobStore(opts);
    if (!opts.path) throw Error("LocalBlobStore path option required");

    this.path = opts.path;
    this.cache = LRU(opts.cache || 100);
  }

  get name () {
    return 'local';
  }

  createReadStream (opts) {
    assert(opts.key, 'opts.key is not provided');

    var key = path.join(this.path, opts.key);
    return fs.createReadStream(key, opts);
  }

  createWriteStream (opts, cb) {
    assert(opts.key, 'opts.key is not provided');

    var key = path.join(this.path, opts.key);
    var dir = path.dirname(key);
    var cache = this.cache;

    if (cache.get(dir)) {
      return listen(fs.createWriteStream(key, opts), opts, cb);
    } else {
      var proxy = listen(duplexify(), opts, cb);

      proxy.setReadable(false);

      mkdirp(dir, function (err) {
        if (proxy.destroyed) return;
        if (err) return proxy.destroy(err);
        cache.set(dir, true);
        proxy.setWritable(fs.createWriteStream(key, opts));
      });

      return proxy;
    }
  }

  exists (opts, cb) {
    assert(opts.key, 'opts.key is not provided');

    var key = path.join(this.path, opts.key);
    fs.stat(key, function (err, stat) {
      if (err && err.code !== 'ENOENT') return cb(err);
      cb(null, !!stat);
    });
  }

  remove (opts, cb) {
    assert(opts.key, 'opts.key is not provided');

    var key = path.join(this.path, opts.key);
    fs.unlink(key, function (err) {
      if (err && err.code !== 'ENOENT') return cb(err);
      cb();
    });
  }
}

export default function (opts) {
  return new LocalBlobStore(opts);
}
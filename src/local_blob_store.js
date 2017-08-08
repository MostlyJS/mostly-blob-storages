import mkdirp from 'mkdirp';
import LRU from 'lru-cache';
import endOf from 'end-of-stream';
import duplexify from 'duplexify';
import path from 'path';
import fs from 'fs';

var noop = function() {};

var join = function(root, dir) {
  return path.join(root, path.resolve('/', dir).replace(/^[a-zA-Z]:/, ''));
};

var listen = function(stream, opts, cb) {
  if (!cb) return stream;
  endOf(stream, function(err) {
    if (err) return cb(err);
    cb(null, opts);
  });
  return stream;
};

export default class LocalBlobStore {
  constructor (opts) {
    if (!(this instanceof LocalBlobStore)) return new LocalBlobStore(opts);
    if (typeof opts === 'string') opts = { path: opts };

    this.path = opts.path;
    this.cache = LRU(opts.cache || 100);
  }

  createWriteStream (opts, cb) {
    if (typeof opts === 'string') opts = { key: opts };
    if (opts.name && !opts.key) opts.key = opts.name;

    var key = join(this.path, opts.key);
    var dir = path.dirname(key);
    var cache = this.cache;

    if (cache.get(dir)) return listen(fs.createWriteStream(key, opts), opts, cb);

    var proxy = listen(duplexify(), opts, cb);

    proxy.setReadable(false);

    mkdirp(dir, function(err) {
      if (proxy.destroyed) return;
      if (err) return proxy.destroy(err);
      cache.set(dir, true);
      proxy.setWritable(fs.createWriteStream(key, opts));
    });

    return proxy;
  }

  createReadStream (key, opts) {
    if (key && typeof key === 'object') return this.createReadStream(key.key, key);
    return fs.createReadStream(join(this.path, key), opts);
  }

  exists (opts, cb) {
    if (typeof opts === 'string') opts = {key:opts};
    var key = join(this.path, opts.key);
    fs.stat(key, function(err, stat) {
      if (err && err.code !== 'ENOENT') return cb(err);
      cb(null, !!stat);
    });
  }

  remove (opts, cb) {
    if (typeof opts === 'string') opts = {key:opts};
    if (!opts) opts = noop;
    var key = join(this.path, opts.key);
    fs.unlink(key, function(err) {
      if (err && err.code !== 'ENOENT') return cb(err);
      cb();
    });
  }
}
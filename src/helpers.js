import crypto from 'crypto';
import stream from 'stream';
import fileType from 'file-type';

export function staticValue (value) {
  return function (req, file, cb) {
    cb(null, value);
  };
}

export function defaultKey (req, file, cb) {
  crypto.pseudoRandomBytes(16, function (err, raw) {
    cb(err, err? undefined : raw.toString('hex'));
  });
}

export const defaultContentType = staticValue('application/octet-stream');

export function autoContentType (req, file, cb) {
  file.stream.once('data', function (firstChunk) {
    var type = fileType(firstChunk);
    var mime = (type === null? 'application/octet-stream' : type.mime);
    var outStream = new stream.PassThrough();

    outStream.write(firstChunk);
    file.stream.pipe(outStream);

    cb(null, mime, outStream);
  });
}

export function getOption (opts, path, defaults, required = false) {
  const type = typeof opts[path];
  if (defaults[type]) {
    return defaults[type];
  }
  if (!required) {
    return null;
  } else {
    throw new TypeError(`Expected opts.${path} to be ` + Object.keys(defaults).join(' or '));
  }
}

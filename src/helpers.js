const crypto = require('crypto');
const stream = require('stream');
const fileType = require('file-type');

function staticValue (value) {
  return function (req, file, cb) {
    cb(null, value);
  };
}

function defaultKey (req, file, cb) {
  crypto.pseudoRandomBytes(16, function (err, raw) {
    cb(err, err? undefined : raw.toString('hex'));
  });
}

const defaultContentType = staticValue('application/octet-stream');

function autoContentType (req, file, cb) {
  file.stream.once('data', function (firstChunk) {
    var type = fileType(firstChunk);
    var mime = (type === null? 'application/octet-stream' : type.mime);
    var outStream = new stream.PassThrough();

    outStream.write(firstChunk);
    file.stream.pipe(outStream);

    cb(null, mime, outStream);
  });
}

function getOption (opts, path, defaults, required = false) {
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

module.exports = {
  staticValue,
  defaultKey,
  defaultContentType,
  autoContentType,
  getOption
};

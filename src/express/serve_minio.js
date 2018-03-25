import parseUrl from 'parseurl';

export default function (client, opts) {
  opts = opts || {};
  if (!client) throw Error("serve-minio client option required (minio-js client instance)");
  if (!opts.bucket) throw Error("serve-minio bucket option required");

  return function serveMinio (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // method not allowed
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Content-Length', '0');
      res.end();
      return;
    }

    let originalUrl = parseUrl.original(req);
    let path = parseUrl(req).pathname;

    if (path.startsWith('/')) {
      path = path.substr(1);
    }

    client.getObject(opts.bucket, path, function (error, stream) {
      if (error) {
        let status = error.code === 'NoSuchKey'? 404 : 500;
        return res.status(status).send(error);
      }
      stream.pipe(res);
    });
  };
}
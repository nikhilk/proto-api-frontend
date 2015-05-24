var qs = require('querystring'),
    url = require('url');

function qsParserMiddleware(req, res, next) {
  if (!req.query) {
    req.query = ~req.url.indexOf('?') ? qs.parse(url.parse(req.url).query) : {};
  }

  next();
}

exports.parser = function() {
  return qsParserMiddleware;
}


var url = require('url');

function projectRewriter(request, response, next) {
  var parsedUrl = url.parse(request.url);
  if (parsedUrl.pathname == '/auth') {
    next();
    return;
  }

  var pathSegments = parsedUrl.pathname.split('/');
  if (pathSegments < 2) {
    response.status(400);
    response.send('Missing project in request URL.');
    response.end();
    return;
  }

  parsedUrl.pathname = '/' + pathSegments.slice(2).join('/');

  request.url = url.format(parsedUrl);
  request.project = pathSegments[1];
  next();
}

exports.rewritter = function() {
  return projectRewriter;
}

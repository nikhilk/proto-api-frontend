var express = require('express'),
    http = require('http'),
    util = require('util');

function contentForwarder(request, response) {
  request.headers['Authorization'] = request.cookies.auth;
  return '/content' + request.path;
}

function createUser(accessToken, refreshToken) {
  return {
    accessToken: accessToken,
    refreshToken: refreshToken
  };
}

function defaultHandler(request, response) {
  var homePath = util.format('/%s/home.html', request.project);

  response.redirect(302, homePath);
  response.end();
}


function main(port) {
  var apiDomain = process.env.API_HOST + ':' + process.env.API_PORT;

  var authConfig = {
    registration: require('./secrets.json').web,
    scopes: [ 'https://www.googleapis.com/auth/cloud-platform' ],
    user: createUser
  };

  var contentProxy = {
    forwardPath: contentForwarder
  };

  var router = express.Router();
  router.get('/', defaultHandler);

  var app = express();
  app.use(require('cookie-parser')())
     .use(require('body-parser').json())
     .use(require('./middleware/queryparser').parser())
     .use(require('./middleware/oauth').authenticator(authConfig))
     .use(require('./middleware/project').rewritter())
     .use(require('./middleware/apicookie').decorator(apiDomain))
     .use('/content', require('express-http-proxy')(apiDomain, contentProxy))
     .use(router)
     .use(express.static('static'))

  var server = http.createServer(app);
  server.listen(parseInt(process.env.SRV_PORT), process.env.SRV_HOST);
}

main();

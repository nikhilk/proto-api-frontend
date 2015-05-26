var fs = require('fs'),
    http = require('http');
var express = require('express'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    jwt = require('jwt-simple');

var corsPolicy = {
  origin: process.env.SRV_ADDR
};

function requireAuthorization(request, response, next) {
  var authorized = false;

  var auth = request.headers['authorization'];
  if (auth) {
    try {
      request.user = jwt.decode(auth, process.env.API_SECRET);

      // TODO - More authorization logic
      // 1. Check the project in authData matches
      // 2. Use the userid to do a DataStore lookup for an entity of kind [app]creds and with a
      //    key matching userid for access token and refresh token

      authorized = true;
    }
    catch(e) {
    }

    if (!authorized) {
      response.status(401);
      response.end();
      return;
    }
  }

  next();
}

function addApiDomainCookie(request, response, next) {
  response.cookie('apidomain', process.env.API_ADDR);
  next();
}

function dataHandler(request, response) {
  var result = {
    data: request.body,
    user: request.user
  };

  response.json(result);
  response.end();
}

function createApplication() {
  var app = express();
  app.use(cors(corsPolicy));
  app.use(bodyParser.json());

  app.use('/content', requireAuthorization, addApiDomainCookie, express.static('.'));
  app.post('/api/data', requireAuthorization, dataHandler);

  return app;
}

function main(port) {
  var app = createApplication();
  var server = http.createServer(app);

  server.listen(parseInt(process.env.API_PORT), process.env.API_HOST);
}

main();

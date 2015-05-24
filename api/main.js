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
      var authData = jwt.decode(auth, process.env.API_SECRET);
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

function dataHandler(request, response) {
  response.json(request.body);
  response.end();
}

function createApplication() {
  var app = express();
  app.use(cors(corsPolicy));
  app.use(bodyParser.json());

  app.use('/content', requireAuthorization, express.static('.'));
  app.post('/api/data', requireAuthorization, dataHandler);

  return app;
}

function main(port) {
  var app = createApplication();
  var server = http.createServer(app);

  server.listen(parseInt(process.env.API_PORT), process.env.API_HOST);
}

main();


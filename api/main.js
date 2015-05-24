var fs = require('fs'),
    http = require('http');
var express = require('express'),
    bodyParser = require('body-parser');

var API_PORT = 3976;

function dataHandler(request, response) {
  response.json(request.body);
  response.end();
}

function createApplication() {
  var app = express();
  app.use(bodyParser.json());
  app.use('/content', express.static('.'));

  app.post('/api/data', dataHandler);

  return app;
}

function main(port) {
  var app = createApplication();
  var server = http.createServer(app);

  server.listen(API_PORT, '127.0.0.1');
}

main();


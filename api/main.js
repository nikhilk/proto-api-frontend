var fs = require('fs'),
    http = require('http');
var express = require('express'),
    bodyParser = require('body-parser'),
    cors = require('cors');

var corsPolicy = {
  origin: process.env.SRV_ADDR
};

function dataHandler(request, response) {
  response.json(request.body);
  response.end();
}

function createApplication() {
  var app = express();
  app.use(cors(corsPolicy));
  app.use(bodyParser.json());
  app.use('/content', express.static('.'));

  app.post('/api/data', dataHandler);

  return app;
}

function main(port) {
  var app = createApplication();
  var server = http.createServer(app);

  server.listen(parseInt(process.env.API_PORT), process.env.API_HOST);
}

main();


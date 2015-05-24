var fs = require('fs'),
    http = require('http'),
    url = require('url');
var express = require('express'),
    bodyParser = require('body-parser'),
    proxy = require('express-http-proxy');

var apiDomain = process.env.API_HOST + ':' + process.env.API_PORT;

var contentProxy = {
  forwardPath: function(request, response) {
    return '/content' + url.parse(request.url).path;
  },
  intercept: function(response, data, incomingRequest, outgoingResponse,
                      callback) {
    outgoingResponse.cookie('api', apiDomain);
    callback(null, data);
  }
};

function createApplication() {
  var app = express();
  app.use(bodyParser.json());
  app.use('/content', proxy(apiDomain, contentProxy));

  return app;
}

function main(port) {
  var app = createApplication();
  var server = http.createServer(app);

  server.listen(parseInt(process.env.SRV_PORT), process.env.SRV_HOST);
}

main();


var fs = require('fs'),
    http = require('http'),
    qs = require('querystring'),
    url = require('url');
var express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    queryParser = require('./middleware/queryparser'),
    proxy = require('express-http-proxy'),
    httpClient = require('request'),
    jwt = require('jwt-simple');

var secrets = require('./secrets.json');
var apiDomain = process.env.API_HOST + ':' + process.env.API_PORT;

var contentProxy = {
  forwardPath: function(request, response) {
    request.headers['Authorization'] = request.cookies.auth;
    return '/content' + url.parse(request.url).path;
  },
  intercept: function(response, data, incomingRequest, outgoingResponse,
                      callback) {
    outgoingResponse.cookie('api', apiDomain);
    callback(null, data);
  }
};

function rootHandler(request, response) {
  if (!request.query.project) {
    response.status(400);
    response.send('Missing project parameter in request URL.');
    response.end();
    return;
  }

  if (request.cookies.auth && (request.query.auth === undefined)) {
    response.redirect(302, '/content/page.html');
    /*
    response.set({
      'Content-Type': 'text/plain'
    });
    response.send(request.cookies.auth);
    */
    response.end();
    return;
  }

  var state = {
    project: request.query.project
  };
  var authParams = {
    access_type: 'offline',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    redirect_uri: secrets.web.redirect_uris[0],
    approval_prompt: 'force',
    state: JSON.stringify(state),
    client_id: secrets.web.client_id
  };

  var authURL = secrets.web.auth_uri + '?' + qs.stringify(authParams);

  response.redirect(authURL);
  response.end();
}

function authHandler(request, response) {
  if (!request.query.code || !request.query.state) {
    response.status(400);
    response.end();
    return;
  }

  var state = JSON.parse(request.query.state);
  var authData = {
    code: request.query.code,
    client_id: secrets.web.client_id,
    client_secret: secrets.web.client_secret,
    redirect_uri: secrets.web.redirect_uris[0],
    grant_type: 'authorization_code'
  };

  httpClient.post(secrets.web.token_uri, { form: authData, json: true },
    function(e, tokenResponse, body) {
      if (!e && (tokenResponse.statusCode == 200)) {
        var authCookie = state.project + ':' +
                         body.access_token + ':' + body.refresh_token;
        authCookie = jwt.encode(authCookie, process.env.API_SECRET);
        response.cookie('auth', authCookie);
      }

      response.redirect(302, '/?project=' + state.project);
      response.end();
    });
}


function createApplication() {
  var app = express();
  app.use(queryParser.parser());
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use('/content', proxy(apiDomain, contentProxy));

  app.get('/', rootHandler);
  app.get('/auth', authHandler);

  return app;
}


function main(port) {
  var app = createApplication();
  var server = http.createServer(app);

  server.listen(parseInt(process.env.SRV_PORT), process.env.SRV_HOST);
}

main();


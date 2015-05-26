var express = require('express'),
    http = require('http'),
    jwt = require('jwt-simple'),
    util = require('util');

function proxyFilter(request, response) {
  return request.method == 'GET';
}

function proxyRule(request, response) {
  request.headers['Authorization'] = request.cookies.apiauth;
  return '/content' + request.path;
}

function proxyForwarding(request) {
  // Don't forward cookies associated with this server to the API server
  request.headers['cookie'] = '';
}

function authenticatingHandler(request) {
  return {
    project: request.project,
    url: '/' + request.project
  };
}

function authenticatedHandler(response, state, userInfo, accessToken, refreshToken) {
  // 1. Check this app's DataStore for a shared secret for the user's project
  //    (kind = [app]vm_secrets, key = project)
  //    - if it doesn't exist, create a random uuid as the shared secret
  //
  // 2. Authorize the user against the project in state.project (and as a side-effect,
  //    create the API VM)
  //    - if the VM exists in the project, get/set metadata on it to ensure membership
  //    - if not, create the VM, and set its metadata to contain the shared secret
  //    TODO: Figure out faster/better way to authorize, so we can return without actual
  //          VM creation, so we can do that in the background, and in the future not
  //          be predicated on an API VM existing.
  //
  // 3. Create an entry in the project's DataStore (kind = [app]creds, key = user id, data = tokens)
  //    This may actually suffice as an authorization check, that can replace #2 above.
  //
  // All the above needs to be done, but beyond the scope of the prototype.

  var user = {
    project: state.project,
    userid: userInfo.email
  };

  var apiCookie = jwt.encode(user, process.env.SHARED_SECRET);
  response.cookie('apiauth', apiCookie);

  return user;
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
    authenticating: authenticatingHandler,
    authenticated: authenticatedHandler
  };

  var contentProxy = {
    filter: proxyFilter,
    forwardPath: proxyRule,
    decorateRequest: proxyForwarding
  };

  var router = express.Router();
  router.get('/', defaultHandler);

  var app = express();
  app.use(require('cookie-parser')())
     .use(require('body-parser').json())
     .use(require('./middleware/queryparser').parser())
     .use(require('./middleware/project').rewritter())
     .use(require('./middleware/oauth').authenticator(authConfig))
     .use('/content', require('express-http-proxy')(apiDomain, contentProxy))
     .use(router)
     .use(express.static('static'))

  var server = http.createServer(app);
  server.listen(parseInt(process.env.SRV_PORT), process.env.SRV_HOST);
}

main();

var express = require('express'),
    http = require('http'),
    jwt = require('jwt-simple'),
    util = require('util');

// Determines which requests are forwardable to the API server.
function proxyFilter(request, response) {
  // The only expected content retrieved by the API server are
  // the individual content pages that are navigated to by the browser, hence the check for
  // 'GET' requests.
  return request.method == 'GET';
}

// Produces the path to forward requests to as part of the proxying implementation.
function proxyRule(request, response) {
  // Include the value of the APIAuth cookie as the Authorization header.
  // The API server requires this header on all requests to it.
  request.headers['Authorization'] = request.cookies.apiauth;

  // For each request path being forward, the expectation is the API server
  // serves it using the equivalent path under the /content root.
  return '/content' + request.path;
}

// Intercepts the outgoing proxy requests.
function proxyForwarding(request) {
  // Don't forward cookies associated with this server to the API server.
  request.headers['cookie'] = '';
}

// Customizes the OAuth flow that is starting.
function authenticatingHandler(request) {
  // Produce the state that will be tracked as part of the OAuth flow.
  return {
    project: request.project,
    url: '/' + request.project
  };
}

// Customizes the OAuth flow that has successfully completed.
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

  // Produce the API cookie to contain the authorization header that client can use
  // to issue requests to APIs directly.
  var apiCookie = jwt.encode(user, process.env.SHARED_SECRET);
  response.cookie('apiauth', apiCookie);

  // Produce the user object that will be tracked as a cookie.
  return user;
}

// Implements the handler for the '/' path.
function defaultHandler(request, response) {
  // Simply redirect to the 'home.html' path, while preserving the project root.
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

  // Create an application with the following behavior:
  // - all paths are considered to be project prefixed. The project middleware
  //   extracts the project and stashes it on the request, rewrites the request url. If no
  //   project can be inferred, the request processing is ended with a 400 status.
  // - all requests must be associated with a user, and if no user information is available
  //   then an OAuth flow is triggered by the oauth middleware.
  // - all requests under /content are proxied to the API server.
  // - all other requests are attempted to be served using static files.
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

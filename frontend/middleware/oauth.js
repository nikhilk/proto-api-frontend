var httpClient = require('request'),
    jwt = require('jwt-simple'),
    qs = require('querystring'),
    url = require('url');

exports.authenticator = function(config) {
  var callbackPath = url.parse(config.registration.redirect_uris[0]).pathname;

  function callbackHandler(request, response) {
    if (!request.query.code || !request.query.state) {
      response.status(400);
      response.end();
      return;
    }

    var authData = {
      client_id: config.registration.client_id,
      client_secret: config.registration.client_secret,
      redirect_uri: config.registration.redirect_uris[0],
      grant_type: 'authorization_code',
      code: request.query.code
    };

    httpClient.post(config.registration.token_uri, { form: authData, json: true },
      function(e, tokenResponse, body) {
        if (!e && (tokenResponse.statusCode == 200)) {
          var user = config.user(body.access_token, body.refresh_token);

          var authCookie = jwt.encode(JSON.stringify(user), process.env.API_SECRET);
          response.cookie('auth', authCookie, { httpOnly: true });
        }

        response.redirect(302, request.query.state || '/');
        response.end();
      });
  }

  function oauthMiddleware(request, response, next) {
    if (request.path == callbackPath) {
      callbackHandler(request, response);
      return;
    }

    if (request.cookies.auth && (request.query.auth === undefined)) {
      // Auth cookie exists, let the request through unless the URL contains
      // a auth param to force the auth flow.

      try {
        var userData = jwt.decode(request.cookies.auth, process.env.API_SECRET);
        request.user = JSON.parse(userData);
      }
      catch(e) {
      }

      if (request.user) {
        next();
        return;
      }
    }

    // Unauthenticated request, so trigger the oauth flow

    var authParams = {
      client_id: config.registration.client_id,
      access_type: 'offline',
      approval_prompt: 'force',
      response_type: 'code',
      scope: config.scopes.join(' '),
      redirect_uri: config.registration.redirect_uris[0],
      state: request.url
    };

    var authURL = config.registration.auth_uri + '?' + qs.stringify(authParams);
    response.redirect(authURL);
    response.end();
  }

  return oauthMiddleware;
}

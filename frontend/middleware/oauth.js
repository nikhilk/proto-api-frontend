var httpClient = require('request'),
    jwt = require('jwt-simple'),
    qs = require('querystring'),
    url = require('url');

exports.authenticator = function(config) {
  var callbackPath = url.parse(config.registration.redirect_uris[0]).pathname;

  function tokenRequest(code, failCallback, successCallback) {
    var authData = {
      client_id: config.registration.client_id,
      client_secret: config.registration.client_secret,
      redirect_uri: config.registration.redirect_uris[0],
      grant_type: 'authorization_code',
      code: code
    };

    httpClient.post(config.registration.token_uri, { form: authData, json: true },
      function(e, response, body) {
        if (e || (response.statusCode != 200)) {
          failCallback();
        }
        else {
          successCallback(body);
        }
      });
  }

  function userInfoRequest(accessToken, failCallback, successCallback) {
    var url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';

    var authData = {
      'bearer': accessToken
    };
    httpClient.get(url, { auth: authData, json: true }, function(e, response, body) {
      if (e || (response.statusCode != 200)) {
        failCallback();
      }
      else {
        successCallback(body);
      }
    });
  }

  function callbackHandler(request, response) {
    if (!request.query.code || !request.query.state) {
      response.status(400);
      response.end();
      return;
    }

    var state = JSON.parse(request.query.state);

    function resume() {
      response.redirect(302, state.url);
      response.end();
    }

    tokenRequest(request.query.code, resume, function(tokens) {
      userInfoRequest(tokens.access_token, resume, function(userInfo) {
        var user = config.authenticated(response,
                                        state, userInfo, tokens.access_token, tokens.refresh_token);

        var authCookie = jwt.encode(user, process.env.SRV_SECRET);
        response.cookie('auth', authCookie, { httpOnly: true });

        resume();
      });
    })
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
        request.user = jwt.decode(request.cookies.auth, process.env.SRV_SECRET);
      }
      catch(e) {
      }

      if (request.user) {
        next();
        return;
      }
    }

    // Unauthenticated request, so trigger the oauth flow

    var state = config.authenticating(request);

    var authParams = {
      client_id: config.registration.client_id,
      access_type: 'offline',
      approval_prompt: 'force',
      response_type: 'code',
      scope: config.scopes.concat('https://www.googleapis.com/auth/userinfo.email').join(' '),
      redirect_uri: config.registration.redirect_uris[0],
      state: JSON.stringify(state)
    };

    var authURL = config.registration.auth_uri + '?' + qs.stringify(authParams);
    response.redirect(authURL);
    response.end();
  }

  return oauthMiddleware;
}

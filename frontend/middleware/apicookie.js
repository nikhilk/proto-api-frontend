exports.decorator = function(apiDomain) {
  function apiCookieDecorator(request, response, next) {
    // TODO: auth needs to be something other than the auth cookie
    var api = {
      domain: apiDomain,
      auth: request.cookies.auth
    };

    response.cookie('api', JSON.stringify(api));
    next();
  }

  return apiCookieDecorator;
}

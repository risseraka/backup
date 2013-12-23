var oauth2orize = require('oauth2orize');
var login = require('connect-ensure-login');
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uid(len) {
  var buf = []
  , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  , charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

module.exports = function (app, passport, User) {

  var codes = {};

  function AuthorizationCode(code, clientId, redirectURI, userId, scope) {
    var authCode = {
      code: code,
      clientId: clientId,
      redirectURI: redirectURI,
      userId: userId,
      scope: scope
    };

    authCode.save = AuthorizationCode.prototype.save.bind(this, authCode);

    return authCode;
  };

  AuthorizationCode.prototype.save = function (authCode, done) {
    codes[authCode.code] = authCode;

    done(null, authCode);
  };

  AuthorizationCode.findOne = function (code, done) {
    done(null, codes[code]);
  };

  var accessTokens = {};

  function AccessToken(token, userId, clientId, scope) {
    var accessToken = {
      token: token,
      userId: userId,
      clientId: clientId,
      scope: scope
    };

    accessToken.save = AccessToken.prototype.save.bind(this, accessToken);

    return accessToken;
  };

  AccessToken.prototype.save = function (accessToken, done) {
    accessTokens[accessToken.token] = accessToken;

    done(null, accessToken);
  };

  AccessToken.findOne = function (token, done) {
    done(null, accessTokens[token]);
  };

  var clients = {
    1: {
      id: '1',
      name: 'my appli',
      secret: 'secret',
      redirectURI: 'https://localhost.com/token?client_id=1&client_secret=secret&grant_type=authorization_code'
    }
  };

  function Client(token, userId, clientId, scope) {
    var client = {
      token: token,
      userId: userId,
      clientId: clientId,
      scope: scope
    };

    client.save = Client.prototype.save.bind(this, client);
  };

  Client.prototype.save = function (client, done) {
    clients[client.token] = client;

    done(null, client);
  };

  Client.findOne = function (id, done) {
    done(null, clients[id]);
  };

  passport.use(new ClientPasswordStrategy(
    function(clientId, clientSecret, done) {
      Client.findOne(clientId, function (err, client) {
        if (err) { return done(err); }
        if (!client) { return done(null, false); }
        if (client.secret !== clientSecret) { return done(null, false); }

        return done(null, client);
      });
    }
  ));

  passport.use(new BearerStrategy(
    function(accessToken, done) {
      AccessToken.findOne(accessToken, function(err, token) {
	if (err) { return done(err); }
	if (!token) { return done(null, false); }

	User.findById(token.userId, function(err, user) {
	  if (err) { return done(err); }
	  if (!user) { return done(null, false); }

	  // to keep this example simple, restricted scopes are not implemented,
	  // and this is just for illustrative purposes
	  var info = { scope: '*' };

	  done(null, user, info);
	});
      });
    }
  ));

  /**
   * Oauth2orize setup
   */
  var server = oauth2orize.createServer();

  server.serializeClient(function(client, done) {
    return done(null, client.id);
  });

  server.deserializeClient(function(id, done) {
    Client.findOne(id, function(err, client) {
      if (err) { return done(err); }

      return done(null, client);
    });
  });

  server.grant(
    oauth2orize.grant.code(function(client, redirectURI, user, ares, done) {
      var code = uid(16);

      var ac = new AuthorizationCode(code, client.id, redirectURI, user.id, ares.scope);
      ac.save(function(err) {
        if (err) { return done(err); }

        return done(null, code);
      });
    })
  );

  server.exchange(
    oauth2orize.exchange.code(function(client, code, redirectURI, done) {
      AuthorizationCode.findOne(code, function(err, code) {
        if (err) { return done(err); }
        if (!code) { return done(new Error('no such authentication code')); }

	if (client.id !== code.clientId) { return done(null, false); }
        if (redirectURI !== code.redirectUri) { return done(null, false); }

        var token = uid(256);
        var at = new AccessToken(token, code.userId, code.clientId, code.scope);
        at.save(function(err) {
          if (err) { return done(err); }

          return done(null, token);
        });
      });
    })
  );

  /**
   * Oauth routes
   */

  app.get(
    '/authorize',
    login.ensureLoggedIn(),
    server.authorize(function(clientId, redirectURI, done) {
      console.log('/authorize');

      Client.findOne(clientId, function(err, client) {
	console.log(arguments);

        if (err) { return done(err); }
        if (!client) { return done(null, false); }
        if (client.redirectURI !== redirectURI) { return done(null, false); }

        return done(null, client, redirectURI);
      });
    }),
    function(req, res) {
      console.log(req.oauth2.client);

      res.render(
        'dialog',
        {
          transactionID: req.oauth2.transactionID,
          user: req.user,
          client: req.oauth2.client
        }
      );
    }
  );

  app.post(
    '/authorize/decision',
    login.ensureLoggedIn(),
    server.decision()
  );

  app.get(
    '/token',
    function (req, res, next) {
      req.body = req.query;

      passport.authenticate('oauth2-client-password', { session: false })(req, res, next);
    },
    function (req, res, next) {
      req.body = req.query;

      server.token()(req, res, next);
    }
    //        server.errorHandler()
  );

  app.get(
    '/api/userinfo',
    passport.authenticate('bearer', { session: false }),
    function(req, res) {
      res.json(req.user);
    }
  );

};

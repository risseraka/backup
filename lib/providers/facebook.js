module.exports = function (app, passport, Providers, keys) {

  /**
   * Facebook config
   */

  var provider = 'facebook';

  var baseURL = 'https://localhost.com';
  var callbackPath = '/' + provider + '/callback';
  var authenticationPath = '/' + provider;
  var logoutPath = '/' + provider + '/logout';

  var callbackURL = baseURL + callbackPath;

  var scope = ['email', 'user_status'];

  /**
   * Facebook Passport setup
   */

  var FacebookStrategy = require('passport-facebook');
  passport.use(
    new FacebookStrategy(
      {
        clientID: keys.clientId,
        clientSecret: keys.clientSecret,
        callbackURL: callbackURL
      },
      function (accessToken, refreshToken, profile, done) {
        profile.tokens = {
          accessToken: accessToken,
          refreshToken: refreshToken
        };

        return done(null, profile);
      }
    )
  );

  /**
   * Facebook Express routes
   */

  app.get(
    callbackPath,
    Providers.ensure[provider].non.Authentication,
    Providers.authenticate(provider)
  );

  app.get(
    authenticationPath,
    Providers.ensure[provider].non.Authentication,
    passport.authenticate(provider, { scope: scope })
  );

  app.get(
    logoutPath,
    Providers.ensure[provider].Authentication,
    Providers.deauthenticate(provider)
  );

};

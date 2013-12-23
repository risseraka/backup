module.exports = function (app, passport, Providers, keys) {

    /**
     * Google config
     */

    var provider = 'google';

    var baseURL = 'https://localhost.com';
    var callbackPath = '/' + provider + '/callback';
    var authenticationPath = '/' + provider;

    var callbackURL = baseURL + callbackPath;

    var scope = 'profile email https://www.googleapis.com/auth/plus.login';

    /**
     * Google Passport setup
     */

    var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
    passport.use(
        new GoogleStrategy(
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
     * Google Express routes
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

};

module.exports = function (app, passport, Providers, keys) {

    /**
     * Twitter config
     */

    var provider = 'twitter';

    var baseURL = 'https://localhost.com';
    var callbackPath = '/' + provider + '/callback';
    var authenticationPath = '/' + provider;
    var logoutPath = '/' + provider + '/logout';

    var callbackURL = baseURL + callbackPath;

    /**
     * Twitter Passport setup
     */

    var TwitterStrategy = require('passport-twitter');
    passport.use(
        new TwitterStrategy(
            {
                consumerKey: keys.consumerKey,
                consumerSecret: keys.consumerSecret,
                callbackURL: callbackURL
            },
            function (token, tokenSecret, profile, done) {
                profile.tokens = {
                    accessToken: token,
                    accessTokenSecret: tokenSecret
                };

                return done(null, profile);
            }
        )
    );

    /**
     * Twitter Express authentication routes
     */

    app.get(
        callbackPath,
        Providers.ensure[provider].non.Authentication,
        Providers.authenticate(provider)
    );

    app.get(
        authenticationPath,
        Providers.ensure[provider].non.Authentication,
        passport.authenticate(provider)
    );

    app.get(
        logoutPath,
        Providers.ensure[provider].Authentication,
        Providers.deauthenticate(provider)
    );

};

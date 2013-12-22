module.exports = function (app, passport, Providers, keys) {

    /**
     * Twitter config
     */

    var baseURL = 'https://localhost.com';
    var callbackPath = '/' + 'twitter' + '/callback';
    var authenticationPath = '/' + 'twitter';

    var provider = 'twitter';

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

};

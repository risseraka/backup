var fs = require('fs');
var http = require('http');
var https = require('https');

var privateKey  = fs.readFileSync('sslcert/ca.key', 'utf8');
var certificate = fs.readFileSync('sslcert/ca.crt', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var express = require('express');
var app = express();

var passport = require('passport');
var FacebookStrategy = require('passport-facebook');
var TwitterStrategy = require('passport-twitter');

var fb = {
    clientId: '92601131724',
    clientSecret: 'd14f54eb8013c4604687225fc905e160'
};

var tw = {
    consumerKey: 'XDhPOfEgvAfzFUPUWHhQ',
    consumerSecret: 'dUT9wdqV0neYu93qsQE79Ny8JzY6blK8BoVb1mfeDBM'
};

var fbgraph = require('fbgraph');
var Twit = require('twit');
var twitapi = new Twit({
    consumer_key: tw.consumerKey,
    consumer_secret: tw.consumerSecret,
    access_token: ' ',
    access_token_secret: ' '
});

app.configure(function() {
    app.use(express.static('public'));
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.session({ secret: 'keyboard cat' }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
});

var User = require('./providers');

/**
 * Passport setup
 */
var facebookStrategy = new FacebookStrategy(
    {
        clientID: fb.clientId,
        clientSecret: fb.clientSecret,
        callbackURL: "https://localhost.com/facebook/callback"
    },
    function (accessToken, refreshToken, profile, done) {
        profile.tokens = {
            accessToken: accessToken,
            refreshToken: refreshToken
        };

        return done(null, profile);
    }
);

var twitterStrategy = new TwitterStrategy(
    {
        consumerKey: tw.consumerKey,
        consumerSecret: tw.consumerSecret,
        callbackURL: "https://localhost.com/twitter/callback"
    },
    function (token, tokenSecret, profile, done) {
        profile.tokens = {
            accessToken: token,
            accessTokenSecret: tokenSecret
        };

        return done(null, profile);
    }
);

passport.use(facebookStrategy);
passport.use(twitterStrategy);

passport.serializeUser(function serializeUser(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function deserializeUser(id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

function ensureAuthentication(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
}

function authenticateProvider(provider) {
    return function (req, res, next) {
        passport.authenticate(provider, function (err, profile, info) {
            if (err) {
                return next(err);
            }

            // auth successfull, user is not logged in
            if (!req.isAuthenticated()) {
                return User.findOrCreateFromProviderProfile(profile, function (err, user) {
                    if (err) {
                        return done(err);
                    }

                    return req.logIn(user, function () {
                        res.redirect('/');
                    });
                });
            }

            // auth successfull, user is already logged in
            // link profile to other possibly connected account
            req.user.setProviderProfile(profile, function (err, user) {
                if (err) {
                    return done(err);
                }

                res.redirect('/');
            });
        })(req, res, next);
    };
}

/**
 * Facebook
 */
app.get(
    '/facebook/api',
    ensureAuthentication,
    function (req, res, next) {
        try {
            var accessToken = req.user.providers.facebook.tokens.accessToken;
        } catch (e) {
            return next(e);
        }

        fbgraph.setAccessToken(accessToken);

        fbgraph.get('me/statuses', function (err, statuses) {
            return res.send(statuses);
        });
    }
);

app.get(
    '/facebook/callback',
    authenticateProvider('facebook')
);

app.get(
    '/facebook',
    passport.authenticate(
        'facebook',
        {
            'scope': ['user_status']
        }
    )
);

/**
 * Twitter
 */
app.get(
    '/twitter/api',
    ensureAuthentication,
    function (req, res, next) {
        try {
            var tokens = req.user.providers.twitter.tokens;
        } catch (e) {
            return next(e);
        }

        twitapi.setAuth({
            access_token: tokens.accessToken,
            access_token_secret: tokens.accessTokenSecret
        });

        twitapi.get('statuses/user_timeline', function (err, statuses) {
            return res.send(statuses);
        });
    }
);

app.get(
    '/twitter/callback',
    authenticateProvider('twitter')
);

app.get(
    '/twitter',
    passport.authenticate(
        'twitter'
    )
);

app.get('/login', function (req, res) {
    res.send(
        '<a href="/facebook">login with facebook</a>' +
            '<br/>' +
            '<a href="/twitter">login with twitter</a>'
    );
});

app.get('/logout', function (req, res) {
    if (req.isAuthenticated()) {
	req.logOut();
    }

    return res.redirect('/');
});

app.get('/', function (req, res) {
    if (req.isAuthenticated()) {
        return res.send(req.user);
    }

    res.send('hello World<br/><a href="/login">Login</a>');
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);

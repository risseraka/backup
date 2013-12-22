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
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var User = require('./providers');

// Facebook
var fb = {
    name: 'facebook',
    clientId: '92601131724',
    clientSecret: 'd14f54eb8013c4604687225fc905e160',
    callbackURL: 'https://localhost.com/facebook/callback'
};

// Twitter
var tw = {
    name: 'twitter',
    consumerKey: 'XDhPOfEgvAfzFUPUWHhQ',
    consumerSecret: 'dUT9wdqV0neYu93qsQE79Ny8JzY6blK8BoVb1mfeDBM',
    callbackURL: 'https://localhost.com/twitter/callback'
};

// Google+
var gg = {
    name: 'google',
    clientID: '410681330301.apps.googleusercontent.com',
    clientSecret: 'I2xgEom_U-mMvBRCBCzQ3W5I',
    callbackURL: 'https://localhost.com/google/callback'
};

/**
 * Facebook API
 */
var fbgraph = require('fbgraph');

/**
 * Twitter API
 */
var Twit = require('twit');
var twitapi = new Twit({
    consumer_key: tw.consumerKey,
    consumer_secret: tw.consumerSecret,
    access_token: ' ',
    access_token_secret: ' '
});

/**
 * Google API
 */
var googleapis = require('googleapis');
var plusapi;

googleapis
    .discover('plus', 'v1')
    .execute(function(err, client) {
	plusapi = client.plus;
    });

var OAuth2 = googleapis.auth.OAuth2Client;
var oauth2Client = new OAuth2(gg.clientId, gg.clientSecret, gg.callbackURL);

app.configure(function() {
    app.use(express.static('public'));
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.session({ secret: 'keyboard cat' }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
});

/**
 * Passport setup
 */
var facebookStrategy = new FacebookStrategy(
    {
        clientID: fb.clientId,
        clientSecret: fb.clientSecret,
        callbackURL: fb.callbackURL
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
        callbackURL: tw.callbackURL
    },
    function (token, tokenSecret, profile, done) {
        profile.tokens = {
            accessToken: token,
            accessTokenSecret: tokenSecret
        };

        return done(null, profile);
    }
);

var googleStrategy = new GoogleStrategy(
    {
        clientID: gg.clientID,
        clientSecret: gg.clientSecret,
        callbackURL: gg.callbackURL
    },
    function (accessToken, refreshToken, profile, done) {
        profile.tokens = {
            accessToken: accessToken,
            refreshToken: refreshToken
        };

        return done(null, profile);
    }
);

passport.use(facebookStrategy);
passport.use(twitterStrategy);
passport.use(googleStrategy);

passport.serializeUser(function serializeUser(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function deserializeUser(id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

function makeProviderNonAuthEnsurer(provider) {
    return function ensureProviderNonAuthenticated(req, res, next) {
	if (req.isAuthenticated() && req.user.providers[provider]) {
            return res.redirect('/');
	}
	next();
    };
}

var ensureNonAuthentication = User.providers.reduce(function (nonAuth, provider) {
    nonAuth[provider] = makeProviderNonAuthEnsurer(provider);
    return nonAuth;
}, {});

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
                        return next(err);
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
                    return next(err);
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
    ensureNonAuthentication['facebook'],
    authenticateProvider('facebook')
);

app.get(
    '/facebook',
    ensureNonAuthentication['facebook'],
    passport.authenticate(
        'facebook',
        {
            'scope': ['user_status', 'email']
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
    ensureNonAuthentication['twitter'],
    authenticateProvider('twitter')
);

app.get(
    '/twitter',
    ensureNonAuthentication['twitter'],
    passport.authenticate(
        'twitter'
    )
);

/**
 * Google
 */
app.get(
    '/google/api',
    ensureAuthentication,
    function (req, res, next) {
	if (!plusapi) {
	    return next(new Error('Google plus api is not loaded yet. Please come back later'));
	}

        try {
            var tokens = req.user.providers.google.tokens;
        } catch (e) {
            return next(e);
        }

	oauth2Client.credentials = {
	    access_token: tokens.accessToken,
	    refresh_token: tokens.refeshToken
	};

        plusapi.activities.list(
	    {
		userId: 'me',
		collection: 'public'
	    })
	    .withAuthClient(oauth2Client)
	    .execute(function (err, statuses) {
		if (err) {
		    return next(err.message);
		}

		return res.send(statuses);
            });
    }
);

app.get(
    '/google/callback',
    ensureNonAuthentication['google'],
    authenticateProvider('google')
);

app.get(
    '/google',
    ensureNonAuthentication['google'],
    passport.authenticate(
        'google',
	{
	    scope: 'profile email https://www.googleapis.com/auth/plus.login'
	}
    )
);

app.get('/login', function (req, res) {
    res.send(
	User.providers.map(function (provider) {
            return '<a href="/' + provider + '">login with ' + provider + '</a>';
	}).join('<br/>')
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

var fs = require('fs');
var http = require('http');
var https = require('https');

var privateKey  = fs.readFileSync('sslcert/ca.key', 'utf8');
var certificate = fs.readFileSync('sslcert/ca.crt', 'utf8');

var credentials = { key: privateKey, cert: certificate };

var express = require('express');
var app = express();

var passport = require('passport');

var User = require('./ProviderUser');

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
 * Passport session serialization
 */
passport.serializeUser(function serializeUser(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function deserializeUser(id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

var config = {
    facebook: {
	clientId: '92601131724',
	clientSecret: 'd14f54eb8013c4604687225fc905e160'
    },

    twitter: {
        consumerKey: 'XDhPOfEgvAfzFUPUWHhQ',
        consumerSecret: 'dUT9wdqV0neYu93qsQE79Ny8JzY6blK8BoVb1mfeDBM'
    },

    google: {
	clientId: '410681330301.apps.googleusercontent.com',
	clientSecret: 'I2xgEom_U-mMvBRCBCzQ3W5I'
    }
};

var Providers = require('./Providers')(passport, User);

require('./provider-facebook')(app, passport, Providers, config.facebook);
require('./provider-twitter')(app, passport, Providers, config.twitter);
require('./provider-google')(app, passport, Providers, config.google);

/**
 * Social APIs
 */

var SocialApi = {};

/**
 * Facebook API
 */
SocialApi['facebook'] = require('fbgraph');

/**
 * Twitter API
 */
var Twit = require('twit');
SocialApi['twitter'] = new Twit({
    consumer_key: config.twitter.consumerKey,
    consumer_secret: config.twitter.consumerSecret,
    access_token: ' ',
    access_token_secret: ' '
});

/**
 * Google API
 */
var googleapis = require('googleapis');
var OAuth2 = googleapis.auth.OAuth2Client;
var oauth2Client = new OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackURL
);

googleapis
    .discover('plus', 'v1')
    .execute(function(err, client) {
	client.plus.withAuthClient(oauth2Client);

	SocialApi['google'] = client.plus;
    });

/**
 * Social API routes
 */

function ensureAuthentication(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
}

/**
 * Facebook API route
 */
app.get(
    '/' + 'facebook' + '/api',
    ensureAuthentication,
    function (req, res, next) {
        try {
            var accessToken = req.user.providers['facebook'].tokens.accessToken;
        } catch (e) {
            return next(e);
        }

        SocialApi['facebook'].setAccessToken(accessToken);

        SocialApi['facebook'].get('me/statuses', function (err, statuses) {
            return res.send(statuses);
        });
    }
);

/**
 * Twitter API route
 */
app.get(
    '/' + 'twitter' + '/api',
    ensureAuthentication,
    function (req, res, next) {
        try {
            var tokens = req.user.providers['twitter'].tokens;
        } catch (e) {
            return next(e);
        }

        SocialApi['twitter'].setAuth({
            access_token: tokens.accessToken,
            access_token_secret: tokens.accessTokenSecret
        });

        SocialApi['twitter'].get('statuses/user_timeline', function (err, statuses) {
            return res.send(statuses);
        });
    }
);

/**
 * Google API route
 */
app.get(
    '/' + 'google' + '/api',
    ensureAuthentication,
    function (req, res, next) {
	if (!SocialApi['google']) {
	    return next(new Error('Google plus api is not loaded yet. Please come back later'));
	}

        try {
            var tokens = req.user.providers['google'].tokens;
        } catch (e) {
            return next(e);
        }

	oauth2Client.credentials = {
	    access_token: tokens.accessToken,
	    refresh_token: tokens.refeshToken
	};

        SocialApi['google'].activities.list(
	    {
		userId: 'me',
		collection: 'public'
	    })
	    .execute(function (err, statuses) {
		if (err) {
		    return next(err.message);
		}

		return res.send(statuses);
            });
    }
);

/**
 * Main Express routes
 */
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
    var authed = req.isAuthenticated();

    var html = (
	'Hello %name%!' +
	    '<br/>' +
	    (authed ? 'conected profiles: %connectedProfiles%' : '') +
	    '<br/>' +
	    '<a href="%action%">%action%</a>'
    )
	    .replace('%name%', authed ? 'user ' + req.user.id : 'world')
	    .replace(/%action%/g, authed ? 'logout' : 'login')
	    .replace('%connectedProfiles%', authed ? Object.keys(req.user.providers).join(', ') : '')
    ;

    res.send(html);
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);

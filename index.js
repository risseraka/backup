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

var fb = {
    clientId: '92601131724',
    clientSecret: 'd14f54eb8013c4604687225fc905e160'
};

var fbgraph = require('fbgraph');
//fbgraph.setAppSecret(fb.clientSecret);

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

function ensureAuthentication(req, res, next) {
    if (!req.isAuthenticated()) {
	return res.redirect('/login');
    }
    next();
}

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

        fbgraph.get('me', function (err, statuses) {
            return res.send(statuses);
            res.send(
                statuses.posts.map(
                    function (post) {
                        return post;
                    }
                )
            );
        });
    }
);

app.get(
    '/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/login',
        successRedirect: '/'
    })
);

app.get(
    '/facebook',
    passport.authenticate(
        'facebook'
    )
);

app.get('/login', function (req, res) {
    res.send('<a href="/facebook">login with facebook</a>');
});

app.get('/', function (req, res) {
    if (req.isAuthenticated()) {
        return res.send(req.user);
    }

    res.send('hello World<br/><a href="/login">Login</a>');
});

var facebookStrategy = new FacebookStrategy({
    clientID: fb.clientId,
    clientSecret: fb.clientSecret,
    callbackURL: "https://localhost.com/facebook/callback"
}, function (accessToken, refreshToken, profile, done) {
    User.findOrCreateFromProviderProfile(profile, function (err, user) {
        user.providers.facebook.tokens = {
            accessToken: accessToken,
            refreshToken: refreshToken
        };

        return done(err, user);
    });
});

passport.use(facebookStrategy);

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);

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

var render = require('./render')('views/');

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

var config = require('config');

var Providers = require('./Providers')(passport, User);

require('./providers/facebook')(app, passport, Providers, config.facebook);
require('./providers/twitter')(app, passport, Providers, config.twitter);
require('./providers/google')(app, passport, Providers, config.google);

var SocialApi = require('./socialApi')(config);
require('./socialApiRoutes')(app, SocialApi, Providers);

/**
 * Main Express routes
 */

function ensureAuthentication(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
}

app.get('/login', function (req, res) {
    res.send(
	render('login.html', {
	    SocialLogins: User.providers.map(function (provider) {
		return render('socialLogin.html', { provider: provider });
	    }).join('')
	})
    );
});

app.get('/logout', function (req, res) {
    if (req.isAuthenticated()) {
	req.logOut();
    }

    return res.redirect('/');
});

app.get('/', function (req, res) {
    var data, status = '';

    var authed = req.isAuthenticated();
    if (authed) {
	status = 'authed/';
	data = {
	    name: 'user ' + req.user.id,
	    connectedProfiles: Object.keys(req.user.providers).join(', ')
	};
    }

    res.send(render(status + 'index.html', data));
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);

var express = require('express');
var app = express();

var MemcachedStore = require('connect-memcached')(express);

var passport = require('passport');

var User = require('./ProviderUser');

var config = require('config');

app.configure(function() {
    //app.use(express.logger());

    app.use(express.static('public'));
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.session({
        secret: 'keyboard cat',
        store: new MemcachedStore({
            hosts: [config.memcache.location]
        })
    }));

    app.use(function (req, res, next) {
        console.log('sessionID:', req.sessionID);
        console.log('cookies:', req.cookies);

        next();
    });

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
        if (err) {
            return done(err);
        }

        if (!user) {
            return done(null, false);
        }

        done(null, user);
    });
});

var Providers = require('./Providers')(passport, User);

require('./providers/facebook')(app, passport, Providers, config.facebook);
require('./providers/twitter')(app, passport, Providers, config.twitter);
require('./providers/google')(app, passport, Providers, config.google);

var SocialApi = require('./socialApi')(config);
require('./socialApiRoutes')(app, SocialApi, Providers);

/**
 * Main Express routes
 */

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
    } else {
        data = {};
    }

    req.session.visits = (req.session.visits || 0) + 1;

    data.visits = req.session.visits;

    res.send(render(status + 'index.html', data));
});

module.exports = app;

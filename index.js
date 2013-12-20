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
    clientId: '109832835726216',
    clientSecret: 'a5daf22295da9997324a5228d389c9dd'
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

var User = {
    users: {
    'facebook': {},
    'twitter': {},
    'google': {}
    },
    findOrCreate: function (profile, callback) {
    if (!profile) {
        return callback('no valid profile provided');
    }

    if (profile.provider === 'facebook') {
        User.users.facebook[profile.id] = profile;
        return callback(null, profile);
    }
    }
};

app.get(
    '/app_dev.php/social/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
    res.send(
        'Hello World from facebook!' +
        '<pre>' + JSON.stringify(req.user) + '</pre>'
    );
    }
);

app.get(
    '/facebook/api',
    function (req, res) {
    var accessToken = req.user && req.user.accessToken ||
        'CAABj5HMoe4gBAOCu9UhkwDEV8jETGdZBZA5Yhxxa5X2C07snhdlkOe7FU9b9U0zbeVVd9YKkEPQfzlv8u1UCdimnBqTYlkk53y8zZBZB9sS8tR39s97pNvyRxfPtkfMIN6XYbE9yep6cqmaoKv9yL60qAE69X7NPOTpjfTR0t0KaocP8SILP';
    fbgraph.setAccessToken(accessToken);

    fbgraph.get('me/statuses', function (err, statuses) {
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
)

app.get(
    '/facebook',
    passport.authenticate(
    'facebook'
    )
);

app.get('/', function (req, res) {
    res.send('hello World<br/><a href="/login">Login</a>');
});

app.get('/login', function (req, res) {
    res.send('<a href="/facebook">login with facebook</a>');
});

var facebookStrategy = new FacebookStrategy({
    clientID: fb.clientId,
    clientSecret: fb.clientSecret,
    callbackURL: "https://webaserver.com/app_dev.php/social/facebook/callback"
}, function (accessToken, refreshToken, profile, done) {
    console.log(accessToken);

    User.findOrCreate(profile, function (err, user) {
    user.accessToken = accessToken;
    return done(err, user);
    });
});

passport.use(facebookStrategy);

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);

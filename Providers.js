module.exports = function (passport, User) {

    /**
     * Provider authentication helper
     */
    function authenticate(provider) {
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
     * Authentication ensurers
     */
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

    return {
	authenticate: authenticate,
	ensureNonAuthentication: ensureNonAuthentication
    };

};

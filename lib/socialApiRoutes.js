module.exports = function (app, SocialApi, Providers) {

    /**
     * Social API routes
     */

    /**
     * Facebook API route
     */
    app.get(
	'/' + 'facebook' + '/api',
	Providers.ensure['facebook'].Authentication,
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
	Providers.ensure['twitter'].Authentication,
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
	Providers.ensure['google'].Authentication,
	function (req, res, next) {
	    if (!SocialApi['google']) {
		return next(new Error('Google plus api is not loaded yet. Please come back later'));
	    }

            try {
		var tokens = req.user.providers['google'].tokens;
            } catch (e) {
		return next(e);
            }

	    SocialApi['google'].authClient.credentials = {
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

};

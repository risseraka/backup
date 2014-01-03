var AugmentedUser = (function (User, log) {

    var providers = (function (providers) {
        providers.forEach(function (provider) {
            providers[provider] = provider;
        });

        return providers;
    }(['facebook', 'twitter', 'google']));

    User.providers = providers;

    var index = {};

    var superRemove = User.remove;
    function remove(user, done) {
        log('[user[' + user.id + '].remove]', 'removing providers profiles');

        var profiles = user.providers;

        providers.forEach(function (provider) {
            var profile = profiles[provider];

            if (profile) {
                var profileId = profile.id;

                delete index[provider][profileId];
            }
        });

        superRemove();
    }
    User.remove = remove;

    function setProviderProfile(user, profile, done) {
        log(
            '[user[' + user.id + '].setProviderProfile]',
            'provider:', profile.provider,
            ', profileId:', profile.id
        );

        var provider = profile.provider;

        user.providers[provider] = profile;

        user.save(function (err, user) {
            if (err) {
                return done(err);
            }

            done(null, user);
        });
    }

    function removeProviderProfile(user, provider, done) {
        var profileId = user.providers[provider].id;

        log(
            '[user[' + user.id + '].removeProviderProfile]',
            'provider:', provider,
            ', profileId:', profileId
        );

        delete user.providers[provider];
        delete index[provider][profileId];

        user.save(done);
    }

    function enrichUser(user) {
        user.providers = {};

        user.remove = remove.bind(user, user);
        user.setProviderProfile = setProviderProfile.bind(user, user);
    }

    var superCreate = User.create;
    function create() {
        var user = superCreate();

        enrichUser(user);

        return user;
    }

    providers.forEach(function (provider) {
        index[provider] = {};
    });

    function findByProviderProfile(profile, done) {
        var provider = profile.provider;
        var profileId = profile.id;

        log('[findByProviderProfile] provider:', provider, ', profileId:', profileId);

        done(null, index[provider][profileId]);
    }
    User.findByProviderProfile = findByProviderProfile;

    function isSupportedProvider(provider, done) {
        if (!providers[provider]) {
            return done(new Error('unsupported provider:', provider));
        }

        done(null);
    }

    function findOrCreateFromProviderProfile(profile, done) {
        if (!profile) {
            return done(new Error('no profile'));
        }

        var provider = profile.provider;
        var profileId = profile.id;

        log('[findOrCreateFromProviderProfile] provider:', provider, ', profileId:', profileId);

        isSupportedProvider(profile.provider, function (err) {
            if (err) {
                return done(err);
            }

            findByProviderProfile(profile, function (err, user) {
                if (err) {
                    return done(err);
                }

                if (!user) {
                    user = create();
                    index[provider][profileId] = user;
                }

                setProviderProfile(user, profile, function (err, user) {
                    if (err) {
                        return done(err);
                    }

                    done(null, user);
                });
            });
        });
    }

    User.setProviderProfile = setProviderProfile;
    User.removeProviderProfile = removeProviderProfile;
    User.findOrCreateFromProviderProfile = findOrCreateFromProviderProfile;

    return User;

}(require('./User'), require('./logger')('[User]')));

module.exports = AugmentedUser;

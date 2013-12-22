var User = (function (log) {
    var users = {
    };

    var index = {
        length: 0
    };

    function save(user, done) {
        log('[user[' + user.id  + '].save]');

        if (!users[user.id]) {
            index.length += 1;
        }

        users[user.id] = user;

        done(null, user);
    }

    function remove(user, done) {
        log('[user[' + user.id  + '].remove]');

        if (users[user.id]) {
            delete users[user.id];

            index.length -= 1;
        }
    }

    function create() {
        var user = {
            id: index.length,
            email: ''
        };

        log('[user[' + user.id + '].create]');

        // Public methods
        user.save = save.bind(this, user);
        user.remove = remove.bind(this, user);

        return user;
    }

    function findById(id, done) {
        log('[findById] find id:', id);

        done(null, users[id]);
    }

    function findOrCreate() {
    }

    return {
        create: create,
        remove: remove,
        findById: findById,
        findOrCreate: findOrCreate
    };

}(require('./logger')('[User]')));

module.exports = User;

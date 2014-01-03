var DB = require('./DB.js');

module.exports = (function (log) {
  var dbClient = DB.createClient('user');

  var index;

  function getIndex(done) {
    dbClient.get('index', done);
  }

  function setIndex(done) {
    dbClient.set('index', index, function (err) {
      if (err) {
        throw new Error('could not set User index in DB');
      }

      typeof done === 'function' && done();
    });
  }

  (function initIndex() {
    getIndex(function (err, cachedIndex) {
      if (err) {
        return null;
      }

      if (!cachedIndex) {
        index = {
          users: {},
          length: 0
        };

        setIndex();
      } else {
        index = cachedIndex;
      }
    });
  }());

  function getUser(id, done) {
    dbClient.get(id, done);
  }

  function setUser(user, done) {
    dbClient.set(user.id, user, done);
  }

  function save(user, done) {
    log('[user[' + user.id  + '].save]');

    setUser(user, function (err) {
      if (err) {
        throw new Error('could not save User ' + user.id + 'in DB');
      }

      if (!index.users[user.id]) {
        index.users[user.id] = true;

        index.length += 1;
      }

      setIndex(function (err) {
        done(err, user);
      });
    });
  }

  function remove(user, done) {
    log('[user[' + user.id  + '].remove]');

    if (!index.users[user.id]) {
      return done(new Error('no such user to delete'));
    }

    dbClient.drop(user.id, function (err) {
      if (err) {
        return done(err);
      }

      delete index.users[user.id];
    });
  }

  function enrichUser(user) {
    if (!user) { return; }

    // Public methods
    user.save = save.bind(user, user);
    user.remove = remove.bind(user, user);
  }

  function create() {
    var id = index.length;

    log('[user[' + id + '].create]');

    var user = {
      id: id,
      email: ''
    };

    enrichUser(user);

    return user;
  }

  function findById(id, done) {
    log('[findById] find id:', id);

    getUser(id, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, null); }

      enrichUser(user);

      done(null, user);
    });
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

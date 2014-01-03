var config = require('config');

var Catbox = require('catbox');

var catBoxClient = new Catbox.Client(require('config').memcache);

var DB = {};

DB.start = catBoxClient.start.bind(catBoxClient);

DB.createClient = function (type) {
  var ttl = config.memcache.ttl[type];

  var dbClient = {};

  dbClient.get = function get(id, done) {
    var key = {
      segment: type,
      id: id.toString()
    };

    catBoxClient.get(key, function (err, cached) {
      if (err) {
	var typeid = type + '[' + id + ']';

        throw new Error(
          'could not retrieve ' + typeid + ' from DB, ' +
            'error: ' + err.message
        );
      }

      if (!cached) {
        return done(null, null);
      }

      done(null, cached.item);
    });
  };

  dbClient.set = function set(id, value, done) {
    var key = {
      segment: type,
      id: id.toString()
    };

    catBoxClient.set(
      key,
      value,
      ttl,
      function (err) {
        if (err) {
	  var typeid = type + '[' + id + ']';

          throw new Error(
            'could not set ' + typeid  + ' in DB, ' +
              'error: ' + err.message
          );
        }

        done(null, value);
      }
    );
  };

  dbClient.drop = catBoxClient.drop.bind(DB, type);

  return dbClient;
};

module.exports = DB;

/**
 * REST API command PUT
 */
var Q = require('./../lib/q');
var U = require('./../utils');

module.exports = putCommand;

function putCommand(api) {
  this.api = api;
}

putCommand.prototype.execute = function(params) {
  var deferred = Q.defer();
  if (U.isEmpty(params)) {
    deferred.reject(new Error('Invalid parameters'));

  } else {
    execute(this.api, params, function(err, result) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(result);
      }
    });
  }
  return deferred.promise;
}

function execute(api, params, cb) {
  if (!U.isEmpty(params) && !U.isEmpty(params.body) &&
    !U.isEmpty(params.table) && !U.isEmpty(params.tables)) {

    var body = params.body;
    var table = params.tables[params.table];

    updateInsertQuery(api, table, body)
      .then(function(result) {
        cb(0, result);

      }).fail(function(err) {
        cb(err, {});
      });

  } else {
    cb(new Error('Invalid parameters'), {});
  }
}

function updateInsertQuery(api, params, data) {
  var deferred = Q.defer();
  if (U.isEmpty(data)) {
    deferred.reject(new Error('Data are empty.'));

  } else if (!U.isEmpty(params)) {

    var where = [];
    if (!U.isEmpty(params.where)) {
      for (var i in params.where) {
        where.push(params.where[i]);
      }

    } else if (!U.isEmpty(params.filters)) {

      if (U.isEmpty(params.filters.primary) && !U.isEmpty(params.primaryKey)) {
        var keyVal = data[params.primaryKey];
        if (!U.isEmpty(keyVal)) {
          params.filters.primary = params.primaryKey + "=" + keyVal;
        }
      }

      for (var i in params.filters) {
        where.push(params.filters[i]);
      }

    } else {
      insertQuery(api, params, data)
        .then(function(result) {
          deferred.resolve(data);
        })
        .fail(function(err) {
          deferred.reject(err);
        });

      return deferred.promise;
    }

    var db = api.db(params.table);
    db = db.withSchema(params.database);

    if (where.length > 0) {
      db = db.whereRaw("(" + where.join(') AND (') + ")");
    }

    db.update(data)
      .asCallback(function(err, resultUpdate) {
        if (!U.isEmpty(err)) {
          deferred.reject(err);

        } else if (resultUpdate > 0) {
          deferred.resolve(resultUpdate);

        } else {
          insertQuery(api, params, data)
            .then(function(result) {
              deferred.resolve(data);
            })
            .fail(function(err) {
              deferred.reject(err);
            });
        }
      });

  } else {
    deferred.reject(new Error('Invalid parameters'));
  }
  return deferred.promise;
}

function insertQuery(api, params, data) {
  var deferred = Q.defer();
  if (U.isEmpty(data)) {
    deferred.reject(new Error('Data are empty.'));

  } else if (!U.isEmpty(params)) {
    var db = api.db(params.table);
    db = db.withSchema(params.database);

    var values = data;
    if (!U.isEmpty(params.primaryKey)) {
      if (typeof data[params.primaryKey] !== 'undefined') {
        values = {};
        for (var i in data) {
          if (i != params.primaryKey) {
            values[i] = data[i];
          }
        }
      }
      db = db.returning(params.primaryKey);
    }

    db.insert(values)
      .asCallback(function(err, result) {
        if (!U.isEmpty(err)) {
          deferred.reject(err);
        } else {
          deferred.resolve(result);
        }
      });

  } else {
    deferred.reject(new Error('Invalid parameters'));
  }
  return deferred.promise;
}

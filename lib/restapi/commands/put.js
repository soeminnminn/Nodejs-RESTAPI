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
    var promise = null;
    if (Array.isArray(body)) {
      table.filters.primary = null;
      var funcs = [];
      for (var i in body) {
        var row = body[i];
        funcs.push(updateInsertQuery(api, table, row));
      }
      promise = Q.all(funcs);

    } else {
      promise = updateInsertQuery(api, table, body);
    }

    promise.then(function(result) {
      while (result && Array.isArray(result) && result.length == 1) {
        result = result[0];
      }
      cb(0, result);

    }).catch(function(err) {
      cb(err, {});
    });

  } else {
    cb(new Error('Invalid parameters'), {});
  }
}

function updateInsertQuery(api, table, data) {
  var deferred = Q.defer();
  if (U.isEmpty(data)) {
    deferred.reject(new Error('Data are empty.'));

  } else if (U.isEmpty(table)) {
    deferred.reject(new Error('Invalid parameters'));

  } else {

    var where = [];
    if (!U.isEmpty(table.where)) {
      for (var i in table.where) {
        where.push(table.where[i]);
      }

    } else if (!U.isEmpty(table.filters)) {
      if (U.isEmpty(table.filters.primary) && !U.isEmpty(table.primaryKey)) {
        var keyVal = data[table.primaryKey];
        if (!U.isEmpty(keyVal)) {
          table.filters.primary = table.primaryKey + "=" + keyVal;
        }
      }

      for (var i in table.filters) {
        where.push(table.filters[i]);
      }

    } else {
      insertQuery(api, table, data)
        .then(function(result) {
          deferred.resolve(result);
        })
        .catch(function(err) {
          deferred.reject(err);
        });

      return deferred.promise;
    }

    var db = api.db(table.table);
    db = db.withSchema(table.database);

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
          insertQuery(api, table, data)
            .then(function(result) {
              deferred.resolve(result);
            })
            .catch(function(err) {
              deferred.reject(err);
            });
        }
      });

  }
  return deferred.promise;
}

function insertQuery(api, table, data) {
  var deferred = Q.defer();
  if (U.isEmpty(data)) {
    deferred.reject(new Error('Data are empty.'));

  } else if (U.isEmpty(table)) {
    deferred.reject(new Error('Invalid parameters'));

  } else {
    var db = api.db(table.table);
    db = db.withSchema(table.database);

    var values = data;
    if (!U.isEmpty(table.primaryKey)) {
      if (typeof data[table.primaryKey] !== 'undefined') {
        values = {};
        for (var i in data) {
          if (i != table.primaryKey) {
            values[i] = data[i];
          }
        }
      }
      db = db.returning(table.primaryKey);
    }
    db.insert(values)
      .asCallback(function(err, result) {
        if (!U.isEmpty(err)) {
          deferred.reject(err);
        } else {
          deferred.resolve(result[0]);
        }
      });

  }
  return deferred.promise;
}
/**
 * REST API command POST
 */
var Q = require('./../lib/q');
var U = require('./../utils');

module.exports = postCommand;

function postCommand(api) {
  this.api = api;
}

postCommand.prototype.execute = function(params) {
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
    var funcs = [];
    for (var i in params.tables) {
      var table = params.tables[i];
      var data = body[table.table];
      if (table.type == "primary" && typeof data == 'object' && !U.isEmpty(data)) {
        funcs.push(insertQuery(api, table, data));
      }
    }

    var promise = null;
    if (funcs.length > 0) {
      promise = Q.all(funcs);

    } else {
      var table = params.tables[params.table];
      promise = insertQuery(api, table, body);
    }

    promise.then(function(result) {
      cb(0, result);

    }).catch(function(err) {
      cb(err, {});
    });

  } else {
    cb(new Error('Invalid parameters'), {});
  }
}

function insertQuery(api, params, data) {
  var deferred = Q.defer();
  if (U.isEmpty(data)) {
    deferred.reject(new Error('Data are empty.'));

  } else if (!U.isEmpty(params)) {
    if (Array.isArray(data)) {
      var db = api.db.batchInsert(params.table, data, 30);
      if (!U.isEmpty(params.primaryKey)) {
        db = db.returning(params.primaryKey);
      }
      db.asCallback(function(err, result) {
        if (!U.isEmpty(err)) {
          deferred.reject(err);
        } else {
          deferred.resolve(result);
        }
      });

    } else {
      var db = api.db(params.table);
      db = db.withSchema(params.database);

      if (!U.isEmpty(params.primaryKey)) {
        db = db.returning(params.primaryKey);
      }

      db.insert(data)
        .asCallback(function(err, result) {
          if (!U.isEmpty(err)) {
            deferred.reject(err);
          } else {
            deferred.resolve(result);
          }
        });
    }

  } else {
    deferred.reject(new Error('Invalid parameters'));
  }
  return deferred.promise;
}
/**
 * REST API command PATCH
 */
var Q = require('./../lib/q');
var FORM = require('formidable');
var U = require('./../utils');

module.exports = patchCommand;

function patchCommand(api) {
  this.api = api;
}

patchCommand.prototype.execute = function(params) {
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
        var r = body[i];
        funcs.push(updateQuery(api, table, r));
      }
      promise = Q.all(funcs);

    } else {
      promise = updateQuery(api, table, body);
    }

    promise.then(function(result) {
      cb(0, result);

    }).fail(function(err) {
      cb(err, {});
    });

  } else {
    cb(new Error('Invalid parameters'), {});
  }
}

function updateQuery(api, params, data) {
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
    }

    var db = api.db(params.table);
    db = db.withSchema(params.database);

    if (where.length > 0) {
      db = db.whereRaw("(" + where.join(') AND (') + ")");
    }

    db.update(data)
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
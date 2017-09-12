/**
 * REST API command POST
 */
var Q = require('./../lib/q');
var FORM = require('formidable');
var U = require('./../utils');

module.exports = postCommand;

function postCommand(api) {
  this.api = api;
}

postCommand.prototype.execute = function(req, params) {
  var deferred = Q.defer();
  if (U.isEmpty(params)) {
    deferred.reject(new Error('Invalid parameters'));

  } else {
    execute(this.api, req, params, function(err, result) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(result);
      }
    });
  }
  return deferred.promise;
}

function execute(api, req, params, cb) {
  if (!U.isEmpty(params) && !U.isEmpty(params.body) &&
    !U.isEmpty(params.table) && !U.isEmpty(params.tables)) {

    var body = params.body;
    var funcs = [];
    for (var i in params.tables) {
      var table = params.tables[i];
      var data = body[table.table];
      if (table.type == "primary" && typeof data == 'object' && !U.isEmpty(data)) {
        if (typeof api.settings.bodyTranform == 'function') {
          api.settings.bodyTranform(params.query, data, table);
        }
        funcs.push(insertQuery(api, table, data));
      }
    }

    var promise = null;
    if (funcs.length > 0) {
      promise = Q.all(funcs);

    } else {
      if (typeof api.settings.bodyTranform == 'function') {
        api.settings.bodyTranform(params.query, body, table);
      }
      var table = params.tables[params.table];
      promise = insertQuery(api, table, body);
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

function insertQuery(api, params, data) {
  var deferred = Q.defer();
  if (U.isEmpty(data)) {
    deferred.reject(new Error('Data are empty.'));

  } else if (!U.isEmpty(params)) {
    if (Array.isArray(data)) {
      var db = api.db;
      db = db.withSchema(params.database);

      db.transaction(function(tr) {
          db.batchInsert(table, data);
          if (!U.isEmpty(params.primaryKey)) {
            db = db.returning(params.primaryKey);
          }
          return db.transacting(tr);
        })
        .then(function(result) {
          deferred.resolve(result);
        })
        .catch(function(err) {
          deferred.reject(err);
        });

    } else {
      var db = api.db(params.table);
      db = db.withSchema(params.database);

      if (!U.isEmpty(params.primaryKey)) {
        db = db.returning(params.primaryKey);
      }

      db.insert(data)
        .then(function(result) {
          deferred.resolve(result);
        })
        .catch(function(err) {
          deferred.reject(err);
        });
    }

  } else {
    deferred.reject(new Error('Invalid parameters'));
  }
  return deferred.promise;
}
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
      if (table.type == 'include') continue;
      var data = body[table.table];
      if (typeof data == 'object' && !U.isEmpty(data)) {
        funcs.push(query(api, table, data, params.tables, body));
      }
    }

    var promise = null;
    if (funcs.length > 0) {
      promise = Q.all(funcs);

    } else {
      var table = params.tables[params.table];
      promise = query(api, table, body, includes, body);
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

function query(api, table, data, tables, body) {
  var deferred = Q.defer();
  if (!U.isEmpty(table)) {
    insertQuery(api, table, data)
      .then(function(result) {
        return applyRelations(api, table, tables, body, result);

      }).then(function(result) {
        deferred.resolve(result);

      }).catch(function(err) {
        deferred.reject(err);
      });

  } else {
    deferred.reject(new Error('Invalid parameters'));
  }
  return deferred.promise;
}

function applyRelations(api, table, tables, body, id) {
  var deferred = Q.defer();
  if (!U.isEmpty(table.relations) && id) {
    var funcs = [];
    for (var j in table.relations) {
      var ref = table.relations[j].table;
      if (!U.isEmpty(tables[ref]) && !U.isEmpty(body[ref])) {
        var col = table.relations[j].column;
        var data = body[ref];
        var relTable = tables[ref];
        for (var i in data) {
          data[i][col] = id;
        }
        funcs.push(insertQuery(api, relTable, data));
      }
    }

    if (funcs.length > 0) {
      Q.all(funcs)
        .then(function(result) {
          deferred.resolve(id);

        }).catch(function(err) {
          deferred.reject(err);
        });

    } else {
      deferred.resolve(id);
    }

  } else {
    deferred.resolve(id);
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
    if (Array.isArray(data)) {
      var db = api.db.batchInsert(table.table, data, 30);
      if (!U.isEmpty(table.primaryKey)) {
        db = db.returning(table.primaryKey);
      }
      db.asCallback(function(err, result) {
        if (!U.isEmpty(err)) {
          deferred.reject(err);
        } else {
          deferred.resolve(result);
        }
      });

    } else {
      var db = api.db(table.table);
      db = db.withSchema(table.database);

      if (!U.isEmpty(table.primaryKey)) {
        db = db.returning(table.primaryKey);
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

  }
  return deferred.promise;
}
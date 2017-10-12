/**
 * REST API command DELETE
 */
var Q = require('./../lib/q');
var U = require('./../utils');

module.exports = deleteCommand;

function deleteCommand(api) {
  this.api = api;
}

deleteCommand.prototype.execute = function(params) {
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
  if (!U.isEmpty(params.tables)) {
    var funcs = [];
    var tableOrder = params.tablesOrder.reverse();
    for (var i in tableOrder) {
      var key = tableOrder[i];
      var table = params.tables[key];
      if (!U.isEmpty(table.relations)) {
        for (var j in table.relations) {
          var refTable = table.relations[j].table;
          if (!U.isEmpty(params.tables[refTable].ids)) {
            var ids = params.tables[refTable].ids;
            if (ids.length > 0) {
              if (U.isEmpty(table.where)) {
                table.where = [];
              }
              if (ids.length == 1) {
                table.where.push(j + ' = ' + ids[0]);
              } else {
                table.where.push(j + ' IN (' + ids.join(',') + ')');
              }
            }
          }
        }
      }
      funcs.push(deleteQuery(api, table));
    }

    Q.all(funcs)
      .then(function(result) {
        cb(0, result);
      }).fail(function(err) {
        cb(err, data);
      });

  } else {
    cb(new Error('Invalid parameters'), {});
  }
}

function deleteQuery(api, params) {
  var deferred = Q.defer();
  if (!U.isEmpty(params)) {
    var db = api.db(params.table);
    db = db.withSchema(params.database);

    if (!U.isEmpty(params.where)) {
      db = db.whereRaw("(" + params.where.join(') AND (') + ")");
    }
    db.del()
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
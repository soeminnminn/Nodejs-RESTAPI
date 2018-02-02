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
      if (table.type == 'include') continue;
      applyRelations(api, table, params.tables);

      funcs.push(deleteQuery(api, table));
    }

    Q.all(funcs)
      .then(function(result) {
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

function applyRelations(api, table, tables) {
  if (!U.isEmpty(table.relations)) {
    for (var j in table.relations) {
      var ref = table.relations[j].table;
      if (!U.isEmpty(tables[ref].ids)) {
        var ids = tables[ref].ids;
        if (ids.length > 0) {
          if (U.isEmpty(table.where)) {
            table.where = [];
          }
          var idFilter = j;
          if (ids.length == 1) {
            idFilter += ',eq,' + ids[0];
          } else {
            idFilter += ',in,[' + ids.join(', ') + ']';
          }
          table.where.push(api.filter.convertFilter(idFilter));
        }
      }
    }
  }
}

function deleteQuery(api, table) {
  var deferred = Q.defer();
  if (U.isEmpty(table)) {
    deferred.reject(new Error('Invalid parameters'));

  } else {
    var db = api.db(table.table);
    db = db.withSchema(table.database);

    if (!U.isEmpty(table.where)) {
      db = db.whereRaw("(" + table.where.join(') AND (') + ")");
    }
    //deferred.resolve(db.del().toSQL());
    db.del()
      .asCallback(function(err, result) {
        if (!U.isEmpty(err)) {
          deferred.reject(err);
        } else {
          deferred.resolve(result);
        }
      });
  }
  return deferred.promise;
}
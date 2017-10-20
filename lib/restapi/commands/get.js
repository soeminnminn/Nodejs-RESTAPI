/**
 * REST API command GET
 */
var Q = require('./../lib/q');
var U = require('./../utils');

module.exports = getCommand;

function getCommand(api) {
  this.api = api;
}

getCommand.prototype.execute = function(params) {
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
    var includes = {};
    for (var i in params.tables) {
      var table = params.tables[i];
      if (table.type == 'include') {
        includes[i] = table;
      }
    }
    for (var i in params.tables) {
      var table = params.tables[i];
      if (table.type == 'include') continue;
      funcs.push(query(api, table, includes));
    }

    Q.all(funcs)
      .then(function(result) {
        var d = {};
        for (var i in result) {
          for (var r in result[i]) {
            d[r] = result[i][r];
          }
        }
        cb(0, d);
      }).catch(function(err) {
        cb(err, params);
      });

  } else {
    cb(new Error('Invalid parameters'), {});
  }
}

function query(api, table, includes) {
  var deferred = Q.defer();
  if (!U.isEmpty(table)) {
    selectQuery(api, table)
      .then(function(result) {
        return applyRelations(api, table, tables, result);

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

function applyRelations(api, table, tables, result) {
  var deferred = Q.defer();
  if (!U.isEmpty(table.relations) && result) {
    //
    deferred.resolve(result);

  } else {
    deferred.resolve(result);
  }
  return deferred.promise;
}

function selectQuery(api, table) {
  var deferred = Q.defer();
  if (!U.isEmpty(table)) {
    var db = api.db(table.table);
    db = db.withSchema(table.database);

    if (!U.isEmpty(table.columns)) {
      var cols = [];
      for (var c in table.columns) {
        var col = table.columns[c];
        var match = /^([a-zA-Z0-9\-_,.]+)\(([^\(\)]+)\)(.*)$/.exec(col);
        if (match) {
          var func = match[1].toLowerCase();
          if (!!~['avg', 'count', 'min', 'max', 'sum'].indexOf(func)) {
            db = db[func](match[2] + match[3]);
          } else {
            cols.push(api.db.raw(col));
          }
        } else {
          cols.push(col);
        }
      }

      if (table.distinct) {
        db = db.distinct(cols).select();
      } else {
        db = db.select(cols);
      }

    } else {
      if (table.distinct) {
        db = db.distinct();
      }
      db = db.select();
    }
    if (!U.isEmpty(table.joins)) {
      for (var i in table.joins) {
        var j = table.joins[i];
        if (typeof j === 'object') {
          var str = j.type + ' ' + j.table;
          if (j.condition && j.condition != '') {
            str += ' ON ' + j.condition;
          }
          db = db.joinRaw(str);

        } else if (typeof j === 'string') {
          db = db.joinRaw(j);
        }
      }
    }
    if (!U.isEmpty(table.where)) {
      db = db.whereRaw("(" + table.where.join(') AND (') + ")");
    }
    if (!U.isEmpty(table.group)) {
      db = db.groupBy(table.group);
    }
    if (!U.isEmpty(table.having)) {
      db = db.havingRaw(table.having);
    }
    if (!U.isEmpty(table.order)) {
      db = db.orderByRaw(table.order);
    }
    if (table.start) {
      db = db.offset(table.start);
    }
    if (table.length) {
      db = db.limit(table.length);
    }

    //deferred.resolve(db.toSQL());
    db.asCallback(function(err, result) {
      if (!U.isEmpty(err)) {
        deferred.reject(err);
      } else {
        var d = {};
        d[table.table] = result;
        deferred.resolve(d);
      }
    });

  } else {
    deferred.reject(new Error('Invalid parameters'));
  }

  return deferred.promise;
}
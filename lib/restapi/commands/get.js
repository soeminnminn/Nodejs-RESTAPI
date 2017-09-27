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
    var tables = [];
    for (var i in params.tables) {
      var table = params.tables[i];
      tables.push(queryTable(api, table));
    }

    Q.all(tables)
      .then(function(result) {
        var d = {};
        for (var i in result) {
          for (var r in result[i]) {
            d[r] = result[i][r];
          }
        }
        cb(0, d);
      }).fail(function(err) {
        cb(err, params);
      });

  } else {
    cb(new Error('Invalid parameters'), {});
  }
}

function queryTable(api, params) {
  var deferred = Q.defer();
  if (!U.isEmpty(params)) {
    var db = api.db(params.table);
    db = db.withSchema(params.database);

    if (!U.isEmpty(params.columns)) {
      var cols = [];
      for (var c in params.columns) {
        var col = params.columns[c];
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

      if (params.distinct) {
        db = db.distinct(cols).select();
      } else {
        db = db.select(cols);
      }

    } else {
      if (params.distinct) {
        db = db.distinct();
      }
      db = db.select();
    }
    if (!U.isEmpty(params.joins)) {
      for (var i in params.joins) {
        var j = params.joins[i];
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
    if (!U.isEmpty(params.where)) {
      db = db.whereRaw("(" + params.where.join(') AND (') + ")");
    }
    if (!U.isEmpty(params.group)) {
      db = db.groupBy(params.group);
    }
    if (!U.isEmpty(params.having)) {
      db = db.havingRaw(params.having);
    }
    if (!U.isEmpty(params.order)) {
      db = db.orderByRaw(params.order);
    }
    if (params.start) {
      db = db.offset(params.start);
    }
    if (params.length) {
      db = db.limit(params.length);
    }

    db.asCallback(function(err, result) {
      if (!U.isEmpty(err)) {
        deferred.reject(err);
      } else {
        var d = {};
        d[params.table] = result;
        deferred.resolve(d);
      }
    });

  } else {
    deferred.reject(new Error('Invalid parameters'));
  }

  return deferred.promise;
}

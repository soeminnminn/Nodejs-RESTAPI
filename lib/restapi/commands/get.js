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
    for (var i in params.tables) {
      var table = params.tables[i];
      if (table.type == 'include') continue;
      funcs.push(query(api, table, params));
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

function query(api, table, params) {
  var deferred = Q.defer();
  if (!U.isEmpty(table)) {
    selectQuery(api, table)
      .then(function(result) {
        return applyRelations(api, table, params, result);

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

function applyRelations(api, table, params, result) {
  var deferred = Q.defer();
  if (!U.isEmpty(result) && !U.isEmpty(params.relations)) {
    var funcs = [];
    var relations = [];
    for (var i in params.relations) {
      var relTable;
      var r = params.relations[i];
      if (r.primary.table == table.table) {
        var foreignTable = params.tables[r.foreign.table];
        relTable = addRelationCondition(api, foreignTable, r.primary.column, r.foreign.column, result[table.table]);

        relTable.relations = {};
        relTable.relations[table.table] = {
          column: r.primary.column,
          table: table.table,
          type: "primary"
        };
        relTable.relations[relTable.table] = {
          column: r.foreign.column,
          table: relTable.table,
          type: "foreign"
        };

      } else if (r.foreign.table == table.table) {
        var primaryTable = params.tables[r.primary.table];
        relTable = addRelationCondition(api, primaryTable, r.foreign.column, r.primary.column, result[table.table]);

        relTable.relations = {};
        relTable.relations[table.table] = {
          column: r.foreign.column,
          table: table.table,
          type: "foreign"
        };
        relTable.relations[relTable.table] = {
          column: r.primary.column,
          table: relTable.table,
          type: "primary"
        };
      }

      if (!U.isEmpty(relTable)) {
        relations.push(relTable);
        funcs.push(selectQuery(api, relTable));
      }
    }

    Q.all(funcs)
      .then(function(relResult) {
        if (!U.isEmpty(relResult)) {
          var resultData = result;
          for (var i in relResult) {
            var relTable = relations[i];
            resultData[table.table] = margeRelation(resultData[table.table], relTable.relations[table.table],
              relResult[i][relTable.table], relTable.relations[relTable.table]);
          }
        }
        deferred.resolve(resultData);

      }).catch(function(err) {
        deferred.reject(err);
      });

  } else {
    deferred.resolve(result);
  }
  return deferred.promise;
}

function addRelationCondition(api, table, column, keycol, result) {
  var ids = [];
  for (var i in result) {
    var id = result[i][column];
    if (!~ids.indexOf(id)) {
      ids.push(id);
    }
  }

  if (ids.length > 0) {
    if (U.isEmpty(table.where)) {
      table.where = [];
    }
    var idFilter = keycol;
    if (ids.length == 1) {
      idFilter += ',eq,' + ids[0];
    } else {
      idFilter += ',in,[' + ids.join(',') + ']';
    }
    table.where.push(api.filter.convertFilter(idFilter));
  }
  return table;
}

/*
 var data = margeRelation(
   township[], { column: "cityid", table: "township", type: "foreign" }, 
   city[], { column: "id", table: "city", type: "primary" }
 );
 */
function margeRelation(data1, relation1, data2, relation2) {
  var second = {};
  for (var i in data2) {
    var d = data2[i];
    var key = "#" + d[relation2.column];
    if (relation2.type == "foreign") {
      if (!second[key]) {
        second[key] = [];
      }
      delete d[relation2.column];
      second[key].push(d);

    } else {
      second[key] = d;
    }
  }

  for (var i in data1) {
    var key = "#" + data1[i][relation1.column];
    data1[i][relation2.table] = second[key];
    if (relation1.type == "foreign") {
      delete data1[i][relation1.column];
    }
  }
  return data1;
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
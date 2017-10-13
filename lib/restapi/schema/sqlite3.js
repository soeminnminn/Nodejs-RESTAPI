/**
 * REST API schema SQLite3
 */
var Q = require('./../lib/q');

/**
 * SQLite3 Schema Class
 * @param {knex} db Database Query Object 
 * @param {string|array} databases Database name array
 */
function sqlite3(db, databases) {
  this.db = db;
  this.databases = [];
  if (typeof databases === 'string') {
    this.databases.push(databases);
  } else {
    this.databases = databases;
  }
  this.queries = {
    "list_tables": "SELECT `name`, '' as `comment` FROM `sys/tables`",

    "reflect_table": "SELECT `name` FROM `sys/tables` WHERE `name`=?",

    "reflect_pk": "SELECT `name` FROM `sys/columns` WHERE `pk`=1 AND `self`=?",

    "reflect_columns": "SELECT `name`, `dflt_value`, case when `notnull`==1 then 'no' else 'yes' end as `nullable`, `type`, 2147483647 as `max_length` \
	                      FROM  `sys/columns` WHERE  `self`=? ORDER BY `cid`",

    "reflect_belongs_to": "SELECT `self`, `from`, `table`, `to` FROM `sys/foreign_keys` \
	                      WHERE `self` = ? AND ` table` IN ? AND ? like '%' AND ? like '%'",

    "reflect_has_many": "SELECT `self`, `from`, `table`, `to` FROM `sys/foreign_keys` \
	                    WHERE `self` IN ? AND `table` = ? AND ? like '%' AND ? like '%'",

    "reflect_habtm": "SELECT k1.`self`, k1.`from`, k1.`table`, k1.`to`, k2.`self`, k2.`from`, k2.`table`, k2.`to` \
                    FROM `sys/foreign_keys` k1, `sys/foreign_keys` k2 \
                    WHERE ? like '%' AND ? like '%' AND ? like '%' AND ? like '%' AND \
                      k1.`self` = k2.`self` AND k1.`table` = ? AND k2.`table` IN ?"
  };
}

sqlite3.prototype.getSchema = function() {
  var deferred = Q.defer();
  if (this.db) {
    var self = this;
    var sql = this.queries.list_tables;

    this.execQuery(sql, [])
      .then(function(result) {
        var data = {};
        var db = self.databases[0];
        if (result.length > 0) {
          data[db] = {};
          for (var t in result) {
            var tableName = result[t]["name"];
            data[db][tableName] = result[t];
          }
        }
        return self.getAllTableSchema(self.queries, data);
      })
      .then(function(result) {
        deferred.resolve(result);
      })
      .catch(function(err) {
        deferred.reject(err);
      });

  } else {
    var err = new Error("DB is null.");
    deferred.reject(err);
  }
  return deferred.promise;
}

sqlite3.prototype.getAllTableSchema = function(queries, data) {
  var deferred = Q.defer();

  var self = this;
  var funcs = [];
  for (var db in data) {
    var tablesArr = data[db];
    for (var table in tablesArr) {
      funcs.push(this.getTableSchema(queries, db, table));
    }
  }

  Q.all(funcs)
    .then(function(result) {
      for (var i in result) {
        var d = result[i];
        data[d.database][d.table]["PRIMARY"] = d.PRIMARY;
        data[d.database][d.table]["COLUMNS"] = d.COLUMNS;
      }
      deferred.resolve(data);
    })
    .catch(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
}

sqlite3.prototype.getTableSchema = function(queries, database, table) {
  var deferred = Q.defer();

  var obj = {
    "database": database,
    "table": table
  };
  var self = this;
  this.execQuery(queries.reflect_pk, [table, database])
    .then(function(result) {
      if (result.length > 0) {
        obj.PRIMARY = result[0]["name"];
      } else {
        obj.PRIMARY = "";
      }
      sql = queries.reflect_columns;
      return self.execQuery(queries.reflect_columns, [table, database]);
    })
    .then(function(result) {
      obj.COLUMNS = result;
      deferred.resolve(obj);
    })
    .catch(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
}

sqlite3.prototype.execQuery = function(query, args) {
  var deferred = Q.defer();

  this.db.raw(query, args)
    .then(function(result) {
      deferred.resolve(result[0]);
    })
    .catch(function(err) {
      deferred.reject(err);
    });
  return deferred.promise;
}

/**
 * SchemaImpl Class
 * @param {*} data Schema Result
 */
function SchemaImpl(data) {
  this.data = data;
}

SchemaImpl.prototype.isDatabase = function(dbName) {
  return (typeof dbName === 'string' && dbName != "" &&
    this.data[dbName] && typeof this.data[dbName] === 'object');
}

SchemaImpl.prototype.isTable = function(dbName, tableName) {
  if (this.isDatabase(dbName) && typeof this.data[dbName] === 'object' &&
    typeof tableName === 'string' && tableName != "") {
    return (typeof this.data[dbName][tableName] === 'object');
  }
  return false;
}

SchemaImpl.prototype.getTable = function(dbName, tableName) {
  if (this.isTable(dbName, tableName)) {
    return this.data[dbName][tableName];
  }
  return null;
}

SchemaImpl.prototype.getPrimaryKey = function(dbName, tableName) {
  var table = this.getTable(dbName, tableName);
  if (table && table.COLUMNS && table.COLUMNS.length > 0) {
    for (var i in table.COLUMNS) {
      if (table.COLUMNS[i]["name"] == table.PRIMARY) {
        return table.COLUMNS[i];
      }
    }
  }
  return null;
}

SchemaImpl.prototype.getPrimaryKeyName = function(dbName, tableName) {
  var table = this.getTable(dbName, tableName);
  if (table) {
    return table.PRIMARY;
  }
  return null;
}

SchemaImpl.prototype.getColumns = function(dbName, tableName) {
  var table = this.getTable(dbName, tableName);
  if (table && table.COLUMNS) {
    return table.COLUMNS;
  }
  return null;
}

SchemaImpl.prototype.getColumnsName = function(dbName, tableName) {
  var table = this.getTable(dbName, tableName);
  if (table && table.COLUMNS) {
    var cols = [];
    for (var i in table.COLUMNS) {
      var col = table.COLUMNS[i];
      cols.push(col["name"]);
    }
    return cols;
  }
  return null;
}

SchemaImpl.prototype.renderable = function() {
  if (this.data) {
    var d = [];
    for (var db in this.data) {
      var dbObj = {
        "Database": db,
        "Tables": []
      };

      for (var table in this.data[db]) {
        var t = this.data[db][table];
        var primarykey = t.PRIMARY;
        var tableObj = {
          "Table": t["name"],
          "Comment": t["comment"],
          "Columns": []
        };
        for (var c in t.COLUMNS) {
          var col = t.COLUMNS[c];
          tableObj.Columns.push({
            "Field": col["name"],
            "Type": col["type"],
            "Key": (col["name"] == primarykey) ? "PRI" : "",
            "Null": col["nullable"],
            "Default": col["dflt_value"],
            "Extra": "",
            "Comment": ""
          });
        }
        if (t.PRIMARY) {
          tableObj.Indexes = [];
          tableObj.Indexes.push({
            "Key": "Primary",
            "Column": t.PRIMARY,
            "Comment": ""
          });
        }

        dbObj.Tables.push(tableObj);
      }

      d.push(dbObj);
    }
    return d;
  }
  return null;
}

module.exports = sqlite3;
module.exports.impl = SchemaImpl;
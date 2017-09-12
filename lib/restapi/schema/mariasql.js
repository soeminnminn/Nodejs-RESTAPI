/**
 * REST API schema MariaSQL
 */
var Q = require('./../lib/q');

/**
 * MariaSQL Schema Class
 * @param {knex} db Database Query Object 
 * @param {string|array} databases Database name array
 */
function mariasql(db, databases) {
  this.db = db;
  this.databases = [];
  if (typeof databases === 'string') {
    this.databases.push(databases);
  } else {
    this.databases = databases;
  }
  this.queries = {
    // https://mariadb.com/kb/en/the-mariadb-library/information-schema-tables-table/
    "list_tables": "SELECT `TABLE_NAME`,`TABLE_COMMENT` FROM `INFORMATION_SCHEMA`.`TABLES` \
        WHERE `TABLE_SCHEMA` = ?",

    "reflect_table": "SELECT `TABLE_NAME` FROM `INFORMATION_SCHEMA`.`TABLES` \
        WHERE `TABLE_NAME` COLLATE 'utf8_bin' = ? AND `TABLE_SCHEMA` = ?",

    "reflect_pk": "SELECT `COLUMN_NAME` \
        FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `COLUMN_KEY` = 'PRI' AND `TABLE_NAME` = ? AND `TABLE_SCHEMA` = ?",

    // https://mariadb.com/kb/en/the-mariadb-library/information-schema-columns-table/
    "reflect_columns": "SELECT `COLUMN_NAME`, `COLUMN_DEFAULT`, `IS_NULLABLE`, `DATA_TYPE`, `CHARACTER_MAXIMUM_LENGTH`, `EXTRA` \
        FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `TABLE_NAME` = ? AND `TABLE_SCHEMA` = ? ORDER BY `ORDINAL_POSITION`",

    "reflect_belongs_to": "SELECT `TABLE_NAME`,`COLUMN_NAME`, `REFERENCED_TABLE_NAME`,`REFERENCED_COLUMN_NAME` \
        FROM `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` \
        WHERE `TABLE_NAME` COLLATE 'utf8_bin' = ? AND `REFERENCED_TABLE_NAME` COLLATE 'utf8_bin' IN ? \
        AND `TABLE_SCHEMA` = ? AND `REFERENCED_TABLE_SCHEMA` = ?",

    "reflect_has_many": "SELECT `TABLE_NAME`,`COLUMN_NAME`, `REFERENCED_TABLE_NAME`,`REFERENCED_COLUMN_NAME` \
        FROM `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` \
        WHERE `TABLE_NAME` COLLATE 'utf8_bin' IN ? AND `REFERENCED_TABLE_NAME` COLLATE 'utf8_bin' = ? \
        AND `TABLE_SCHEMA` = ? AND `REFERENCED_TABLE_SCHEMA` = ?",

    "reflect_habtm": "SELECT k1.`TABLE_NAME`, k1.`COLUMN_NAME`, k1.`REFERENCED_TABLE_NAME`, k1.`REFERENCED_COLUMN_NAME`, \
        k2.`TABLE_NAME`, k2.`COLUMN_NAME`, k2.`REFERENCED_TABLE_NAME`, k2.`REFERENCED_COLUMN_NAME` \
        FROM `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` k1, `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` k2 \
        WHERE k1.`TABLE_SCHEMA` = ? AND k2.`TABLE_SCHEMA` = ? AND k1.`REFERENCED_TABLE_SCHEMA` = ? \
        AND k2.`REFERENCED_TABLE_SCHEMA` = ? AND k1.`TABLE_NAME` COLLATE 'utf8_bin' = k2.`TABLE_NAME` COLLATE 'utf8_bin' \
        AND k1.`REFERENCED_TABLE_NAME` COLLATE 'utf8_bin' = ? AND k2.`REFERENCED_TABLE_NAME` COLLATE 'utf8_bin' IN ?"
  };
}

mariasql.prototype.getSchema = function() {
  var deferred = Q.defer();
  if (this.db) {
    var self = this;
    var funcs = [];
    var sql = this.queries.list_tables;
    for (var i in this.databases) {
      funcs.push(this.execQuery(sql, this.databases[i]));
    }
    Q.all(funcs)
      .then(function(result) {
        if (result.length == self.databases.length) {
          var data = {};
          for (var d in result) {
            var db = self.databases[d];
            if (result[d].length > 0) {
              data[db] = {};
              for (var t in result[d]) {
                var tableName = result[d][t]["TABLE_NAME"];
                data[db][tableName] = result[d][t];
              }
            }
          }
          return self.getAllTableSchema(self.queries, data);
        } else {
          var err = new Error("DB not found.");
          deferred.reject(err);
        }
      })
      .then(function(result) {
        deferred.resolve(result);
      })
      .fail(function(err) {
        deferred.reject(err);
      });

  } else {
    var err = new Error("DB is null.");
    deferred.reject(err);
  }
  return deferred.promise;
}

mariasql.prototype.getAllTableSchema = function(queries, data) {
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
    .fail(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
}

mariasql.prototype.getTableSchema = function(queries, database, table) {
  var deferred = Q.defer();

  var obj = {
    "database": database,
    "table": table
  };
  var self = this;
  this.execQuery(queries.reflect_pk, [table, database])
    .then(function(result) {
      if (result.length > 0) {
        obj.PRIMARY = result[0]["COLUMN_NAME"];
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
    .fail(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
}

mariasql.prototype.execQuery = function(query, args) {
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
      if (table.COLUMNS[i]["COLUMN_NAME"] == table.PRIMARY) {
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
      cols.push(col["COLUMN_NAME"]);
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
          "Table": t["TABLE_NAME"],
          "Comment": t["TABLE_COMMENT"],
          "Columns": []
        };
        for (var c in t.COLUMNS) {
          var col = t.COLUMNS[c];
          var type = col["DATA_TYPE"];
          if (col["CHARACTER_MAXIMUM_LENGTH"] && type != 'text') {
            type += "(" + col["CHARACTER_MAXIMUM_LENGTH"] + ")";
          }
          tableObj.Columns.push({
            "Field": col["COLUMN_NAME"],
            "Type": type,
            "Key": (col["COLUMN_NAME"] == primarykey) ? "PRI" : "",
            "Null": col["IS_NULLABLE"],
            "Default": col["COLUMN_DEFAULT"],
            "Extra": col["EXTRA"],
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

module.exports = mariasql;
module.exports.impl = SchemaImpl;
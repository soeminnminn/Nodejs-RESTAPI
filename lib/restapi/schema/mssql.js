/**
 * REST API schema Microsoft SQL
 */
var Q = require('./../lib/q');

function mssql(db, databases) {
  this.db = db;
  this.databases = [];
  if (typeof databases === 'string') {
    this.databases.push(databases);
  } else {
    this.databases = databases;
  }
  this.queries = {
    "list_tables": "SELECT [TABLE_NAME], '' AS [TABLE_COMMENT] \
            FROM [INFORMATION_SCHEMA].[TABLES] WHERE [TABLE_CATALOG] = ?",

    "reflect_table": "SELECT [TABLE_NAME] FROM [INFORMATION_SCHEMA].[TABLES] \
	          WHERE  [TABLE_NAME] = ? AND  [TABLE_CATALOG] = ?",

    "reflect_pk": "SELECT [COLUMN_NAME] \
            FROM [INFORMATION_SCHEMA].[TABLE_CONSTRAINTS] tc, [INFORMATION_SCHEMA].[KEY_COLUMN_USAGE] ku \
            WHERE tc.[CONSTRAINT_TYPE] = 'PRIMARY KEY' AND \
              tc.[CONSTRAINT_NAME] = ku.[CONSTRAINT_NAME] AND \
              ku.[TABLE_NAME] = ? AND ku.[TABLE_CATALOG] = ?",

    "reflect_columns": "SELECT [COLUMN_NAME], [COLUMN_DEFAULT], [IS_NULLABLE], [DATA_TYPE], [CHARACTER_MAXIMUM_LENGTH], \
            CASE COLUMNPROPERTY(object_id(TABLE_NAME), COLUMN_NAME, 'IsIdentity') WHEN 1 THEN 'IsIdentity' ELSE '' END AS [EXTRA] \
            FROM [INFORMATION_SCHEMA].[COLUMNS] \
            WHERE [TABLE_NAME] LIKE ? AND [TABLE_CATALOG] = ? \
            ORDER BY [ORDINAL_POSITION]",

    "reflect_belongs_to": "SELECT cu1.[TABLE_NAME], cu1.[COLUMN_NAME], cu2.[TABLE_NAME],cu2.[COLUMN_NAME] \
            FROM [INFORMATION_SCHEMA].REFERENTIAL_CONSTRAINTS rc, \
              [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cu1, [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cu2 \
            WHERE cu1.[CONSTRAINT_NAME] = rc.[CONSTRAINT_NAME] AND \
              cu2.[CONSTRAINT_NAME] = rc.[UNIQUE_CONSTRAINT_NAME] AND cu1.[TABLE_NAME] = ? AND \
              cu2.[TABLE_NAME] IN ? AND cu1.[TABLE_CATALOG] = ? AND cu2.[TABLE_CATALOG] = ?",

    "reflect_has_many": "SELECT cu1.[TABLE_NAME],cu1.[COLUMN_NAME], cu2.[TABLE_NAME],cu2.[COLUMN_NAME] \
            FROM [INFORMATION_SCHEMA].REFERENTIAL_CONSTRAINTS rc, \
              [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cu1, [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cu2 \
            WHERE cu1.[CONSTRAINT_NAME] = rc.[CONSTRAINT_NAME] AND \
              cu2.[CONSTRAINT_NAME] = rc.[UNIQUE_CONSTRAINT_NAME] AND cu1.[TABLE_NAME] IN ? AND \
              cu2.[TABLE_NAME] = ? AND cu1.[TABLE_CATALOG] = ? AND cu2.[TABLE_CATALOG] = ?",

    "reflect_habtm": "SELECT cua1.[TABLE_NAME],cua1.[COLUMN_NAME], cua2.[TABLE_NAME],cua2.[COLUMN_NAME], \
              cub1.[TABLE_NAME],cub1.[COLUMN_NAME], cub2.[TABLE_NAME],cub2.[COLUMN_NAME] \
            FROM [INFORMATION_SCHEMA].REFERENTIAL_CONSTRAINTS rca, [INFORMATION_SCHEMA].REFERENTIAL_CONSTRAINTS rcb, \
              [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cua1, [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cua2, \
              [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cub1, [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cub2  \
            WHERE cua1.[CONSTRAINT_NAME] = rca.[CONSTRAINT_NAME] AND cua2.[CONSTRAINT_NAME] = rca.[UNIQUE_CONSTRAINT_NAME] AND \
              cub1.[CONSTRAINT_NAME] = rcb.[CONSTRAINT_NAME] AND cub2.[CONSTRAINT_NAME] = rcb.[UNIQUE_CONSTRAINT_NAME] AND \
              cua1.[TABLE_CATALOG] = ? AND cub1.[TABLE_CATALOG] = ? AND cua2.[TABLE_CATALOG] = ? AND \
              cub2.[TABLE_CATALOG] = ? AND cua1.[TABLE_NAME] = cub1.[TABLE_NAME] AND cua2.[TABLE_NAME] = ? AND cub2.[TABLE_NAME] IN ?"
  };
}

mssql.prototype.getSchema = function() {
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
      .catch(function(err) {
        deferred.reject(err);
      });

  } else {
    var err = new Error("DB is null.");
    deferred.reject(err);
  }
  return deferred.promise;
}

mssql.prototype.getAllTableSchema = function(queries, data) {
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

mssql.prototype.getTableSchema = function(queries, database, table) {
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
    .catch(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
}

mssql.prototype.execQuery = function(query, args) {
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
  return (typeof dbName === 'string' && dbName != '' &&
    this.data[dbName] && typeof this.data[dbName] === 'object');
}

SchemaImpl.prototype.isTable = function(dbName, tableName) {
  if (this.isDatabase(dbName) && typeof this.data[dbName] === 'object' &&
    typeof tableName === 'string' && tableName != '') {
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
          if (col["CHARACTER_MAXIMUM_LENGTH"] && type != 'text' && type != 'ntext') {
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

module.exports = mssql;
module.exports.impl = SchemaImpl;
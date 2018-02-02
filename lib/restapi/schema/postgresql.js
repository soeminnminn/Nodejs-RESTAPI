/**
 * REST API schema PostgresSQL
 */
var Q = require('./../lib/q');

/**
 * PostgresSQL Schema Class
 * @param {knex} db Database Query Object 
 * @param {string|array} databases Database name array
 */
function postgressql(db, databases) {
  this.db = db;
  this.databases = [];
  if (typeof databases === 'string') {
    this.databases.push(databases);
  } else {
    this.databases = databases;
  }
  this.queries = {
    "list_tables": 'select "table_name",\'\' as "table_comment" from "information_schema"."tables" \
                    where "table_schema" = \'public\' and "table_catalog" = ?',

    "reflect_table": 'select "table_name" from "information_schema"."tables" \
                      where "table_name" = ? and "table_schema" = \'public\' and "table_catalog" = ?',

    "reflect_pk": 'select "column_name" from "information_schema"."table_constraints" tc, "information_schema"."key_column_usage" ku \
				          where tc."constraint_type" = \'PRIMARY KEY\' and tc."constraint_name" = ku."constraint_name" and \
                    ku."table_name" = ? and ku."table_schema" = \'public\' and ku."table_catalog" = ?',

    "reflect_columns": 'select "column_name", "column_default", "is_nullable", "data_type", "character_maximum_length", \'\' as "extra" \
				                from  "information_schema"."columns"  \
				                where "table_name" = ? and "table_schema" = \'public\' and "table_catalog" = ? \
                        order by "ordinal_position"',

    "reflect_belongs_to": 'select cu1."table_name",cu1."column_name", cu2."table_name",cu2."column_name" \
                          from "information_schema".referential_constraints rc, "information_schema".key_column_usage cu1, \
                          "information_schema".key_column_usage cu2 \
                          where cu1."constraint_name" = rc."constraint_name" and cu2."constraint_name" = rc."unique_constraint_name" and \
                            cu1."table_name" = ? and cu2."table_name" in ? and cu1."table_schema" = \'public\' and \
                            cu2."table_schema" = \'public\' and cu1."table_catalog" = ? and cu2."table_catalog" = ?',

    "reflect_has_many": 'select cu1."table_name",cu1."column_name", cu2."table_name",cu2."column_name" \
                      from "information_schema".referential_constraints rc, "information_schema".key_column_usage cu1, \
                      "information_schema".key_column_usage cu2 \
                      where cu1."constraint_name" = rc."constraint_name" and cu2."constraint_name" = rc."unique_constraint_name" and \
                        cu1."table_name" in ? and cu2."table_name" = ? and cu1."table_schema" = \'public\' and \
                        cu2."table_schema" = \'public\' and cu1."table_catalog" = ? and cu2."table_catalog" = ?',

    "reflect_habtm": 'select cua1."table_name",cua1."column_name", cua2."table_name",cua2."column_name", \
                    cub1."table_name",cub1."column_name", cub2."table_name",cub2."column_name" \
                  from "information_schema".referential_constraints rca, "information_schema".referential_constraints rcb, \
                    "information_schema".key_column_usage cua1, "information_schema".key_column_usage cua2, \
                    "information_schema".key_column_usage cub1, "information_schema".key_column_usage cub2 \
                  where cua1."constraint_name" = rca."constraint_name" and cua2."constraint_name" = rca."unique_constraint_name" and \
                    cub1."constraint_name" = rcb."constraint_name" and cub2."constraint_name" = rcb."unique_constraint_name" and \
                    cua1."table_catalog" = ? and cub1."table_catalog" = ? and cua2."table_catalog" = ? and cub2."table_catalog" = ? and \
                    cua1."table_schema" = \'public\' and cub1."table_schema" = \'public\' and cua2."table_schema" = \'public\' and \
                    cub2."table_schema" = \'public\' and cua1."table_name" = cub1."table_name" and cua2."table_name" = ? and cub2."table_name" in ?'
  };
}

postgressql.prototype.getSchema = function() {
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
                var tableName = result[d][t]['table_name'];
                data[db][tableName] = result[d][t];
              }
            }
          }
          return self.getAllTableSchema(self.queries, data);
        } else {
          var err = new Error('DB not found.');
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
    var err = new Error('DB is null.');
    deferred.reject(err);
  }
  return deferred.promise;
}

postgressql.prototype.getAllTableSchema = function(queries, data) {
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
        data[d.database][d.table]['PRIMARY'] = d.PRIMARY;
        data[d.database][d.table]['COLUMNS'] = d.COLUMNS;
      }
      deferred.resolve(data);
    })
    .catch(function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
}

postgressql.prototype.getTableSchema = function(queries, database, table) {
  var deferred = Q.defer();

  var obj = {
    'database': database,
    'table': table
  };
  var self = this;
  this.execQuery(queries.reflect_pk, [table, database])
    .then(function(result) {
      if (result.length > 0) {
        obj.PRIMARY = result[0]["column_name"];
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

postgressql.prototype.execQuery = function(query, args) {
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
      if (table.COLUMNS[i]["column_name"] == table.PRIMARY) {
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
      cols.push(col["column_name"]);
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
          "Table": t["table_name"],
          "Comment": t["table_comment"],
          "Columns": []
        };
        for (var c in t.COLUMNS) {
          var col = t.COLUMNS[c];
          var type = col["data_type"];
          if (col["character_maximum_length"] && type != 'text') {
            type += "(" + col["character_maximum_length"] + ")";
          }
          tableObj.Columns.push({
            "Field": col["column_name"],
            "Type": type,
            "Key": (col["column_name"] == primarykey) ? "PRI" : "",
            "Null": col["is_nullable"],
            "Default": col["column_default"],
            "Extra": "", //col["EXTRA"],
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

module.exports = postgressql;
module.exports.impl = SchemaImpl;
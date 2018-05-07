/**
 * REST API parameter
 */
var U = require('./utils');

var getParamsKeys = [
  "distinct", "filter", "where", "columns", "exclude", "include",
  "order", "page", "start", "length", "join", "group", "having",
  "relation"
];

var postParamsKeys = ["filter", "where", "relation"];

var parameter = module.exports = {};

function parseParam(val, exp) {
  if (!U.isEmpty(val)) {
    if (Array.isArray(val)) {
      for (var i in val) {
        var v = '' + val[i];
        if (!U.isEmpty(exp)) {
          var regex = new RegExp("[^" + exp + "]", 'g');
          val[i] = v.replace(regex, '');
        }
      }

    } else {
      var v = '' + val;
      if (!U.isEmpty(exp)) {
        var regex = new RegExp("[^" + exp + "]", 'g');
        val = v.replace(regex, '');
      }
    }
    return val;
  }
  return null;
}

function parseParamInt(val, def) {
  if (!U.isEmpty(val)) {
    if (Array.isArray(val)) {
      for (var i in val) {
        var v = parseParam(val[i], '0-9,');
        if (!U.isEmpty(val)) {
          val[i] = parseInt(v);
        }
      }
    } else {
      val = parseParam(val, '0-9,');
      if (!U.isEmpty(val)) {
        val = parseInt(val);
      }
    }
    return val;
  }
  return def;
}

function toArray(val, splitter) {
  var values = [];
  if (typeof val === 'string' && val != '') {
    if (!U.isEmpty(splitter)) {
      values = val.split(splitter);
    } else {
      values.push(val);
    }
  } else if (typeof val === 'object' && Array.isArray(val)) {
    for (var i in val) {
      if (typeof val[i] === 'string' && val[i] != '') {
        if (!U.isEmpty(splitter)) {
          var t1 = val[i].split(splitter);
          for (var j in t1) {
            values.push(t1[j]);
          }
        } else {
          values.push(val[i]);
        }
      }
    }
  }
  return values;
}

function parseModelUrl(api, params, model, arr) {
  if (!params) {
    params = {};
  }
  var val = null;
  var temp = parseParam(arr[0], 'a-zA-Z0-9\-_,.*');
  if (api.models.isModelFunction(model, temp)) {
    var method = temp;
    arr.shift();
    if (arr.length > 0) {
      val = parseParam(arr[0], 'a-zA-Z0-9\-_,.*');
    }
    params.model = {
      "name": model,
      "method": method
    };
    if (!U.isEmpty(val)) {
      params.model.values = val.split(',');
    }
  }
  return params;
}

function parseOrder(order) {
  var val = parseParam(order, 'a-zA-Z0-9\-_,.*\(\)@');
  var values = toArray(val);
  var sort = 'ASC';
  for (var i in values) {
    var arr = values[i].split(',');
    if (arr.length == 1) {
      arr.push(sort);
    }
    sort = arr[1] = arr[1].toUpperCase();
    values[i] = arr.join(' ');
  }
  return values.join(', ');
}

function parseExclude(exclude) {
  var val = parseParam(exclude, 'a-zA-Z0-9\-_,.*\(\)@');
  var excludeArr = toArray(val, ',');
  for (var i in excludeArr) {
    excludeArr[i] = parseParam(excludeArr[i], 'a-zA-Z0-9\-_.*');
  }
  return excludeArr;
}

function isColumnEqual(table, col1, col2) {
  if (U.isEmpty(col1)) col1 = '';
  if (U.isEmpty(col2)) col2 = '';
  if (col1 == col2) {
    return true;
  }
  if (col1 && col2) {
    col1 = col1.replace(new RegExp('^' + table + '.', 'i'), '').toLowerCase();
    col2 = col2.replace(new RegExp('^' + table + '.', 'i'), '').toLowerCase();
    return col1 == col2;
  }
  return false;
}

function isColumnContains(table, arr, col) {
  if (U.isEmpty(col)) col = '';
  var tcol = table + '.' + col;
  return !!~arr.indexOf(col) || !!~arr.indexOf(tcol);
}

function parseColumns(api, table, columns, userColumns, exclude) {
  var cols = [];
  var excludeArr = parseExclude(exclude);

  var userCols = [];
  var userColsVals = [];
  if (userColumns) {
    if (Array.isArray(userColumns)) {
      for (var i in userColumns) {
        userColumns[i] = userColumns[i].replace(/([^\s\(\)\,]+)\((.*)\)/g, function(m1, m2, m3) {
          userColsVals.push(m3);
          return m2 + "(#" + (userColsVals.length - 1) + ")";
        });

        var uCols = userColumns[i].split(',');
        for (var j in uCols) {
          userCols.push(parseParam(uCols[j], 'a-zA-Z0-9\-_,.*\(\)@#'));
        }
      }

    } else if (typeof userColumns === 'string') {
      userColumns = userColumns.replace(/([^\s\(\)\,]+)\((.*)\)/g, function(m1, m2, m3) {
        userColsVals.push(m3);
        return m2 + "(#" + (userColsVals.length - 1) + ")";
      });

      var uCols = userColumns.split(',');
      for (var j in uCols) {
        userCols.push(parseParam(uCols[j], 'a-zA-Z0-9\-_,.*\(\)@#'));
      }
    }
  }

  var columnsArr = userCols.length > 0 ? userCols : [];
  if (excludeArr.length > 0) {
    var tColumns = [];
    for (var i in columns) {
      var col = columns[i];
      if (!isColumnContains(table, excludeArr, col)) {
        tColumns.push(col);
      }
    }

    if (columnsArr.length > 0) {
      var tColumns1 = [];
      for (var i in columnsArr) {
        var col = columnsArr[i];
        if (!isColumnContains(table, tColumns, col)) {
          tColumns1.push(col);
        }
      }
      for (var i in tColumns) {
        tColumns1.push(tColumns[i]);
      }
      columnsArr = tColumns1;

    } else {
      columnsArr = tColumns;
    }
  }

  for (var i in columnsArr) {
    var col = parseParam(columnsArr[i]);
    var colName = col;
    if (!!~col.indexOf('@')) {
      col = col.replace(/^([^@]+)@([^@]+)$/g, function(x, x1, x2) {
        colName = x2;
        return x1 + " AS " + x2;
      });

    } else if (/[^\(\)\.]/g.test(col) && isColumnContains(table, columns, col)) {
      col = table + '.' + col;
    }

    col = col.replace(/([^\s\(\)\,]+)\(#([0-9]+)\)/i, function(m1, m2, m3) {
      var val = userColsVals[parseInt(m3)];
      return m2 + "(" + val + ")";
    });
    cols.push(col);
  }
  return cols;
}

function parsePage(page, start, length, defStart, defSize) {
  var result = {};
  if (typeof start === 'string') {
    start = parseParamInt(start, defStart);
  }

  if (typeof length === 'string') {
    length = parseParamInt(length, defSize);
  }

  if (length) {
    result.length = length;

  } else if (page && Array.isArray(page) && page.length == 2) {
    result.length = length = page[1];

  } else {
    length = defSize;
  }

  if (start) {
    result.start = start;
  }
  if (page) {
    if (typeof page === 'string') {
      var valArr = parseParam(page, '0-9,').split(",");
      var p = parseParamInt(valArr[0], defStart);
      length = parseParamInt(valArr[1], length);
      result.start = p * length;
      result.length = length;

    } else if (Array.isArray(page) && page.length > 0) {
      if (page.length == 1) {
        result.start = page[0] * length;

      } else if (page.length == 2) {
        result.start = page[0] * page[1];
        result.length = page[1];
      }
    }
  }

  return result;
}

function parseJoin(api, join) {
  var val = '';
  if (typeof join === 'string') {
    val = join.replace(/\"/g, "'");
  } else {
    val = join;
  }
  var joins = [];
  var list = toArray(val);
  for (var i in list) {
    var st = ('' + list[i]).split(',');
    if (st.length > 1) {
      var jType = 'inner';
      if (!!~[
          'inner', 'left', 'leftouter', 'right',
          'rightouter', 'outer', 'fullouter', 'cross'
        ].indexOf(st[0].toLowerCase())) {

        jType = st.shift().toLowerCase();
        if (jType == 'leftouter') {
          jType = 'left outer';
        } else if (jType == 'rightouter') {
          jType = 'right outer';
        } else if (jType == 'fullouter') {
          jType = 'full outer';
        }
      }
      jType += ' join';

      var table = st.shift();
      if (table) {
        var cond = api.filter.convertFilter(st.join(','), '');
        joins.push({
          'type': jType,
          'table': table,
          'condition': cond
        });
      }
    }
  }
  return joins;
}

function parseGroup(api, group) {
  var val = parseParam(group, 'a-zA-Z0-9\-_,.*\(\)@');
  var values = toArray(val, ',');
  if (values.length > 0) {
    for (var i in values) {
      values[i] = parseParam(values[i], 'a-zA-Z0-9\-_,.*\(\)');
    }
    return values;
  }
  return null;
}

function parseRelations(api, relation) {
  var val = parseParam(relation, 'a-zA-Z0-9\-_,.');
  if (!Array.isArray(val)) {
    val = [val];
  }
  var values = [];
  for (var i in val) {
    var rel = val[i];
    if (!U.isEmpty(rel)) {
      rel = rel.replace(/^([^\.\,]+),/, '#primary.$1,');
      rel = rel.replace(/([^\.\,]+).([^\.\,]+)/g, '"$1": {"column": "$2"}');
      rel = "{" + rel + "}";
      values.push(rel);
    }
  }
  return values;
}

function applyRelations(params, val) {
  if (U.isEmpty(val)) {
    var relOrder = [];
    for (var i in params.tables) {
      relOrder.push(params.tables[i].table);
    }
    params['tablesOrder'] = relOrder;
    return;
  }

  var relations = [];
  for (var i in val) {
    var rel = val[i];
    rel = rel.replace(/#primary/g, params.table);
    if (typeof rel === 'string') {
      var relObj = JSON.parse(rel);
      for (var j in relObj) {
        if (params.tables[j].primaryKey == relObj[j].column) {
          relObj.primary = j;
          break;
        }
      }
      relations.push(relObj);

    } else {
      relations.push(rel);
    }
  }

  params['relations'] = [];
  for (var i in relations) {
    var r = relations[i];
    var primary = {
      "column": r[r.primary].column,
      "table": r.primary
    };
    var foreign = {};
    for (var j in r) {
      if (!~[r.primary, "primary"].indexOf(j)) {
        foreign = {
          "column": r[j].column,
          "table": j
        };
        break;
      }
    }
    params['relations'].push({
      "primary": primary,
      "foreign": foreign
    });

    if (!U.isEmpty(params.tables[foreign.table])) {
      var rel = {};
      rel[foreign.column] = {
        "table": primary.table,
        "column": primary.column
      };
      params.tables[foreign.table].relations = rel;
    }
  }

  var relTables = [];
  for (var i in params.tables) {
    var rel = {
      'table': params.tables[i].table,
      'relations': []
    };
    if (params.tables[i].relations) {
      for (var j in params.tables[i].relations) {
        rel.relations.push(params.tables[i].relations[j].table);
      }
    }
    relTables.push(rel);
  }

  if (relTables.length > 1) {
    var relOrder = {};
    for (var i = 0; i < relTables.length; i++) {
      var current = relTables[i];
      var idx = i;
      for (var j = i + 1; j < relTables.length; j++) {
        if (relTables[j].relations && relTables[j].relations.length > 0) {
          if (relTables[j].relations.indexOf(current.table) > -1) {
            idx = j + 1;
          }
        }
      }
      relOrder["#" + (idx + 1)] = current.table;
    }
    var keys = Object.keys(relOrder).sort();
    var tablesOrder = [];
    for (var i in keys) {
      tablesOrder.push(relOrder[keys[i]]);
    }

    params['tablesOrder'] = tablesOrder.reverse();
  }
}

parameter.parseUrl = function(api, params, url) {
  if (!params) {
    params = {};
  }
  if (url && url != '/') {
    var tempUrl = url.replace(/^[/]{1,2}([^\?]+)(.*)$/, '$1');
    var arr = tempUrl.split('/');
    for (var i in arr) {
      arr[i] = U.decodeUrl(arr[i]);
    }

    if (arr.length > 0) {
      var database = api.settings.maindb;
      var table = null;
      var tables = {};
      var temp = parseParam(arr[0], 'a-zA-Z0-9\-_,.*');

      if (api.models.isModel(temp)) {
        arr.shift();
        return parseModelUrl(api, params, temp, arr);

      } else if (api.schema.isDatabase(temp)) {
        database = temp;
        arr.shift();

      }
      params.database = database;

      while (arr.length > 0) {
        temp = parseParam(arr[0], 'a-zA-Z0-9\-_,.*');
        if (api.schema.isTable(database, temp)) {
          table = temp;
          if (U.isEmpty(params.table)) {
            params.table = table;
          }
          if (U.isEmpty(tables[table])) {
            var primaryKey = api.schema.getPrimaryKeyName(database, table);
            var columns = api.schema.getColumnsName(database, table);
            tables[table] = {
              "database": database,
              "table": temp,
              "type": '',
              "primaryKey": primaryKey,
              "columns": columns
            };
            if (params.table == table) {
              tables[table].type = 'primary';
              tables[table].filters = {};
            } else {
              tables[table].type = 'foreign';
            }
          }
          arr.shift();

        } else if (table && tables[params.table]) {
          var urlfilter = parseParam(arr.shift(), 'a-zA-Z0-9\-_,.*');
          if (!U.isEmpty(urlfilter)) {
            var primaryKey = tables[params.table].primaryKey;
            if (!U.isEmpty(primaryKey)) {
              var idFilter = primaryKey;
              var values = urlfilter.split(',');
              if (values.length == 1) {
                idFilter += ",eq," + values[0];
              } else if (values.length > 1) {
                idFilter += ",in,[" + values.join(',') + "]";
              }
              tables[params.table].filters['primary'] = api.filter.convertFilter(idFilter);
              tables[params.table]['ids'] = values;
            }
          }

        } else {
          return params;
        }
      }
      params['tables'] = tables;
    }
  }
  return params;
}

parameter.parseQuery = function(api, params, query, method) {
  if (typeof query === 'object') {
    method = (method || 'GET').toUpperCase();
    var keys = (method == 'GET') ? getParamsKeys : postParamsKeys;
    var pageSize = api.settings.pagesize;
    var tempQuery = {};

    for (var i in query) {
      var key = i.replace(/^([\w]+)(\[\]|)$/, '$1').toLowerCase();
      if (key == 'w') key = 'where';
      if (!~keys.indexOf(key)) continue;

      var val = U.decodeUrl(query[i]);
      if (key == 'include' || key == 'exclude') {
        tempQuery[key] = parseParam(val, 'a-zA-Z0-9\-_,.*\(\)@');

      } else if (key == 'columns') {
        tempQuery[key] = parseParam(val);

      } else if (key == 'where') {
        tempQuery[key] = val.replace(/\"/g, "'");

      } else if (key == 'filter' || key == 'having') {
        val = val.replace(/\"/g, "'");
        tempQuery[key] = api.filter.convertFilter(val);

      } else if (key == 'start') {
        tempQuery[key] = parseParamInt(val, 0);

      } else if (key == 'length') {
        tempQuery[key] = parseParamInt(val, pageSize);

      } else if (key == 'page') {
        tempQuery[key] = parseParam(val, '0-9,');

      } else if (key == 'join') {
        tempQuery[key] = parseJoin(api, val);

      } else if (key == 'group') {
        tempQuery[key] = parseGroup(api, val);

      } else if (key == 'order') {
        tempQuery[key] = parseOrder(val);

      } else if (key == 'relation') {
        tempQuery[key] = parseRelations(api, val);

      } else if (key == 'distinct') {
        tempQuery[key] = true;

      }
    }

    if (tempQuery['page'] || tempQuery['start'] || tempQuery['length']) {
      var result = parsePage(tempQuery['page'], tempQuery['start'], tempQuery['length'], 0, pageSize);
      for (var i in result) {
        tempQuery[i] = result[i];
      }
      tempQuery['page'] = null;
    }

    if (params && params.database && params.tables) {
      var database = params.database;

      if (tempQuery['include']) {
        var val = tempQuery['include'];
        var valArr = val.split(',');
        for (var i in valArr) {
          var table = valArr[i];
          if (api.schema.isTable(database, table) && typeof params.tables[table] === 'undefined') {
            var primaryKey = api.schema.getPrimaryKeyName(database, table);
            var columns = api.schema.getColumnsName(database, table);
            params.tables[table] = {
              "database": database,
              "table": table,
              "type": "include",
              "primaryKey": primaryKey,
              "columns": columns
            };
          }
        }
      }

      for (var i in params.tables) {
        var table = params.tables[i].table;
        var columns = !tempQuery['join'] ? params.tables[i].columns : [];
        params.tables[i].columns = parseColumns(api, table, columns, tempQuery['columns'], tempQuery['exclude']);
      }

      var key = params.table;
      if (params.tables[key]) {
        if (tempQuery['filter']) {
          params.tables[key].filters['filter'] = tempQuery['filter'];
        }
        if (tempQuery['where']) {
          params.tables[key].filters['where'] = tempQuery['where'];
        }
        if (tempQuery['order']) {
          params.tables[key].order = tempQuery['order'];
        }
        if (tempQuery['start']) {
          params.tables[key].start = tempQuery['start'];
        }
        if (tempQuery['length']) {
          params.tables[key].length = tempQuery['length'];
        }
        if (tempQuery['join']) {
          params.tables[key].joins = tempQuery['join'];
        }
        if (tempQuery['group']) {
          params.tables[key].group = tempQuery['group'];
        }
        if (tempQuery['having']) {
          params.tables[key].having = tempQuery['having'];
        }
        if (tempQuery['distinct']) {
          params.tables[key].distinct = tempQuery['distinct'];
        }
        if (params.tables[key].filters) {
          params.tables[key].where = [];
          for (var j in params.tables[key].filters) {
            params.tables[key].where.push(params.tables[key].filters[j]);
          }
        }
      }
      applyRelations(params, tempQuery['relation']);
    }
  }
  return params;
}

parameter.shrinkQuery = function(query) {
  var result = {};
  var keys = getParamsKeys;
  if (typeof query === 'object') {
    for (var i in query) {
      var key = i.replace(/^([\w]+)(\[\]|)$/, '$1');
      if (key == 'w') key = 'where';
      if (!~keys.indexOf(key)) {
        result[key] = U.decodeUrl(query[i]);
      }
    }
  }
  return result;
}
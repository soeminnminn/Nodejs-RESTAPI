/**
 * REST API parameter
 */
var U = require('./utils');

var getParamsKeys = [
  "filter", "where", "columns", "exclude", "include", "order",
  "page", "start", "length", "join", "group", "having"
];

var postParamsKeys = ["filter", "where"];

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

  var val = parseParam(userColumns, 'a-zA-Z0-9\-_,.*\(\)@');
  var columnsArr = toArray(val, ',');
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
    var col = parseParam(columnsArr[i], 'a-zA-Z0-9\-_.*\(\)@');
    var colName = col;
    if (!!~col.indexOf('@')) {
      col = col.replace(/^([^@]+)@([^@]+)$/g, function(x, x1, x2) {
        colName = x2;
        return x1 + " AS " + x2;
      });

    } else if (/[^\(\)\.]/g.test(col) && isColumnContains(table, columns, col)) {
      col = table + '.' + col;
    }
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

parameter.parseUrl = function(api, params, url) {
  if (!params) {
    params = {};
  }
  if (url && url != '/') {
    var tempUrl = url.replace(/^[/]{1,2}([^\?]+)(.*)$/, '$1');
    var arr = tempUrl.split('/');
    for (var i in arr) {
      arr[i] = U.urlDecode(arr[i]);
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
              "type": "primary",
              "primaryKey": primaryKey,
              "columns": columns,
              "filters": {}
            };
          }
          arr.shift();

        } else if (table && tables[table]) {
          var urlfilter = parseParam(arr.shift(), 'a-zA-Z0-9\-_,.*');
          if (!U.isEmpty(urlfilter)) {
            var primaryKey = tables[table].primaryKey;
            if (!U.isEmpty(primaryKey)) {
              var primary = primaryKey;
              var values = urlfilter.split(',');
              if (values.length == 1) {
                primary += ",eq";
                primary += "," + values[0];
              } else if (values.length > 1) {
                primary += ",in";
                primary += ",[" + values.join(',') + "]";
              }
              tables[table].filters['primary'] = api.filter.convertFilter(primary);
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
    var keys = !!~['GET', 'OPTIONS'].indexOf(method) ? getParamsKeys : postParamsKeys;
    var pageSize = api.settings.pagesize;
    var tempQuery = {};

    for (var i in query) {
      var key = i.replace(/^([\w]+)(\[\]|)$/, '$1').toLowerCase();
      if (key == 'w') key = 'where';
      if (!~keys.indexOf(key)) continue;

      var val = U.urlDecode(query[i]);

      if (key == 'columns' || key == 'include' || key == 'exclude') {
        tempQuery[key] = parseParam(val, 'a-zA-Z0-9\-_,.*\(\)@');

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
        params['include'] = [];
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
              "columns": columns,
              'filters': {}
            };
          }
        }
      }

      for (var i in params.tables) {
        var table = params.tables[i].table;
        var columns = params.tables[i].columns;

        if (tempQuery['filter']) {
          params.tables[i].filters['filter'] = tempQuery['filter'];
        }
        if (tempQuery['where']) {
          params.tables[i].filters['where'] = tempQuery['where'];
        }
        if (tempQuery['order']) {
          params.tables[i].order = tempQuery['order'];
        }
        if (tempQuery['start']) {
          params.tables[i].start = tempQuery['start'];
        }
        if (tempQuery['length']) {
          params.tables[i].length = tempQuery['length'];
        }
        if (tempQuery['join']) {
          params.tables[i].joins = tempQuery['join'];
        }
        if (tempQuery['group']) {
          params.tables[i].group = tempQuery['group'];
        }
        if (tempQuery['having']) {
          params.tables[i].having = tempQuery['having'];
        }
        if (params.tables[i].filters) {
          params.tables[i].where = [];
          for (var j in params.tables[i].filters) {
            params.tables[i].where.push(params.tables[i].filters[j]);
          }
        }
        params.tables[i].columns = parseColumns(api, table, columns, tempQuery['columns'], tempQuery['exclude']);
      }
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
        result[key] = U.urlDecode(query[i]);
      }
    }
  }
  return result;
}

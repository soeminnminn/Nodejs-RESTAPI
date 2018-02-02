/**
 * REST API schema
 */
var Q = require('./../lib/q');
var CACHE = require('./../lib/cache');

var CACHE_KEY = "CACHE_SCHEMA";

var schema = module.exports = {};

schema.mysql = require('./mysql');
schema.mssql = require('./mssql');
schema.postgresql = require('./postgresql');
schema.sqlite3 = require('./sqlite3');
schema.oracle = require('./oracle');
schema.mariasql = require('./mariasql');

schema.init = function(options, db) {
  var deferred = Q.defer();
  var name = options.name || 'mysql';
  var databases = options.databases;

  if (!schema[name]) {
    var err = new Error('Schema name not found.');
    deferred.reject(err);
    return deferred.promise;
  }

  var memoryCache = CACHE.caching({
    store: 'memory',
    max: 100,
    ttl: 3600
  });
  memoryCache.wrap(CACHE_KEY, function(cb) {
    var obj = new schema[name](db, databases);
    obj.getSchema()
      .then(function(result) {
        cb(0, result);
      })
      .fail(function(err) {
        cb(err, {});
      });

  }, function(err, result) {
    if (err) {
      deferred.reject(err);
    } else {
      var obj = new schema[name].impl(result);
      deferred.resolve(obj);
    }
  });

  return deferred.promise;
}

var HTML_TEMPLETE = [
  "<!DOCTYPE html>",
  "<html>",
  "<head>",
  "<meta charset=utf-8>",
  "<meta content='IE=edge' http-equiv=X-UA-Compatible>",
  "<meta content='width=device-width,initial-scale=1' name='viewport'>",
  "<title>Data Schema</title>",
  "<style type='text/css'>",
  ".container { width: 934px; margin: auto; padding: 8px 16px; overflow-x: auto; }",
  ".pagetitle { display: block; width: 100%; border: 1px solid #ccc; margin-bottom: 16px; border-radius: 8px; }",
  ".pagetitle h2 { font-weight: bold; font-size: 14pt; padding: 0px 0px; text-align: center; }",
  ".table-content { margin-top: 16px; }",
  ".header { display: block; width: 100%; height: 16px; font-weight: bold; color: #fff; background: #337ab7; border-bottom: 1px solid #ccc; border-radius: 8px 8px 0 0; text-align: center; padding: 6px 0; cursor: pointer; }",
  "input[type=checkbox].toggle { display: none; }",
  "input[type=checkbox].toggle + table { display: none; }",
  "input[type=checkbox].toggle:checked + table { display: table; }",
  "table { width: 100%; }",
  "td { padding: 4px 8px; }",
  "td { border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; }",
  "td:first-child { border-left: 1px solid #ccc; }",
  "td.subhead { background: #e7e7e7; }",
  "td.subtitle { background: #f0f0f0; font-size: 9pt; }",
  "tr td.subhead:first-child { font-weight: 600; }",
  "</style>",
  "</head>",
  "<body>",
  "<div class='container'>",
  "<% this.data %>",
  "</div>",
  "</body>",
  "</html>"
];

var DATABASE_TEMPLETE = [
  "<div class='row'>",
  "<div class='pagetitle'><h2><% this.Database %> - Tables Structure</h2></div>",
  "<% this.data %>",
  "</div>",
];

var TABLE_TEMPLETE = [
  '<div id="table-<% this.Table %>" class="table-content">',
  '<label class="header" for="<% this.Table %>-toggle"><% this.Table %></label>',
  '<input id="<% this.Table %>-toggle" class="toggle" type="checkbox" checked />',
  '<table cellspacing="0" cellpadding="0">',
  '<tbody>',
  '<tr>',
  '<td colspan="7" class="subhead">Columns</td>',
  '</tr>',
  '<tr>',
  '<td class="subtitle">Name</td>',
  '<td class="subtitle">Type</td>',
  '<td class="subtitle">Null</td>',
  '<td class="subtitle">Key</td>',
  '<td class="subtitle">Default</td>',
  '<td class="subtitle">Extra</td>',
  '<td class="subtitle">Comment</td>',
  '</tr>',
  '<% for(var c in this.Columns) { %>',
  '<tr>',
  '<td><% this.Columns[c].Field %></td>',
  '<td><% this.Columns[c].Type %></td>',
  '<td><% this.Columns[c].Null %></td>',
  '<td><% this.Columns[c].Key %></td>',
  '<td><% this.Columns[c].Default %></td>',
  '<td><% this.Columns[c].Extra %></td>',
  '<td><% this.Columns[c].Comment %></td>',
  '</tr>',
  '<% } %>',
  '<tr>',
  '<td colspan="7" class="subhead">Indexes</td>',
  '</tr>',
  '<tr>',
  '<td colspan="2" class="subtitle">Key</td>',
  '<td colspan="2" class="subtitle">Column</td>',
  '<td colspan="3" class="subtitle">Comment</td>',
  '</tr>',
  '<% for(var i in this.Indexes) { %>',
  '<tr>',
  '<td colspan="2"><% this.Indexes[i].Key %></td>',
  '<td colspan="2"><% this.Indexes[i].Column %></td>',
  '<td colspan="3"><% this.Indexes[i].Comment %></td>',
  '</tr>',
  '<% } %>',
  '<tr>',
  '<td colspan="2" class="subhead">Comments</td>',
  '<td colspan="5" class="subhead"><% this.Comment %></td>',
  '</tr>',
  '</tbody>',
  '</table>',
  '</div>'
];

function templateEngine(html, options) {
  var evaluate = /<%([^%>]+)?%>/g;
  var codeBlock = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g;
  var code = 'var r=[];\n';
  var cursor = 0;
  var match;
  var add = function(line, js) {
    if (js) {
      code += line.match(codeBlock) ? line + '\n' : 'r.push(' + line + ');\n';
    } else {
      code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '';
    }
    return add;
  }
  while (match = evaluate.exec(html)) {
    add(html.slice(cursor, match.index))(match[1], true);
    cursor = match.index + match[0].length;
  }
  add(html.substr(cursor, html.length - cursor));
  code += 'return r.join("");';
  code = code.replace(/[\r\t\n]/g, '');
  return new Function(code).apply(options);
}

schema.render = function(impl, req, res, next) {
  var json = impl.renderable();
  if (typeof req.query.json !== 'undefined') {
    res.setHeader('Content-type', 'application/json');
    res.end(JSON.stringify(json));

  } else {
    var data = "";
    for (var i in json) {
      var database = json[i].Database;
      var result = json[i].Tables;
      var tableData = "";
      for (var j in result) {
        tableData += templateEngine(TABLE_TEMPLETE.join(""), result[j]);
      }
      data += templateEngine(DATABASE_TEMPLETE.join(""), { 'Database': database, 'data': tableData });
    }
    var html = templateEngine(HTML_TEMPLETE.join(""), { data: data });

    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  }
}
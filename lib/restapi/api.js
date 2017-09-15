/**
 * REST API main
 */
var EventEmitter = require('events').EventEmitter;
var KNEX = require('knex');
var FORM = require('formidable');

var MIXIN = require('./lib/merge-descriptors');
var AUTH = require('./lib/basic-auth');
var SCHEMA = require('./schema');
var FILTERS = require('./filters');
var PARAMS = require('./parameter');
var Q = require('./lib/q');
var U = require('./utils');
var CMD = require('./commands');
var HELP = require('./help');
var MODELS = require('./models');

var RestApi = module.exports = {
  settings: { "driver": "mysql", "pagesize": 20 },
  db: null,
  schema: null,
  filter: null,
  rootpath: U.getRootPath(),
  apppath: __dirname,
  models: MODELS
};

RestApi.init = function(config) {
  var dbConfig = {
    "client": config.driver || "mysql",
    "connection": {
      "host": "localhost",
      "user": "root"
    }
  };
  if (dbConfig.client == "postgresql") {
    dbConfig.client = "pg";
  }
  var conn = config.connection;
  if (typeof conn === 'object') {
    for (var i in conn) {
      if (!!~["version", "searchPath", "pool"].indexOf(i)) {
        dbConfig[i] = conn[i];
      } else if (i == "string") {
        dbConfig["connection"] = conn[i];
      } else if (typeof dbConfig["connection"] == 'object') {
        dbConfig["connection"][i] = conn[i];
      }
      if (i == "database") {
        config.maindb = conn[i];
      }
    }
  }

  MIXIN(RestApi, EventEmitter.prototype, false);
  MIXIN(this.settings, config, false);

  var maindb = config.maindb;
  if (maindb && maindb != '') {
    if (!this.settings.databases) {
      this.settings.databases = [maindb];
    } else {
      if (!~this.settings.databases.indexOf(maindb)) {
        this.settings.databases.push(maindb);
      }
    }
  }

  if (this.settings.modelBasePath) {
    this.models.setBasePath(this.settings.modelBasePath);
  }

  this.db = KNEX(dbConfig);

  var driverName = this.settings.driver;
  this.schema = new SCHEMA[driverName]();
  this.filter = FILTERS[driverName];

  var self = this;
  return function(req, res, next) {
    res.api = self;
    var schemaConfig = {
      "name": driverName,
      "databases": self.settings.databases
    };
    SCHEMA.init(schemaConfig, self.db)
      .then(function(result) {
        self.schema = result;
        handle(self, req, res, next);
      })
      .fail(function(err) {
        if (err) {
          console.error(err);
        }
        next(err);
      });
  };
}

RestApi.getDB = function() {
  return this.db;
}

RestApi.getHeaders = function(headers) {
  return {
    'Access-Control-Allow-Origin': headers.origin || "*",
    'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN',
    'Access-Control-Allow-Methods': CMD.COMMANDS.join(', '),
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Max-Age': 1728000
  };
}

RestApi.close = function() {
  if (this.db && typeof this.db.destroy === 'function') {
    this.db.destroy(function(err) {});
  }
}

RestApi.applyModel = function() {
  if (arguments.length > 0) {
    if (arguments.length == 2) {
      this.models.push({
        "name": arguments[0],
        "model": arguments[1]
      });

    } else if (typeof arguments[0] === 'string') {
      for (var i in arguments) {
        this.models.load(arguments[i]);
      }

    } else if (typeof arguments[0] === 'object') {
      var args = arguments;
      if (Array.isArray(arguments[0])) {
        args = arguments[0];
      }
      for (var i in args) {
        var obj = args[i];
        if (typeof obj === 'object') {
          this.models.push(args[i]);
        } else {
          this.models.load(args[i]);
        }
      }
    }
  }
}

RestApi.execute = function(method, objName, args, cb) {
  if (typeof args === 'function') {
    cb = args;
    args = {};
  }
  if (typeof objName === 'function') {
    cb = objName;
    args = {};
    objName = method;
    method = null;

  } else if (typeof objName === 'object') {
    args = objName;
    objName = method;
    method = null;
  }
  if (typeof args !== 'object') {
    args = {};
  }
  if (U.isEmpty(objName)) {
    throw new Error("Invalid parameters.");
  }
  this.emit('execute');
  var deferred = Q.defer();
  if (!cb) {
    cb = function(err, result) {
      if (!err) {
        deferred.reject(err);
      } else {
        deferred.resolve(result);
      }
    }
  }

  if (this.models.isModel(objName)) {
    var model = this.models.getModel(objName);
    if (!U.isEmpty(model) && typeof model[method] === 'function') {
      args.settings = this.settings;
      args.db = this.db;
      model[method](args, cb);

    } else {
      cb(new Error("Not found."), 0);
    }

  } else {
    method = method || 'GET';
    if (args.w) {
      args.where = Array.isArray(args.w) ? args.w : [args.w];

    } else if (args.where && !Array.isArray(args.where)) {
      args.where = [args.where];
    }

    var table = {
      "database": this.settings.maindb,
      "table": objName,
      "type": "primary"
    };

    // columns [], where [], joins [], group '', having '', order '', start #, length #,
    for(var i in args) {
      if (!!~['columns', 'where', 'joins', 'group', 'having', 'order', 'start', 'length'].indexOf(i)) {
        table[i] = args[i];
      }
    }

    var params = { "tables": {} };
    params.table = objName;
    params.tables[objName] = table;
    if (args.data) {
      params.body = args.data;

    } else if (args.body) {
      params.body = args.body;
    }

    executeCommand(this, method, params, cb);
  }
  return deferred.promise;
}

function errorNotFound(api, req, res, next) {
  var err = new Error('Not found.');
  err.status = 404;
  pipe(api, req, res, next)(err, 0);
}

function errorAccessDenied(api, req, res, next) {
  var err = new Error('Access denied.');
  err.status = 401;
  pipe(api, req, res, next)(err, 0);
}

function isAuthorized(api, req) {
  var users = api.settings.users;
  if (typeof api.settings.isAuthorized === 'function') {
    var credentials = AUTH(req);
    return api.settings.isAuthorized(credentials);

  } else if (!U.isEmpty(users)) {
    if (!Array.isArray(users)) {
      users = [users];
    }
    var credentials = AUTH(req);
    if (U.isEmpty(credentials)) {
      return false;
    }
    var result = false;
    for (var i in users) {
      if (users[i].name == credentials.name &&
        users[i].pass == credentials.pass) {
        result = true;
        break;
      }
    }
    return result;
  }
  return true;
}

function requestAuthentication(res) {
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Basic Authentication"' });
  res.end('Authorization is needed');
}

function handle(api, req, res, next) {
  api.emit('handle');
  var authorized = isAuthorized(api, req);
  var url = req.url;
  if (/^(\/|)--help$/i.test(url)) {
    if (!authorized) {
      api.emit('unauthorized');
      requestAuthentication(res);
    } else {
      HELP.render(api.apppath, req, res, next);
    }
    return;

  } else if (/^(\/|)--schema$/i.test(url)) {
    if (!authorized) {
      api.emit('unauthorized');
      requestAuthentication(res);
    } else {
      SCHEMA.render(api.schema, req, res, next);
    }
    return;

  } else if (!authorized) {
    api.emit('unauthorized');
    errorAccessDenied(api, req, res, next);
    return;
  }

  var method = req.method || 'GET';
  execute(api, method, req, res, next);

  //res.setHeader('Content-type', 'application/json');
  //res.end(JSON.stringify(params));
}

function parseParams(api, method, url, query) {
  var params = {};
  PARAMS.parseUrl(api, params, url);
  PARAMS.parseQuery(api, params, query, method);
  return params;
}

function parseBody(req, cb) {
  if (!U.isEmpty(req.body)) {
    cb(0, req.body);
  } else {
    var form = new FORM.IncomingForm()
    form.parse(req, function(err, fields, files) {
      cb(err, fields);
    });
  }
}

function execute(api, method, req, res, next) {
  api.emit('execute');
  var params = parseParams(api, method, req.url, req.query);
  if (typeof api.settings.inputTranform === 'function') {
    api.settings.inputTranform(req, params);
  }

  var outFunc = pipe(api, req, res, next);
  params.query = PARAMS.shrinkQuery(req.query);

  parseBody(req, function(err, body) {
    params.body = body;

    if (!U.isEmpty(params.model)) {
      executeModel(api, params, outFunc, req, res, next);

    } else if (!U.isEmpty(params.tables) && CMD.isCommand(method)) {
      executeCommand(api, method, params, outFunc);

    } else {
      errorNotFound(api, req, res, next);
    }
  });
}

function executeModel(api, params, cb, req, res, next) {
  var model = api.models.getModel(params.model.name);
  if (!U.isEmpty(model) && typeof model[params.model.method] === 'function') {
    var modelArgs = {
      'settings': api.settings,
      'db': api.db,
      'params': params,
      'req': req,
      'res': res,
      'next': next
    };
    model[params.model.method](modelArgs, cb);

  } else {
    errorNotFound(api, req, res, next);
  }
}

function executeCommand(api, method, params, cb) {
  var cmd = new CMD[method](api);

  cmd.execute(params)
    .then(function(result) {
      cb(0, result);
    })
    .fail(function(err) {
      cb(err, 0);
    });
}

function pipe(api, req, res, next) {
  var headers = api.getHeaders(req.headers);

  return function(err, result) {
    var status = 200;
    var dataStr = 0;

    if (!U.isEmpty(err)) {
      if (next && typeof next === 'function') {
        next(err);
        return;

      } else {
        status = 500;
        var result = {
          "message": "Internal server error.",
          "status": status,
          "stack": ""
        };
        if (err && typeof err === 'object') {
          status = (err.status || 500);
          result = {
            "message": err.message,
            "status": status,
            "stack": err.stack
          };
        }
        dataStr = JSON.stringify(result);
      }

    } else {
      var data = null;
      if (result) {
        if (result.data) {
          data = result.data;
        } else {
          data = result;
        }
      }

      if (typeof api.settings.outputTranform === 'function') {
        api.settings.outputTranform(req, data);
      }

      if (data) {
        dataStr = JSON.stringify(data);

      } else {
        status = 204;
      }
    }

    headers['Content-Type'] = 'application/json; charset=utf-8';
    res.writeHead(status, headers);
    res.write(dataStr);
    res.end(0);
  };
}

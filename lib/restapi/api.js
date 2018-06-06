/**
 * REST API main
 */
var EventEmitter = require('events').EventEmitter;
var KNEX = require('knex');

var FORM = require('./lib/formidable');
var Q = require('./lib/q');
var COOKIES = require('./lib/cookies');

var SCHEMA = require('./schema');
var FILTERS = require('./filters');
var PARAMS = require('./parameter');
var U = require('./utils');
var AUTH = require('./auth');
var CMD = require('./commands');
var HELP = require('./help');
var MODELS = require('./models');
var MODELS_ARGS = require('./modelargs');

/**
 * Module exports.
 * 
 * @public
 */
var RestApi = module.exports = {
  settings: {
    "driver": "mysql",
    "pagesize": 20
  },
  db: null,
  schema: null,
  filter: null,
  rootpath: U.getRootPath(),
  apppath: __dirname,
  models: MODELS
};

/**
 * Create and initialize Rest api.
 *
 * @param {object} config
 * @return {function}
 * @public
 */
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

  U.mixin(RestApi, EventEmitter.prototype, false);
  U.mixin(this.settings, config, false);

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
  this.schema = null;
  this.filter = FILTERS[driverName];
  this.auth = new AUTH(this);

  var schemaConfig = {
    "name": driverName,
    "databases": this.settings.databases
  };

  var self = this;
  SCHEMA.init(schemaConfig, self.db)
      .then(function(result) {
        self.schema = result;
      })
      .catch(function(err) {
        if (err) {
          console.error(err);
        }
      });

  return function(req, res, next) {
    res.api = self;
    if (!self.schema) {
      next(new Error("Not initialized."));
    } else {
      handle(self, req, res, next);
    }
  };
};

/**
 * Get current database connection.
 * 
 * @return {KNEX}
 * @public
 */
RestApi.getDB = function() {
  return this.db;
};

/**
 * Generate csrf token
 * 
 * @return {string}
 * @public
 */
RestApi.generateCsrfSecret = function() {
  if (typeof this.auth !== 'object') {
    throw new Error("Not initialized.");
  }
  return this.auth.generateSecret();
};

/**
 * Generate csrf token
 * 
 * @param {string} [secret] Secret key string for token.
 * @return {string}
 * @public
 */
RestApi.generateCsrfToken = function(secret) {
  if (typeof this.auth !== 'object') {
    throw new Error("Not initialized.");
  }
  return this.auth.generateToken();
};

/**
 * Get is authorization passed or not.
 * 
 * @return {boolean}
 * @public
 */
RestApi.isAuthorized = function(req) {
  if (typeof this.auth !== 'object') {
    throw new Error("Not initialized.");
  }
  return this.auth.isAuthorized(req);
}

/**
 * Execute custom query.
 *
 * @param {string} query SQL query string.
 * @param {object} args Parameters of query.
 * @param {function} [cb] The callback.
 * @return {Promise}
 * @public
 */
RestApi.execQuery = function(query, args, cb) {
  if (U.isEmpty(query)) {
    throw new Error("Invalid parameters.");
  }
  if (typeof args === 'function') {
    cb = args;
    args = {};
  }

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
  this.db.raw(query, args).asCallback(cb);

  return deferred.promise;
};

/**
 * Request header to response header.
 *
 * @param {object} headers Request header.
 * @return {object}
 * @public
 */
RestApi.getHeaders = function(headers) {
  return {
    'Access-Control-Allow-Origin': headers.origin || "*",
    'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
    'Access-Control-Allow-Methods': CMD.COMMANDS.join(', '),
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Max-Age': 1728000
  };
};

/**
 * Close and destory.
 *
 * @public
 */
RestApi.close = function() {
  if (this.db && typeof this.db.destroy === 'function') {
    this.db.destroy(function(err) {});
  }
};

/**
 * Apply custom models to api.
 * 
 * @param {object|string} models
 * @public
 */
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
};

/**
 * Execute call.
 *
 * @param {object} method Http method or model method.
 * @param {object} objName Table name or model name.
 * @param {object} args Parameters of query.
 * @param {function} [cb] The callback
 * @return {Promise}
 * @public
 */
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
    
  } else if (U.isEmpty(objName) && typeof method === 'string') {
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
      if (!U.isEmpty(err)) {
        deferred.reject(err);
      } else {
        deferred.resolve(result);
      }
    }
  }

  if (this.models.isModel(objName)) {
    var params = {
      "model": {
        "name": objName,
        "method": method
      }
    };
    executeModel(this, params, args, cb, {}, {}, null);

  } else {
    method = method || 'GET';
    var database = this.settings.maindb;

    if (this.schema.isTable(database, objName)) {
      if (args.w) {
        args.where = Array.isArray(args.w) ? args.w : [args.w];

      } else if (args.where && !Array.isArray(args.where)) {
        args.where = [args.where];
      }
      
      var table = {
        "database": database,
        "table": objName,
        "type": "primary"
      };
  
      // columns [], primaryKey, where [], joins [], group '', having '', order '', start #, length #,
      for (var i in args) {
        if (!!~[
            'columns', 'primaryKey', 'where', 'joins',
            'group', 'having', 'order', 'start', 'length'
          ].indexOf(i)) {
          table[i] = args[i];
        }
      }

      var params = {
        "tables": {}
      };
      params.table = objName;
      params.tables[objName] = table;
      if (args.data) {
        params.body = args.data;
  
      } else if (args.body) {
        params.body = args.body;
      }
      params.tablesOrder = [objName];
  
      executeCommand(this, method, params, cb);

    } else {
      errorNotFound(this, cb);
    }
  }
  return deferred.promise;
};

function errorNotFound(api, cb) {
  var err = new Error('Not found.');
  err.status = 404;
  cb(err, 0);
}

function errorAccessDenied(api, cb) {
  var err = new Error('Access denied.');
  err.status = 401;
  cb(err, 0);
}

function requestAuthentication(res) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Basic Authentication"'
  });
  res.end('Authorization is needed');
}

function handle(api, req, res, next) {
  api.emit('handle');
  var url = req.url;

  var headers = api.getHeaders(req.headers);
  var outFunc = pipe(api, headers, req, res, next);

  if (/^(\/|)--help$/i.test(url)) {
    HELP.render(api.apppath, req, res, next);

  } else if (/^(\/|)--gen(secret|token.*)$/i.test(url)) {
    var authorized = true;
    if (api.auth.requireBasicAuth()) {
      authorized = api.auth.verifyBasicAuth(req);
    }

    if (!authorized) {
      api.emit('unauthorized');
      requestAuthentication(res);

    } else {
      var match = /^(\/|)--gen(secret|token.*)$/i.exec(url);
      if (match) {
        var type = match[2].toLowerCase();
        if (type == 'secret') {
          api.auth.generateSecret(function(err, result) {
            outFunc(err, result);
          });

        } else if (type == 'token') {
          var secret = req.query.secret;
          api.auth.generateToken(secret, function(err, result) {
            outFunc(err, result);
          });
        }
      }
    }

  } else if (/^(\/|)--schema$/i.test(url)) {
    var authorized = true;
    if (api.auth.requireBasicAuth()) {
      authorized = api.auth.verifyBasicAuth(req);
    }

    if (!authorized) {
      api.emit('unauthorized');
      requestAuthentication(res);

    } else {
      SCHEMA.render(api.schema, req, res, next);
    }

  } else {
    var method = req.method || 'GET';

    if (!!~['HEAD', 'OPTIONS'].indexOf(method)) {
      if (api.auth.requireCsrfAuth()) {
        var authorized = api.auth.verifyBasicAuth(req);
        if (!authorized) {
          api.emit('unauthorized');
          errorAccessDenied(api, outFunc);
  
        } else {
          var cookies = new COOKIES(req, res, { });
          cookies.set('authorization', req.headers["authorization"]);
          res.cookies = cookies;

          var token = api.auth.generateToken();
          if (token) {
            headers[api.auth.tokenKey] = token;
            outFunc = pipe(api, headers, req, res, next);
            executeCommand(api, method, {}, outFunc);
          }
        }
        
      } else {
        executeCommand(api, method, {}, outFunc);
      }

    } else {
      var authorized = api.auth.isAuthorized(req);
      if (!authorized) {
        api.emit('unauthorized');
        errorAccessDenied(api, outFunc);

      } else {
        execute(api, method, outFunc, req, res, next);
      }
    }
  }
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

function execute(api, method, cb, req, res, next) {
  api.emit('execute');
  
  var parsedParams = parseParams(api, method, req.url, req.query);
  var params = parsedParams;
  if (typeof api.settings.inputTranform === 'function') {
    params = api.settings.inputTranform(req, parsedParams);
  }

  params.query = PARAMS.shrinkQuery(req.query);

  //res.setHeader('Content-type', 'application/json');
  //res.end(JSON.stringify(params));

  parseBody(req, function(err, body) {
    if (typeof api.settings.bodyTranform === 'function') {
      params.body = api.settings.bodyTranform(req, body, params);
    } else {
      params.body = body;
    }

    if (!U.isEmpty(params.model)) {
      var args = U.mixin(params.body, req.query, false);
      if (params.model.values) {
        args.values = params.model.values;
      }
      executeModel(api, params, args, cb, req, res, next);

    } else if (!U.isEmpty(params.tables)) {
      executeCommand(api, method, params, cb);

    } else {
      errorNotFound(api, cb);
    }
  });
}

function safeModelCall(obj, fn, args, cb) {
  var objFn = obj[fn];
  if (typeof objFn === 'function') {
    (function() {
      try {
        return objFn.call(obj, args, cb);
      } catch (err) { }
    })();
  }
}

function executeModel(api, params, args, cb, req, res, next) {
  if (api.models.isModelFunction(params.model.name, params.model.method)) {
    var model = api.models.getModel(params.model.name);
    var modelArgs = new MODELS_ARGS(api, args, req, res);
    safeModelCall(model, params.model.method, modelArgs, cb);

  } else {
    errorNotFound(api, cb);
  }
}

function executeCommand(api, method, params, cb) {
  if (CMD.isCommand(method)) {
    var cmd = new CMD[method](api);

    cmd.execute(params)
      .then(function(result) {
        cb(0, result);
      })
      .catch(function(err) {
        cb(err, 0);
      });

  } else {
    errorNotFound(api, cb);
  }
}

function pipe(api, headers, req, res, next) {
  return function(err, result) {
    var status = 200;
    var dataStr = 0;

    if (!U.isEmpty(err)) {
      if (next && typeof next === 'function') {
        return next(err);

      } else {
        status = 500;
        var result ={
          "error": {
            "message": "Internal server error.",
            "status": status,
            "stack": ""
          }
        };
        if (err && typeof err === 'object') {
          status = (err.status || 500);
          result.error = {
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
          if (typeof api.settings.outputTranform === 'function') {
            data = api.settings.outputTranform(req, result.data);
          } else {
            data = result.data;
          }

        } else {
          if (typeof api.settings.outputTranform === 'function') {
            data = api.settings.outputTranform(req, result);
          } else {
            data = result;
          }
        }
      }

      if (data) {
        dataStr = JSON.stringify(data);
      } else {
        status = 204;
      }
    }

    headers['Content-Type'] = 'application/json; charset=utf-8';
    if (!U.isEmpty(dataStr)) {
      headers['Content-Length'] = Buffer.byteLength(dataStr, 'utf8');
    }
    res.writeHead(status, headers);
    res.write(dataStr);
    res.end(0);
  };
}
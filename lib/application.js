var EventEmitter = require('events').EventEmitter;
var _url = require('url');
var $error = require('./error');

function mixin(dest, src, redefine) {
  if (!dest) {
    throw new TypeError('argument dest is required');
  }

  if (!src) {
    throw new TypeError('argument src is required');
  }

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  if (redefine === undefined) {
    // Default to true
    redefine = true;
  }

  Object.getOwnPropertyNames(src).forEach(function(name) {
    if (!redefine && hasOwnProperty.call(dest, name)) {
      // Skip desriptor
      return;
    }

    // Copy descriptor
    var descriptor = Object.getOwnPropertyDescriptor(src, name);
    Object.defineProperty(dest, name, descriptor);
  })

  return dest;
}

function urlDecode(text) {
  if (typeof text === 'string' && text != '') {
    var exps = [
      /%0A/g, /%0D/g, /%20/g, /%23/g, /%24/g, /%25/g, /%26/g, /%2B/g,
      /%2C/g, /%2F/g, /%3A/g, /%3B/g, /%3D/g, /%3F/g, /%40/g, /%5B/g,
      /%5D/g, /%22/g, /%3C/g, /%3E/g, /%5E/g, /%60/g, /%7B/g, /%7C/g,
      /%7D/g
    ];
    for (var i in exps) {
      text = text.replace(exps[i], function(x) {
        x = x.substr(1);
        return String.fromCharCode(parseInt(x, 16));
      });
    }
  }
  return text;
}

function handle(handler, err, req, res, next) {
  var count = handler.length;

  try {
    if (err && count === 4) {
      handler(err, req, res, next);
      return;
    }

    if (!err && count < 4) {
      handler(req, res, next);
      return;
    }
  } catch (thrown) {
    err = thrown;
  }

  next(err);
}

var app = exports = module.exports = {
  settings: {},
  stack: []
};

app.init = function() {
  mixin(app, EventEmitter.prototype, false);

  return function(req, res, next) {
    app.handle(req, res, next);
  };
}

app.set = function(key, val) {
  this.settings[key] = val;
}

app.handle = function(req, res, callback) {
  var receiver = callback || $error.finalhandler(req, res, {});
  console.log('APP ' + req.method + " " + req.url);

  var parsed = _url.parse(req.url, true);
  var pathname = (parsed.pathname || '/').toLowerCase();
  for (var i in parsed) {
    if (typeof parsed[i] !== 'function') {
      if (i == 'query') {
        var query = {};
        for (var j in parsed[i]) {
          var qVal = parsed[i][j];
          if (qVal && Array.isArray(qVal)) {
            query[j] = [];
            for (var k in qVal) {
              query[j].push(urlDecode(qVal[k]));
            }
          } else {
            query[j] = urlDecode(qVal);
          }
        }
        req[i] = query;
      } else {
        req[i] = parsed[i];
      }
    }
  }
  //res.setHeader('Content-Type', 'text/plain;charset=utf-8');
  //res.end(JSON.stringify(request));

  var self = this;
  var index = 0;
  next();

  function next(err) {
    var layer = self.stack[index++];
    if (!layer) {
      setImmediate(receiver, err, req, res);
      return;
    }

    var regEx = new RegExp('^' + layer.path + '(.*)$', 'i');
    var match = regEx.exec(pathname);
    if (!match) {
      return next(err);
    }

    var url = match[1];
    if (!url || url == '') {
      req.url = '/';
    } else {
      req.url = url[0] == '/' ? url : '/' + url;
    }
    handle(layer.handler, err, req, res, next);
  }
}

app.use = function(path, fn) {
  if (typeof path !== 'string') {
    fn = path;
    path = '/';
  }
  if (!path) path = '/';
  this.stack.push({
    'path': path,
    'handler': fn
  });
}
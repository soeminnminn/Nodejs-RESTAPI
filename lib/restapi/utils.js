/**
 * REST API helper functions
 */

var PATH = require("path");
var FS = require("fs");

var utils = module.exports = {};

utils.mixin = function(dest, src, redefine) {
  if (!dest) {
    throw new TypeError('argument dest is required');
  }
  if (!src) {
    throw new TypeError('argument src is required');
  }

  var hasOwnProperty = Object.prototype.hasOwnProperty;
  if (redefine === undefined) {
    redefine = true;
  }

  Object.getOwnPropertyNames(src).forEach(function(name) {
    if (!redefine && hasOwnProperty.call(dest, name)) {
      return;
    }
    var descriptor = Object.getOwnPropertyDescriptor(src, name);
    Object.defineProperty(dest, name, descriptor);
  });
  return dest;
};

utils.decodeUrl = function(url) {
  if (typeof url === 'string' && url != '') {
    var exps = [
      /%0A/g, /%0D/g, /%20/g, /%23/g, /%24/g, /%25/g, /%26/g, /%2B/g, /%2C/g, /%2F/g, /%3A/g, /%3B/g, /%3D/g,
      /%3F/g, /%40/g, /%5B/g, /%5D/g, /%22/g, /%3C/g, /%3E/g, /%5E/g, /%60/g, /%7B/g, /%7C/g, /%7D/g
    ];
    var replacement = function(x) {
      x = x.substr(1);
      return String.fromCharCode(parseInt(x, 16));
    };
    for (var i in exps) {
      url = url.replace(exps[i], replacement);
    }
  }
  return url;
};

utils.isEmpty = function(obj) {
  if (typeof obj === 'undefined') return true;
  if (!obj) return true;
  if (typeof obj === 'number' && isNaN(obj)) return true;
  if (typeof obj === 'string' && obj == '') return true;
  if (typeof obj === 'object') {
    if (Array.isArray(obj) && obj.length == 0) {
      return true;
    } else {
      var temp = '' + obj;
      return (temp === '' || /^[\{\}\[\]\s]+$/.test(temp));
    }
  }
  return false;
}

/**
 * Find the project root.
 * If user set process.env.APP_ROOT_PATH, use that. If not found, traverse backwards from current
 * directory until a directory is found containing both node_modules and package.json.
 */
utils.getRootPath = function() {
  if (process.env.APP_ROOT_PATH) {
    return process.env.APP_ROOT_PATH;
  }
  return (function getRoot(dir) {
    try {
      var isPkgJson = FS.accessSync(PATH.join(dir, './package.json'));
      var is_node_modules = FS.accessSync(PATH.join(dir, './node_modules'));
    } catch (e) {
      if (dir === '/') {
        throw new PathfinderError('', __filename, 'project root (package.json & node_modules location)');
      }
      return getRoot(PATH.join(dir, '..'));
    }
    return dir;
  }(__dirname));
};
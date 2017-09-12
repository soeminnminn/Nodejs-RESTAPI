/**
 * REST API helper functions
 */

const path = require("path");
const fs = require("fs");

var utils = module.exports = {};

utils.urlDecode = function(text) {
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
      var temp = '';
      try {
        temp = JSON.stringify(obj);
      } catch (error) {
        temp = '' + obj;
      }
      temp = temp.replace(/\s/g, '').replace(/^\{(.*)\}$/, '$1')
        .replace(/^\[(.*)\]$/, '$1').replace(/\s/g, '');
      if (temp == '') return true;
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
      const isPkgJson = fs.accessSync(path.join(dir, './package.json'));
      const is_node_modules = fs.accessSync(path.join(dir, './node_modules'));
    } catch (e) {
      if (dir == '/') {
        throw new Error('project root (package.json & node_modules location)');
      }
      return getRoot(path.join(dir, '..'));
    }
    return dir;
  }(path.join(__dirname, '../..')));
}
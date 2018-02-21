/**
 * REST API Authentication Helper
 */

var AUTH = require('./lib/basic-auth');
var CSRF = require('./lib/csrf');
var U = require('./utils');

var Types = {
  NONE: 0,
  BASIC_AUTH: 1,
  CSRF_AUTH: 2,
  CUSTOM_AUTH: 3,
};

function authentication(api) {
  this.api = api;
  this.authType = Types.NONE;
  this.tokenKey = 'csrf-token';
  this.users = [];
  this.secrets = [];
  if (typeof api.settings.isAuthorized === 'function') {
    this.authType = Types.CUSTOM_AUTH;

  } else {
    if (!U.isEmpty(api.settings.users)) {
      this.authType = Types.BASIC_AUTH;

      if (!Array.isArray(api.settings.users)) {
        this.users = [api.settings.users];
      } else {
        this.users = api.settings.users;
      }
    }

    if (!U.isEmpty(api.settings.secrets) || !U.isEmpty(api.settings.csrf)) {
      if (U.isEmpty(api.settings.users)) {
        console.log('CSRF Auth: Users required!');
        this.authType = Types.NONE;

      } else {
        var secrets = null;

        if (!U.isEmpty(api.settings.secrets)) {
          secrets = api.settings.secrets;
        } else if (!U.isEmpty(api.settings.csrf.secrets)) {
          secrets = api.settings.csrf.secrets;
          
          if (!U.isEmpty(api.settings.csrf.tokenkey)) {
            this.tokenKey = api.settings.csrf.tokenkey;
          }
        }

        if (!U.isEmpty(secrets)) {
          this.authType = Types.CSRF_AUTH;

          if (!Array.isArray(secrets)) {
            this.secrets = [secrets];
          } else {
            this.secrets = secrets;
          }
        }
      }
    }
  }
}

module.exports = authentication;
module.exports.Types = Types;

authentication.prototype.isAuthorized = function(req) {
  if (this.authType === Types.CUSTOM_AUTH) {
    return this.api.settings.isAuthorized(req);

  } else if (this.authType === Types.BASIC_AUTH) {
    return this.verifyBasicAuth(req);

  } else if (this.authType === Types.CSRF_AUTH) {
    return this.verifyToken(req);
  }

  return true;
};

authentication.prototype.requireCsrfAuth = function() {
  return this.authType === Types.CSRF_AUTH;
};

authentication.prototype.requireBasicAuth = function() {
  return (this.authType === Types.BASIC_AUTH || this.authType === Types.CSRF_AUTH);
};

authentication.prototype.verifyBasicAuth = function(req) {
  if (this.authType === Types.BASIC_AUTH || this.authType === Types.CSRF_AUTH) {
    var result = false;
    var credentials = AUTH(req);
    if (U.isEmpty(credentials)) {
      return false;
    }
    var users = this.users;
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
};

authentication.prototype.defaultSecret = function() {
  if (this.secrets && this.secrets.length > 0) {
    return this.secrets[0];
  }
  return null;
};

function readToken(param) {
  var arr = [];
  if (!param) {
    param = {};
  }
  arr.push(param.body || {});
  arr.push(param.query || {});
  arr.push(param.headers || {});
  arr.push(param);

  var keys = /^(_csrf|csrf-token|xsrf-token|x-csrf-token|x-xsrf-token)$/i;
  for(var i in arr) {
    for(var j in arr[i]) {
      if (keys.test(j)) {
        var val = arr[i][j];
        if (typeof val === 'string' && val !== '') {
          return val;
        }
      }
    }
  }
  return null;
}

authentication.prototype.verifyToken = function(param) {
  if (this.authType === Types.CSRF_AUTH) {
    var result = false;
    var token = '';
    if (typeof param === 'string') {
      token = param;
    } else {
      token = readToken(param);
    }

    if (U.isEmpty(token)) {
      return result;
    }

    var secrets = this.secrets;
    var csrf = new CSRF();
    for (var i in secrets) {
      if (csrf.verify(secrets[i], token)) {
        result = true;
        break;
      }
    }
    return result;
  }
  return true;
};

authentication.prototype.generateSecret = function(cb) {
  var csrf = new CSRF();
  if (typeof cb === 'function') {
    csrf.secret(function (err, result) {
      cb(err, { 'secret': result });
    });
  } else {
    return csrf.secretSync();
  }
};

authentication.prototype.generateToken = function(secret, cb) {
  if (typeof secret === 'function') {
    cb = secret;
    secret = '';
  }

  var csrf = new CSRF();
  if (U.isEmpty(secret)) {
    secret = this.defaultSecret();
  }

  if (!U.isEmpty(secret)) {
    var token = csrf.create(secret);
    if (typeof cb === 'function') {
      cb(0, { 'token': token });
    } else {
      return token;
    }

  } else if (typeof cb === 'function') {
    cb(new Error("Secret key required."), 0);
  }
  return null;
};
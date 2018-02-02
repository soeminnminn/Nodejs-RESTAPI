/**
 * REST API Authentication Helper
 */

var AUTH = require('./lib/basic-auth');
var CSRF = require('./lib/csrf');
var U = require('./utils');

const NONE = 0;
const BASIC_AUTH = 1;
const CSRF_AUTH = 2;
const CUSTOM_AUTH = 3;

function authentication(api) {
  this.api = api;
  this.authType = NONE;
  this.users = [];
  this.secrets = [];
  if (typeof api.settings.isAuthorized === 'function') {
    this.authType = CUSTOM_AUTH;

  } else {
    if (!U.isEmpty(api.settings.users)) {
      this.authType = BASIC_AUTH;

      if (!Array.isArray(api.settings.users)) {
        this.users = [api.settings.users];
      } else {
        this.users = api.settings.users;
      }
    }

    if (!U.isEmpty(api.settings.secrets)) {
      if (U.isEmpty(api.settings.users)) {
        console.log('CSRF Auth: Users required!');
        this.authType = NONE;

      } else {
        this.authType = CSRF_AUTH;

        if (!Array.isArray(api.settings.secrets)) {
          this.secrets = [api.settings.secrets];
        } else {
          this.secrets = api.settings.secrets;
        }
      }
    }
  }
}

module.exports = authentication;

authentication.prototype.isAuthorized = function(req) {
  if (this.authType === CUSTOM_AUTH) {
    return this.api.settings.isAuthorized(req);

  } else if (this.authType === BASIC_AUTH) {
    return this.verifyBasicAuth(req);

  } else if (this.authType === CSRF_AUTH) {
    return this.verifyToken(req);
  }

  return true;
}

authentication.prototype.requireBasicAuth = function() {
  return (this.authType === BASIC_AUTH || this.authType === CSRF_AUTH);
}

authentication.prototype.verifyBasicAuth = function(req) {
  if (this.authType === BASIC_AUTH || this.authType === CSRF_AUTH) {
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
}

authentication.prototype.verifyToken = function(param) {
  if (this.authType === CSRF_AUTH) {
    var result = false;
    var token = '';
    if (typeof param === 'string') {
      token = param;

    } else if (!U.isEmpty(param.headers)) {
      token = param.headers['X-CSRF-Token'];

    } else {
      token = param['X-CSRF-Token'];
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
}

authentication.prototype.generateSecret = function(cb) {
  var csrf = new CSRF();
  csrf.secret(function(err, result) {
    cb(err, { 'secret': result });
  });
}

authentication.prototype.generateToken = function(secret, cb) {
  var csrf = new CSRF();
  if (!U.isEmpty(secret)) {
    var token = csrf.create(secret);
    cb(0, { 'token': token });

  } else {
    cb(new Error("Secret key required."), 0);
  }
}
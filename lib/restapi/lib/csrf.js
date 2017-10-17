/*!
 * csrf
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var crypto = require('crypto');
var assert = require('assert');
//var rndm = require('rndm');
//var uid = require('uid-safe');
//var compare = require('tsscmp');

/**
 * Module variables.
 * @private
 */
var EQUAL_GLOBAL_REGEXP = /=/g;
var PLUS_GLOBAL_REGEXP = /\+/g;
var SLASH_GLOBAL_REGEXP = /\//g;

/**
 * Module exports.
 * @public
 */
module.exports = Tokens;

/**
 * Token generation/verification class.
 *
 * @param {object} [options]
 * @param {number} [options.saltLength=8] The string length of the salt
 * @param {number} [options.secretLength=18] The byte length of the secret key
 * @public
 */
function Tokens(options) {
  if (!(this instanceof Tokens)) {
    return new Tokens(options);
  }

  var opts = options || {};

  var saltLength = opts.saltLength !== undefined ?
    opts.saltLength :
    8;

  if (typeof saltLength !== 'number' || !isFinite(saltLength) || saltLength < 1) {
    throw new TypeError('option saltLength must be finite number > 1');
  }

  var secretLength = opts.secretLength !== undefined ?
    opts.secretLength :
    18;

  if (typeof secretLength !== 'number' || !isFinite(secretLength) || secretLength < 1) {
    throw new TypeError('option secretLength must be finite number > 1');
  }

  this.saltLength = saltLength;
  this.secretLength = secretLength;
}

/**
 * Create a new CSRF token.
 *
 * @param {string} secret The secret for the token.
 * @public
 */
Tokens.prototype.create = function create(secret) {
  if (!secret || typeof secret !== 'string') {
    throw new TypeError('argument secret is required');
  }

  return this._tokenize(secret, rndm(this.saltLength));
}

/**
 * Create a new secret key.
 *
 * @param {function} [callback]
 * @public
 */
Tokens.prototype.secret = function secret(callback) {
  return uid(this.secretLength, callback);
}

/**
 * Create a new secret key synchronously.
 * @public
 */
Tokens.prototype.secretSync = function secretSync() {
  return uid.sync(this.secretLength);
}

/**
 * Tokenize a secret and salt.
 * @private
 */

Tokens.prototype._tokenize = function tokenize(secret, salt) {
  return salt + '-' + hash(salt + '-' + secret);
}

/**
 * Verify if a given token is valid for a given secret.
 *
 * @param {string} secret
 * @param {string} token
 * @public
 */
Tokens.prototype.verify = function verify(secret, token) {
  if (!secret || typeof secret !== 'string') {
    return false;
  }

  if (!token || typeof token !== 'string') {
    return false;
  }

  var index = token.indexOf('-');

  if (index === -1) {
    return false;
  }

  var salt = token.substr(0, index);
  var expected = this._tokenize(secret, salt);

  return compare(token, expected);
}

/**
 * Hash a string with SHA1, returning url-safe base64
 * @param {string} str
 * @private
 */
function hash(str) {
  return crypto
    .createHash('sha1')
    .update(str, 'ascii')
    .digest('base64')
    .replace(PLUS_GLOBAL_REGEXP, '-')
    .replace(SLASH_GLOBAL_REGEXP, '_')
    .replace(EQUAL_GLOBAL_REGEXP, '');
}

// Implements Brad Hill's Double HMAC pattern from
// https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2011/february/double-hmac-verification/.
// The approach is similar to the node's native implementation of timing safe buffer comparison that will be available on v6+.
// https://github.com/nodejs/node/issues/3043
// https://github.com/nodejs/node/pull/3073
function compare(a, b) {
  var sa = String(a);
  var sb = String(b);
  var key = crypto.pseudoRandomBytes(32);
  var ah = crypto.createHmac('sha256', key).update(sa).digest();
  var bh = crypto.createHmac('sha256', key).update(sb).digest();

  var bufferEqual = function(a_buf, b_buf) {
    if (a_buf.length !== b_buf.length) {
      return false;
    }
    for (var i = 0; i < a_buf.length; i++) {
      if (a_buf[i] !== b_buf[i]) {
        return false;
      }
    }
    return true;
  };
  return bufferEqual(ah, bh) && a === b;
}

function rndm(len) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var length = Buffer.byteLength(chars);
  len = len || 10;
  assert(typeof len === 'number' && len >= 0, 'the length of the random string must be a number!');
  var salt = '';
  for (var i = 0; i < len; i++) {
    salt += chars[Math.floor(length * Math.random())];
  }
  return salt;
}


var generateAttempts = crypto.randomBytes === crypto.pseudoRandomBytes ? 1 : 3;

/**
 * Generates strong pseudo-random bytes.
 *
 * @param {number} size
 * @param {function} [callback]
 * @return {Promise}
 * @public
 */
var randomBytes = function(size, callback) {
  // validate callback is a function, if provided
  if (callback !== undefined && typeof callback !== 'function') {
    throw new TypeError('argument callback must be a function');
  }

  // require the callback without promises
  if (!callback && !global.Promise) {
    throw new TypeError('argument callback is required');
  }

  if (callback) {
    // classic callback style
    return generateRandomBytes(size, generateAttempts, callback);
  }

  return new Promise(function executor(resolve, reject) {
    generateRandomBytes(size, generateAttempts, function onRandomBytes(err, str) {
      if (err) return reject(err);
      resolve(str);
    });
  });
}

/**
 * Generates strong pseudo-random bytes sync.
 *
 * @param {number} size
 * @return {Buffer}
 * @public
 */
randomBytes.sync = function(size) {
  var err = null;
  for (var i = 0; i < generateAttempts; i++) {
    try {
      return crypto.randomBytes(size);
    } catch (e) {
      err = e;
    }
  }
  throw err;
}

/**
 * Generates strong pseudo-random bytes.
 *
 * @param {number} size
 * @param {number} attempts
 * @param {function} callback
 * @private
 */
function generateRandomBytes(size, attempts, callback) {
  crypto.randomBytes(size, function onRandomBytes(err, buf) {
    if (!err) return callback(null, buf);
    if (!--attempts) return callback(err);
    setTimeout(generateRandomBytes.bind(null, size, attempts, callback), 10);
  });
}

/**
 * Create a unique ID.
 *
 * @param {number} length
 * @param {function} [callback]
 * @return {Promise}
 * @public
 */
var uid = function(length, callback) {
  // validate callback is a function, if provided
  if (callback !== undefined && typeof callback !== 'function') {
    throw new TypeError('argument callback must be a function');
  }

  // require the callback without promises
  if (!callback && !global.Promise) {
    throw new TypeError('argument callback is required');
  }

  if (callback) {
    // classic callback style
    return generateUid(length, callback);
  }

  return new Promise(function executor(resolve, reject) {
    generateUid(length, function onUid(err, str) {
      if (err) return reject(err);
      resolve(str);
    })
  })
}

/**
 * Create a unique ID sync.
 *
 * @param {number} length
 * @return {string}
 * @public
 */
uid.sync = function(length) {
  var buf = randomBytes.sync(length);
  return buf.toString('base64')
    .replace(PLUS_GLOBAL_REGEXP, '-')
    .replace(SLASH_GLOBAL_REGEXP, '_')
    .replace(EQUAL_GLOBAL_REGEXP, '');
}

/**
 * Generate a unique ID string.
 *
 * @param {number} length
 * @param {function} callback
 * @private
 */
function generateUid(length, callback) {
  randomBytes(length, function(err, buf) {
    if (err) return callback(err);
    var str = buf.toString('base64')
      .replace(PLUS_GLOBAL_REGEXP, '-')
      .replace(SLASH_GLOBAL_REGEXP, '_')
      .replace(EQUAL_GLOBAL_REGEXP, '');
    callback(null, str);
  });
}
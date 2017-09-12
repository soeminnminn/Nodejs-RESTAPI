/**
 * REST API auth
 */
const crypto = require('crypto');

var auth = module.exports = {};

function isset(obj) {
  return (obj && typeof obj !== 'undefined');
}

function rtrim(str, charlist) {
  charlist = !charlist ? ' \\s\u00A0' : (charlist + '').replace(/([[\]().?/*{}+$^:])/g, '\\$1');
  var re = new RegExp('[' + charlist + ']+$', 'g');
  return (str + '').replace(re, '');
}

function strtr(s, p, r) {
  return !!s && {
    2: function() {
      for (var i in p) {
        s = strtr(s, i, p[i]);
      }
      return s;
    },
    3: function() {
      return s.replace(RegExp(p, 'g'), r);
    },
    0: function() {
      return;
    }
  }[arguments.length]();
}

function base64_encode(s) {
  return new Buffer(s).toString('base64');
}

function base64_decode(s) {
  return new Buffer(s, 'base64').toString('hex');
}

function hash_hmac(hmac, str, secret, hex) {
  var encode = hex ? 'hex' : 'base64';
  return crypto.createHmac(hmac, secret).update(str).digest(encode);
}

function bin2hex(s) {
  var i, l, n;
  var o = '';
  s += '';
  for (i = 0, l = s.length; i < l; i++) {
    n = s.charCodeAt(i).toString(16);
    o += n.length < 2 ? '0' + n : n;
  }
  return o;
}

function hex2bin(s) {
  var ret = [];
  var i = 0;
  var l;
  s += '';

  for (l = s.length; i < l; i += 2) {
    var c = parseInt(s.substr(i, 1), 16);
    var k = parseInt(s.substr(i + 1, 1), 16);
    if (isNaN(c) || isNaN(k)) return false;
    ret.push((c << 4) | k);
  }

  return String.fromCharCode.apply(String, ret);
}


auth.generateToken = function(claims, time, ttl, algorithm, secret) {
  var algorithms = { 'HS256': 'sha256', 'HS384': 'sha384', 'HS512': 'sha512' };
  var header = {
    "typ": "JWT",
    "alg": algorithms
  };
  var token = [];
  token.push(rtrim(strtr(base64_encode(JSON.stringify(header)), '+/', '-_'), '='));

  claims['iat'] = time;
  claims['exp'] = time + ttl;
  token.push(rtrim(strtr(base64_encode(JSON.stringify(claims)), '-_', '+/'), '='));
  if (!isset(algorithms[algorithm])) return null;
  var hmac = algorithms[algorithm];
  var signature = hash_hmac(hmac, token[0] + token[1], secret, true);
  token.push(rtrim(strtr(base64_encode(signature), '-_', '+/'), '='));

  return token.join('.');
}

auth.getVerifiedClaims = function(token, time, leeway, ttl, algorithm, secret) {
  var algorithms = { 'HS256': 'sha256', 'HS384': 'sha384', 'HS512': 'sha512' };
  if (!isset(algorithms[algorithm])) return null;
  var hmac = algorithms[algorithm];
  var tokenArr = token.split('.');
  if (tokenArr.length < 3) return null;

  var header = JSON.parse(base64_decode(strtr(tokenArr[0], '-_', '+/')));
  if (!secret) return null;
  if (header['typ'] != 'JWT') return null;
  if (header['alg'] != algorithm) return null;

  var signature = strtr(tokenArr[2], '-_', '+/');
  if (signature != hash_hmac(hmac, token[0] + token[1], secret)) return null;
  var claims = JSON.parse(base64_decode(strtr(tokenArr[1], '-_', '+/')));
  if (!claims) return null;

  if (isset(claims['nbf']) && time + leeway < claims['nbf']) return false;
  if (isset(claims['iat']) && time + leeway < claims['iat']) return false;
  if (isset(claims['exp']) && time - leeway > claims['exp']) return false;
  if (isset(claims['iat']) && !isset(claims['exp'])) {
    if (time - leeway > claims['iat'] + ttl) return false;
  }
  return claims;
}
/**
 * REST API commands
 */

var COMMANDS = module.exports.COMMANDS = ["HEAD", "OPTIONS", "GET", "POST", "PUT", "DELETE", "PATCH"];

module.exports.HEAD = require('./head');
module.exports.OPTIONS = require('./options');
module.exports.GET = require('./get');
module.exports.POST = require('./post');
module.exports.PUT = require('./put');
module.exports.DELETE = require('./delete');
module.exports.PATCH = require('./patch');

module.exports.isCommand = function(cmd) {
  if (cmd && cmd != '') {
    cmd = cmd.toUpperCase();
    return !!~COMMANDS.indexOf(cmd);
  }
  return false;
}
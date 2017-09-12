/**
 * Model user
 */

var user = module.exports = {};

user.get = function(args, cb) {
  cb(0, { "hello": "world" });
}
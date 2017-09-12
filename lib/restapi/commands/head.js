/**
 * REST API command HEAD
 */

var Q = require('./../lib/q');

module.exports = headCommand;

function headCommand(api) {
  this.api = api;
}

headCommand.prototype.execute = function(params) {
  var deferred = Q.defer();
  if (U.isEmpty(params)) {
    deferred.reject(new Error('Invalid parameters'));

  } else {
    execute(this.api, params, function(err, result) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(result);
      }
    });
  }
  return deferred.promise;
}

function execute(api, params, cb) {
  cb(0, null);
}
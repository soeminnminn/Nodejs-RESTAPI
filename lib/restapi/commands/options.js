/**
 * REST API command OPTIONS
 */
var Q = require('./../lib/q');
var U = require('./../utils');

module.exports = optionsCommand;

function optionsCommand(api) {
  this.api = api;
}

optionsCommand.prototype.execute = function(params) {
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
  cb(0, { 'schema': api.schema.renderable(), 'params': params });
}
/**
 * REST API model arguments
 */

var U = require('./utils');

function ModelArguments(api, args, req, res) {
  this._holder = {
    'api': api,
    'req': req || {},
    'res': res || {}
  };
  if (args && typeof args === 'object') {
    U.mixin(this, args, false);
  }
}

module.exports = ModelArguments;

ModelArguments.prototype = {
  /**
   * Get REST API instance.
   * @return {object} 
   */
  getApi: function() {
    return this._holder.api;
  },

  /**
   * Get settings of REST API.
   * @return {object}
   */
  getSettings: function() {
    return this._holder.api.settings;
  },

  /**
   * Get current database connection.
   * @return {object} KNEX database instance
   */
  getDatabase: function() {
    return this._holder.api.db;
  },

  /**
   * Get current request.
   * @return {object}
   */
  getRequest: function() {
    return this._holder.req;
  },

  /**
   * Get current response
   * @return {object}
   */
  getResponse: function() {
    return this._holder.res;
  }
};
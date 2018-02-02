/**
 * REST API filters
 */
var FILTER = require('./default_filters');

var filters = module.exports = {};

filters.mysql = FILTER;
filters.mssql = FILTER;
filters.postgresql = FILTER;
filters.sqlite3 = FILTER;
filters.oracle = null;
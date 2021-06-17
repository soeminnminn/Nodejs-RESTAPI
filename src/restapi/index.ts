/**
 * REST API index
 */
import { RestApi } from "./api";
import * as knex from "knex";
import { IFaces } from "./interfaces";

let api: RestApi;

/**
 * Create and initialize Rest api.
 *
 * @param {object} config
 * @return {function}
 * @public
 */
export function init(config: IFaces.ISettingsConfig, cb: (err?: any, api?: RestApi) => void) {
  api = new RestApi(config);
  api.init()
    .then((obj) => { cb(undefined, obj); })
    .catch((err) => { cb(err); });
  return api.handle();
}

/**
 * Get current database connection.
 *
 * @param {string} tableName
 * @return {KNEX}
 * @public
 */
export function getDb(tableName?: string): knex | knex.QueryBuilder {
  if (!api) {
    throw new Error("Not initialized.");
  }
  if (tableName) {
    return api.getDb()(tableName);
  }
  return api.getDb() as knex;
}
export function getKnex(): knex {
  if (!api) {
    throw new Error("Not initialized.");
  }
  return api.getDb();
}

/**
 * Apply custom models to api.
 *
 * @param {object|string} models
 * @public
 */
export function applyModel(...args: any[]) {
  if (!api) {
    throw new Error("Not initialized.");
  }
  api.applyModel(args);
}

/**
 * Execute call.
 *
 * @param {object} objName Table name or model name.
 * @return {Promise}
 * @public
 */
export function execute(objName: string) {
  return api.execute(objName);
}

export default api;
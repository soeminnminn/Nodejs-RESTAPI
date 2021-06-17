/**
 * REST API models
 */
import * as http from "http";
import { Utils } from "./utils";
import { RestApi } from "./api";

export class Model {
  public name: string;
  public method: string;
  public args: string[];
  private model: any;

  constructor(name: string, method?: string, args?: string[]) {
    this.name = name;
    this.method = method;
    this.args = args;
  }

  public createArguments(api: RestApi, req: http.IncomingMessage, res: http.ServerResponse) {
    const obj: any = {};

    if (this.args && typeof this.args === "object") {
      obj.urlParts = this.args;
    }
    if ((<any>req).query) {
      Utils.mixin(obj, (<any>req).query, false);
    }
    if ((<any>req).body) {
      Utils.mixin(obj, (<any>req).body, false);
    }

    obj.knex = api.getDb();

    obj.getApi = () => {
      return api;
    };
    obj.getSettings = () => {
      return api.getStorage().settings;
    };
    obj.getRequest = () => {
      return req;
    };
    obj.getResponse = () => {
      return res;
    };
    obj.getDb = (tableName?: string) => {
      if (tableName) {
        return api.getDb()(tableName);
      }
      return api.getDb();
    };

    return obj;
  }

  public apply(mod: any) {
    const self: any = Utils.extend({}, this);
    if (mod) {
      this.model = mod;
      const funcs = Utils.getAllUserFuncs(mod);
      for (const f of funcs) {
        const fn = mod[f];
        if (fn && typeof fn === "function") {
          self[f] = (args: any) => {
            const fnArgs = [ args ];
            return new Promise((resolve, reject) => {
              fnArgs.push((err: any, result: any) => {
                if (!Utils.isEmpty(err)) {
                  reject(err);
                } else {
                  resolve(result);
                }
              });
              try {
                fn.call(mod, ...fnArgs);
              } catch (err) {
                reject(err);
              }
            });
          };
        }
      }
    }

    delete self["createArguments"];
    delete self["apply"];
    return self;
}

  public call(method: string, ...args: any[]) {
    if (this.model && method !== "") {
      const model = this.model;
      const fn = this.model[method];
      if (fn && typeof fn === "function") {
        return new Promise((resolve, reject) => {
          if (!args) {
            args = [];
          }
          args.push((err: any, result: any) => {
            if (!Utils.isEmpty(err)) {
              reject(err);
            } else {
              resolve(result);
            }
          });
          try {
            fn.call(model, ...args);
          } catch (err) {
            reject(err);
          }
        });
      } else {
        throw new Error("Model method not found.");
      }
    } else {
      throw new Error("Model not found.");
    }
  }
}
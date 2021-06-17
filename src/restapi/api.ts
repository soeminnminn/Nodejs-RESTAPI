/**
 * REST API main
 */
import { EventEmitter } from "events";
import * as knex from "knex";
import * as http from "http";
import * as schema from "./schema";
import { Storage } from "./storage";
import { Parser } from "./parser";
import * as filters from "./filters";
import { Utils } from "./utils";
import { IFaces } from "./interfaces";
import { DataView } from "./dataview";
import { Model } from "./models";
import { Help } from "./help";
import { UrlHandler } from "./urlhandler";
import { Commands, OptionsCommand } from "./commands";

const defaultHeaders = (headers: any) => {
  return {
    "Access-Control-Allow-Origin": headers.origin || "*",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    "Access-Control-Allow-Methods": Storage.COMMANDS.join(", "),
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Max-Age": 1728000
  };
};

export class RestApi extends EventEmitter {
  private options: IFaces.ISettingsConfig;
  private dialect: string;
  private db: knex;
  private storage: Storage;
  private parser: Parser;
  private handler: UrlHandler;

  /**
   * Api main constructor
   * @param {object} options Api config
   */
  constructor(options: IFaces.ISettingsConfig) {
    super();
    if (!options.allowedMethods) {
      options.allowedMethods = ["GET"];
    }
    this.options = options;

    const dbConfig: any = Utils.mixin({}, this.options, true);
    delete dbConfig.pagesize;
    delete dbConfig.databases;
    delete dbConfig.modelBasePath;

    const conn: any = this.options.connection;
    if (typeof conn.database === "string") {
      this.options.maindb = conn.database;
    }
    const maindb = this.options.maindb;
    if (maindb && maindb != "") {
      if (!this.options.databases) {
        this.options.databases = [maindb];
      } else {
        if (!~this.options.databases.indexOf(maindb)) {
          this.options.databases.push(maindb);
        }
      }
    }

    this.dialect = dbConfig.dialect;
    if (dbConfig.client && typeof dbConfig.client === "string") {
      this.dialect = dbConfig.client;
    }

    this.initDatabase(dbConfig);
  }

  private initDatabase(dbConfig: any) {
    let knexInit: Function;
    if (typeof knex === "function") {
      knexInit = knex as Function;
    } else if ((<any>knex)["default"] && typeof (<any>knex)["default"] == "function") {
      knexInit = (<any>knex)["default"] as Function;
    } else {
      throw new Error("Knex not found.");
    }
    this.db = knexInit(dbConfig);
  }

  /**
   * Create and initialize Rest api.
   * @param {object} config
   * @return {RestApi}
   * @public
   */
  public init(): Promise<RestApi> {
    const schemaCls = schema.default[this.dialect];
    if (!schemaCls) {
      throw new Error("Schema not found.");
    }

    const filtersCls = filters.default[this.dialect];
    if (!filtersCls) {
      throw new Error("Filter not found.");
    }

    const sc = (new schemaCls(this.db)) as schema.DbSchema;

    return new Promise((resolve, reject) => {
      sc.getSchemas(this.options.databases)
        .then((result) => {
          this.storage = new Storage(this.options, result);
          this.parser = new Parser(this.storage, new filtersCls());
          this.initHandlers();
          resolve(this);
        }).catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  }

  private initHandlers() {
    this.handler = new UrlHandler();

    const defAuthFun = (req: http.IncomingMessage, res: http.ServerResponse, next: Function): any => {
      next();
    };
    const authFun = this.options.authHandler || defAuthFun;

    this.handler.get(/^(\/|)--help$/i, Help.renderReadMe(__dirname));

    this.handler.get(/^(\/|)--schema$/i, Help.renderSchema(this.storage.getSchema()));

    this.handler.post(/^(\/|)--exec$/i, authFun, this.executeQuery());

    this.handler.all(/^(.*)$/i, authFun, this.handleCommads());
  }

  /**
   * Get storage.
   * @return {object}
   * @public
   */
  public getStorage() {
    return this.storage;
  }

  /**
   * Get current database connection.
   * @return {KNEX}
   * @public
   */
  public getDb(): knex {
    return this.db;
  }

  /**
   * Close and destory.
   * @public
   */
  public close() {
    if (this.db && typeof this.db.destroy === "function") {
      this.db.destroy((err: any) => {});
    }
  }

  /**
   * Apply custom models to api.
   * @param {object|string} models
   * @public
   */
  public applyModel(...models: any[]) {
    if (!this.storage) {
      throw new Error("Not initialized.");
    }
    if (models.length > 0) {
      if (models.length == 2) {
        this.storage.pushModel({
          "name": models[0],
          "model": models[1]
        });
      } else if (typeof models[0] === "string") {
        for (const i in models) {
          this.storage.pushModel(models[i]);
        }
      } else if (typeof models[0] === "object") {
        let args = models;
        if (Array.isArray(models[0])) {
          args = models[0];
        }
        for (const i in args) {
          this.storage.pushModel(args[i]);
        }
      }
    }
  }

  public execute(objName: string) {
    if (this.storage.isModel(objName)) {
      const mod = this.storage.getModel(objName);
      const model = new Model(objName);
      return model.apply(mod);

    } else if (this.storage.isTable(objName)) {
      return this.db(objName);

    } else {
      throw new Error("Object not found.");
    }
  }

  /**
   * Handle middleware function
   * @return {Function} middleware function
   * @public
   */
  public handle() {
    const self = this;
    return (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
      if (!self.storage) {
        return next(new Error("Not initialized."));
      }
      self.emit("handle");
      self.handler.handle(req, res, next);
    };
  }

  private handleCommads() {
    const self = this;
    return (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
      const url = req.url;
      const method = req.method || "GET";
      const headers = defaultHeaders(req.headers);
      const outFunc = self.pipe(headers, req, res, next);

      console.log(`\x1b[32mREST API \x1b[35m${method}\x1b[39m ${url}`);

      if (method == "HEAD") {
        return outFunc();

      } else if (method == "OPTIONS") {
        const optionsCmd = new OptionsCommand(self.storage.settings, self.storage.getSchema());
        return outFunc(undefined, optionsCmd.valueOf());

      } else {
        self.parser.parse(req);
        if (self.parser.model) {
          const model = self.parser.model;
          const args = model.createArguments(self, req, res);
          self.executeModel(model, args, outFunc);

        } else if (!!~["POST", "PUT", "PATCH"].indexOf(method)) {
          if (!~self.options.allowedMethods.indexOf(method)) {
            return outFunc(self.errorNotFound("Method"));
          }
          const dataView = self.parser.getPrimaryView();
          if (!dataView) {
            return outFunc(self.errorNotFound("Method"));
          }
          self.parser.parseBody(req)
            .then((body) => {
              dataView.setValues(body);
              self.executeCommand([dataView], method, outFunc);
            })
            .catch((err) => {
              console.log("handleCommads >> ", err);
              outFunc(err);
            });
        } else { // "GET"
          self.executeCommand(self.parser.dataViews, method, outFunc);
        }
      }
    };
  }

  private errorNotFound(type: string) {
    const err: any = new Error(`${type} not found!`);
    err.status = 404;
    return err;
  }

  private executeQuery() {
    const self = this;
    return (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
      const headers = defaultHeaders(req.headers);
      const outFunc = self.pipe(headers, req, res, next);

      self.parser.parseBody(req)
        .then((body) => {
          const query: string = body.query || body.sql || "";
          delete body.query;
          delete body.sql;
          if (query.length > 0) {
            self.getDb().raw(query, body)
              .then((result) => {
                outFunc(undefined, result);
              })
              .catch((err) => {
                console.log("executeQuery >> ", err);
                outFunc(err);
              });
          } else {
            outFunc(self.errorNotFound("Arguments"));
          }
        })
        .catch((err) => {
          console.log("executeQuery >> ", err);
          outFunc(err);
        });
    };
  }

  private executeCommand(dataViews: DataView[], method: string, outFunc: Function) {
    const promises: Promise<any>[] = [];
    for (const dv of dataViews) {
      const cmd = new Commands(dv);
      if (method == "GET") {
        promises.push(cmd.execGetCommand(this.db));
      } else if (method == "POST") {
        promises.push(cmd.execPostCommand(this.db));
      } else if (method == "PATCH") {
        promises.push(cmd.execPatchCommand(this.db));
      } else if (method == "PUT") {
        promises.push(cmd.execPutCommand(this.db));
      } else if (method == "DELETE") {
        promises.push(cmd.execDeleteCommand(this.db));
      }
    }

    if (promises.length < 1) {
      return outFunc(this.errorNotFound("Method"));
    }

    Promise.all(promises)
      .then((result) => {
        const data: any = {};
        for (const i in result) {
          data[dataViews[i].tableName] = result[i];
        }
        outFunc(undefined, data);
      })
      .catch((err) => {
        console.log("executeCommand >> ", err);
        outFunc(err, undefined);
      });
  }

  private executeModel(model: Model, args: any, outFunc: Function) {
    const obj = this.storage.getModel(model.name);
    if (obj && typeof obj == "object") {
      let fnName = model.method;
      const funcs = Utils.getAllUserFuncs(obj);
      const exp = new RegExp(`^${fnName}$`, "i");
      const index = funcs.findIndex((val) => exp.test(val));
      if (index > -1) {
        fnName = funcs[index];
      }

      const objFn = obj[fnName];
      if (typeof objFn === "function") {
        return (function() {
          try {
            return objFn.call(obj, args, outFunc);
          } catch (err) {
            console.log("executeModel >> ", err);
            outFunc(this.errorNotFound("Method"));
          }
        })();
      }
    }
    outFunc(this.errorNotFound("Method"));
  }

  private pipe(headers: any, req: http.IncomingMessage, res: http.ServerResponse, next?: Function) {
    const self = this;
    return function(err?: any, result?: any) {
      if (!Utils.isEmpty(err)) {
        if (self.options.errorHandler && typeof self.options.errorHandler == "function") {
          const handler: Function = self.options.errorHandler;
          handler.call(self.options, err, req, res, (doneData: any) => {
            const data = doneData || self.errorJson(err);
            self.jsonOut(headers, res, data.status || 500, doneData);
          });

        } else if (next && typeof next === "function") {
          return next(err);

        } else {
          result = self.errorJson(err);
          self.jsonOut(headers, res, err.status || 500, result);
        }

      } else if (self.options.resultHandler && typeof self.options.resultHandler == "function") {
        const handler: Function = self.options.resultHandler;
        handler.call(self.options, result, req, res, (doneData: any) => {
          const data = doneData || result;
          self.jsonOut(headers, res, 200, data);
        });

      } else if (result) {
        self.jsonOut(headers, res, 200, result);

      } else {
        self.jsonOut(headers, res, 204, {});
      }
      return self;
    };
  }

  private errorJson(err: any) {
    let status: number = 500;
    const result: any = {
      "error": {
        "message": "Internal server error.",
        "status": status,
        "stack": ""
      }
    };
    if (err && typeof err === "object") {
      status = (err.status || 500);
      result.error = {
        "message": err.message,
        "status": status,
        "stack": err.stack
      };
    }
    return result;
  }

  private jsonOut(headers: any, res: http.ServerResponse, status: number, data: any) {
    const dataStr: string = JSON.stringify(data);
    headers["Content-Type"] = "application/json; charset=utf-8";
    if (!Utils.isEmpty(dataStr)) {
      headers["Content-Length"] = Buffer.byteLength(dataStr, "utf8");
    }
    res.writeHead(status, headers);
    res.write(dataStr);
    res.end();
  }
}
/**
 * Express Application
 */
import * as fs from "fs";
import * as pathModule from "path";

import * as express from "express";
import * as http from "http";
import * as core from "express-serve-static-core";
import * as errorHandler from "./errorhandler";

const METHODS = (function() {
  return http.METHODS && http.METHODS.map((method) => {
    return method.toLowerCase();
  });
})() || [
  "get", "post", "put", "head", "delete", "options",
  "trace", "copy", "lock", "mkcol", "move", "purge",
  "propfind", "proppatch", "unlock", "report", "mkactivity",
  "checkout", "merge", "m-search", "notify", "subscribe",
  "unsubscribe", "patch", "search", "connect"
];

/****************************************************************************************************
 * ExpressApplication Class
 ****************************************************************************************************/
export abstract class ExpressApplication {
  public app = express();
  public urlencodedOptions = { extended: false };
  public isUnderConstruction = false;

  private dirname: string;

  constructor(basePath: string) {
    this.dirname = basePath;
  }

  public abstract onUseViewEngine(app: express.Express): void;

  public abstract onUseMiddleWares(app: express.Express): void;

  public abstract onUseRouter(app: express.Express): void;

  /**
   * On create method
   */
  public create() {
    this.onUseViewEngine(this.app);
    this.app.use(this.rootUrl());

    if (this.isUnderConstruction) {
      this.app.use(errorHandler.underConstruction());

    } else {
      this.app.use(express.json());
      this.app.use(express.urlencoded(this.urlencodedOptions));

      this.onUseMiddleWares(this.app);

      this.onUseRouter(this.app);
    }

    this.app.use(this.onErrorNotFound());

    // error handler
    this.app.use(errorHandler.handleError());

    return this.app;
  }

  private rootUrl() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const url = req.url.replace(/^.*~\/(.*)$/, "/$1");
      console.log(`${req.method} ${url}`);
      req.url = url;
      next();
    };
  }

  /**
   * Catch 404 and forward to error handler
   * @param req @see express.Request
   * @param res @see express.Response
   * @param next @see express.NextFunction
   */
  public onErrorNotFound() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const err = new errorHandler.HttpError(404, "Resource Not Found");
      next(err);
    };
  }

  /**
   * Set static directory to Express Application
   * @param dir static directory
   */
  public useStatic(dir: string) {
    this.app.use(express.static(pathModule.join(this.dirname, dir)));
  }

  /**
   * Load all routers in given directory.
   * @param dir Routers directory
   */
  public loadRouters(dir: string) {
    const findPath = pathModule.join(this.dirname, dir);
    const handlers: express.RequestHandler[] = [];
    const files = fs.readdirSync(findPath).filter((name) => /^[^\.]+(.js|.ts)$/.test(name));
    for (const name of files) {
      const handler = require(pathModule.join(findPath, name));
      if (handler.default) {
        if (handler.default instanceof ExpressRouter) {
          handlers.push(handler.default.router);
        } else {
          handlers.push(handler.default);
        }
      } else {
        try {
          const obj = new handler();
          if (obj instanceof ExpressRouter) {
            handlers.push(obj.router);
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
    this.app.use(handlers);
  }

  // Properties
  /**
   * @see express.Application.locals
   */
  public get locals(): any {
    return this.app.locals;
  }

  /**
   * @see express.Application.mountpath
   */
  public get mountpath(): string | string[] {
    return this.app.mountpath;
  }

  // Events
  /**
   * @see express.Application.on
   */
  public on(event: string, callback: (parent: express.Application) => void): ExpressApplication {
    this.app.on(event, callback);
    return this;
  }

  // Methods
  /**
   * @see express.Application.all
   */
  public all(path: core.PathParams, ...handlers: express.RequestHandler[]): core.Express {
    return this.app.all(path, handlers);
  }

  /**
   * @see express.Application.get
   */
  public get(name: string): any;
  public get(path: core.PathParams, ...handlers: express.RequestHandler[]): core.Express {
    if (name) {
      return this.app.get(name);
    } else {
      return this.app.get(path, handlers);
    }
  }

  /**
   * @see express.Application.post
   */
  public post(path: core.PathParams, ...handlers: express.RequestHandler[]): core.Express {
    return this.app.post(path, handlers);
  }

  /**
   * @see express.Application.put
   */
  public put(path: core.PathParams, ...handlers: express.RequestHandler[]): core.Express {
    return this.app.post(path, handlers);
  }

  /**
   * @see express.Application.patch
   */
  public patch(path: core.PathParams, ...handlers: express.RequestHandler[]): core.Express {
    return this.app.patch(path, handlers);
  }

  /**
   * @see express.Application.delete
   */
  public delete(path: core.PathParams, ...handlers: express.RequestHandler[]): core.Express {
    return this.app.delete(path, handlers);
  }

  /**
   * @see express.Application.options
   */
  public options(path: core.PathParams, ...handlers: express.RequestHandler[]): core.Express {
    return this.app.options(path, handlers);
  }

  /**
   * @see express.Application.head
   */
  public head(path: core.PathParams, ...handlers: express.RequestHandler[]): core.Express {
    return this.app.head(path, handlers);
  }

  /**
   * @see express.Application.route
   */
  public route(prefix: core.PathParams): core.IRoute {
    return this.app.route(prefix);
  }

  /**
   * @see express.Application.set
   */
  public set(setting: string, val: any): express.Application {
    return this.app.set(setting, val);
  }

  /**
   * @see express.Application.engine
   */
  public engine(ext: string, fn: Function): express.Application {
    return this.app.engine(ext, fn);
  }

  /**
   * @see express.Application.use
   */
  public use(path: core.PathParams, ...handlers: express.RequestHandler[]): void;
  public use(...handlers: express.RequestHandler[]): void;
  public use(path: core.PathParams | express.RequestHandler, ...handlers: express.RequestHandler[]): void {
    if (path) {
      if (typeof path === "string") {
        this.app.use(path as string, handlers);
      } else if (path instanceof RegExp || path instanceof Array) {
        this.app.use(path, handlers);
      } else if (typeof path == "function") {
        handlers.splice(0, 0, path);
        this.app.use(handlers);
      }
    } else {
      this.app.use(handlers);
    }
  }

  public useRouter(path: core.PathParams, router: ExpressRouter) {
    if (typeof path === "string") {
      this.app.use(`${path}`, router.router);
    } else if (path instanceof RegExp || path instanceof Array) {
      this.app.use(path, router.router);
    }
  }

  /**
   * @see express.Application.path
   */
  public path(): string {
    return this.app.path();
  }
}

/****************************************************************************************************
 * ExpressRouter Class
 ****************************************************************************************************/
export abstract class ExpressRouter {
  public router = express.Router();

  constructor() {
    const self: any = this;
    const funcs = ExpressRouter.getAllFuncs(self);
    for (const i in METHODS) {
      const m = METHODS[i];
      if (!~funcs.indexOf(m)) {
        (<any>this)[m] = function(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
          return self[m](path, handlers);
        };
      }
    }
  }

  private static getAllFuncs(obj: any) {
    let props: string[] = [];
    if (!obj) return props;
    let objProto: any = obj;
    do {
      props = props.concat(Object.getOwnPropertyNames(objProto));
    } while (objProto = Object.getPrototypeOf(objProto));

    return props.filter((e, i, arr) => {
      return (e != arr[i + 1] && typeof obj[e] == "function");
    });
  }

  /**
   * Attach route
   * @param path Path of route
   * @param handlers handler object eg: { "get": [ function(req, res, next) {} ] }
   */
  public attach(path: core.PathParams, handlers: any): core.IRouter {
    const r: any = this.router.route(path);
    for (const m in handlers) {
      const method = m.toLowerCase();
      if (method == "all") {
        r.all(handlers[m]);
      } else if (!!~METHODS.indexOf(method)) {
        r[method](handlers[m]);
      }
    }
    return r;
  }

  /**
   * @see express.Router.use
   */
  public use(path: core.PathParams, ...handlers: express.RequestHandler[]): void;
  public use(...handlers: express.RequestHandler[]): void;
  public use(path: core.PathParams | express.RequestHandler, ...handlers: express.RequestHandler[]): void {
    if (path) {
      if (typeof path === "string") {
        this.router.use(path as string, handlers);
      } else if (path instanceof RegExp || path instanceof Array) {
        this.router.use(path, handlers);
      } else if (typeof path == "function") {
        handlers.splice(0, 0, path);
        this.router.use(handlers);
      }
    } else {
      this.router.use(handlers);
    }
  }

  /**
   * @see express.Router.param
   */
  public param(name: string, handler: core.RequestParamHandler): core.IRouter {
    return this.router.param(name, handler);
  }

  /**
   * @see express.Router.all
   */
  public all(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
    return this.router.all(path, handlers);
  }

  /**
   * @see express.Router.get
   */
  public get(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
    return this.router.get(path, handlers);
  }

  /**
   * @see express.Router.post
   */
  public post(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
    return this.router.post(path, handlers);
  }

  /**
   * @see express.Router.put
   */
  public put(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
    return this.router.put(path, handlers);
  }

  /**
   * @see express.Router.patch
   */
  public patch(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
    return this.router.patch(path, handlers);
  }

  /**
   * @see express.Router.delete
   */
  public delete(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
    return this.router.delete(path, handlers);
  }

  /**
   * @see express.Router.options
   */
  public options(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
    return this.router.options(path, handlers);
  }

  /**
   * @see express.Router.head
   */
  public head(path: core.PathParams, ...handlers: express.RequestHandler[]): core.IRouter {
    return this.router.head(path, handlers);
  }

  /**
   * @see express.Router.route
   */
  public route(prefix: core.PathParams): core.IRoute {
    return this.router.route(prefix);
  }
}
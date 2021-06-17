/**
 * REST API Url Handler
 */
import * as _url from "url";
import * as http from "http";
import { IFaces } from "./interfaces";

export type Handler = (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => any;

export class UrlHandler {
  private stack: Array<IFaces.IHandlerLayer> = new Array();

  constructor() {}

  private use(path: string | RegExp, method: string, handlers: Handler[]) {
    method = method.toUpperCase();
    let re: RegExp;
    if (typeof path == "string") {
      re = new RegExp(`^${path}(.*)$`, "i");
    } else if (path instanceof RegExp) {
      re = path;
    }
    if (re) {
      for (const h in handlers) {
        const handler = handlers[h];
        this.stack.push({
          regEx: re,
          method: method,
          handler: handler
        });
      }
    }
  }

  public all(path: string | RegExp, ...handlers: Handler[]) {
    this.use(path, "all", handlers);
  }

  public get(path: string | RegExp, ...handlers: Handler[]) {
    this.use(path, "get", handlers);
  }

  public post(path: string | RegExp, ...handlers: Handler[]) {
    this.use(path, "post", handlers);
  }

  public put(path: string | RegExp, ...handlers: Handler[]) {
    this.use(path, "put", handlers);
  }

  public patch(path: string | RegExp, ...handlers: Handler[]) {
    this.use(path, "patch", handlers);
  }

  public delete(path: string | RegExp, ...handlers: Handler[]) {
    this.use(path, "delete", handlers);
  }

  public options(path: string | RegExp, ...handlers: Handler[]) {
    this.use(path, "options", handlers);
  }

  public head(path: string | RegExp, ...handlers: Handler[]) {
    this.use(path, "head", handlers);
  }

  public handle(req: http.IncomingMessage, res: http.ServerResponse, callback: Function) {
    const parsed = _url.parse(req.url, true);
    const method = (req.method || "GET").toLowerCase();
    const pathname = (parsed.pathname || "/").toLowerCase();
    let index = 0;

    const next = (err: any = undefined): void => {
      const layer = this.stack[index++];
      if (!layer) {
        if (!err) {
          err = new Error("Not found");
          err.status = 404;
        }

        setImmediate(<any>callback, err, req, res);
        return;
      }
      if (!layer.regEx.test(pathname)) {
        return next(err);
      }
      if (!!~["all", method].indexOf(layer.method)) {
        return next(err);
      }

      const handler = layer.handler;
      try {
        if (err && handler.length == 4) {
          handler(err, req, res, next);
        } else if (!err && handler.length < 4) {
          handler(req, res, next);
        }
      } catch (thrown) {
        next(thrown);
      }
    };
    next();
  }
}
/**
 * MemoryStore
 */
import { LRUCache } from "./lru-cache";

export class MemoryStore {
  public name: string;
  private usePromises: boolean;

  public set: Function;
  public get: Function;
  public del: Function;
  public reset: Function;
  public keys: Function;

  constructor(args?: any) {
    args = args || {};
    self.name = "memory";
    const Promise = args.promiseDependency || global.Promise;
    this.usePromises = (typeof Promise === "undefined" || args.noPromises) ? false : true;

    const ttl = args.ttl;
    const lruOpts = {
      max: args.max || 500,
      maxAge: (ttl || ttl === 0) ? ttl * 1000 : undefined,
      dispose: args.dispose,
      length: args.length,
      stale: args.stale
    };

    const lruCache = new LRUCache(lruOpts);

    this.set = (key: string, value: any, options?: any, cb?: Function) => {
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      options = options || {};

      const maxAge = (options.ttl || options.ttl === 0) ? options.ttl * 1000 : lruOpts.maxAge;

      lruCache.set(key, value, maxAge);
      if (cb) {
        process.nextTick(cb.bind(undefined, undefined));
      } else if (this.usePromises) {
        return Promise.resolve(value);
      }
    };

    this.get = (key: string, options?: any, cb?: Function) => {
      if (typeof options === "function") {
        cb = options;
      }
      const value = lruCache.get(key);

      if (cb) {
        process.nextTick(cb.bind(undefined, undefined, value));
      } else if (this.usePromises) {
        return Promise.resolve(value);
      } else {
        return value;
      }
    };

    this.del = (key: string, options?: any, cb?: Function) => {
      if (typeof options === "function") {
        cb = options;
      }

      lruCache.del(key);

      if (cb) {
        process.nextTick(cb.bind(undefined, undefined));
      } else if (this.usePromises) {
        return Promise.resolve();
      }
    };

    this.reset = (cb?: Function) => {
      lruCache.reset();
      if (cb) {
        process.nextTick(cb.bind(undefined, undefined));
      } else if (this.usePromises) {
        return Promise.resolve();
      }
    };

    this.keys = (cb?: Function) => {
      const keys = lruCache.keys();
      if (cb) {
        process.nextTick(cb.bind(undefined, undefined, keys));
      } else if (this.usePromises) {
        return Promise.resolve(keys);
      } else {
        return keys;
      }
    };
  }
}

const methods = {
  create: function(args: any) {
    return new MemoryStore(args);
  }
};

export default methods;
/**
 * LRUCache
 */
// This will be a proper iterable 'Map' in engines that support it,
// or a fakey-fake PseudoMap in older versions.
import { PseudoMap } from "./pseudomap";
import * as util from "util";

// A linked list to keep track of recently-used-ness
import { Yallist } from "./yallist";

// use symbols if possible, otherwise just _props
const symbols: any = {};
const hasSymbol = typeof Symbol === "function";
let makeSymbol: Function;
if (hasSymbol) {
  makeSymbol = function(key: any) {
    return Symbol.for(key);
  };
} else {
  makeSymbol = function(key: any) {
    return `_${key}`;
  };
}

function priv(obj: any, key: any, val?: any) {
  let sym: any;
  if (symbols[key]) {
    sym = symbols[key];
  } else {
    sym = makeSymbol(key);
    symbols[key] = sym;
  }
  if (arguments.length === 2) {
    return obj[sym];
  } else {
    obj[sym] = val;
    return val;
  }
}

function naiveLength() {
  return 1;
}

// lruList is a yallist where the head is the youngest
// item, and the tail is the oldest.  the list contains the Hit
// objects as the entries.
// Each Hit object has a reference to its Yallist.Node.  This
// never changes.
//
// cache is a Map (or PseudoMap) that matches the keys to
// the Yallist.Node object.
export class LRUCache {
  constructor(options?: any) {
    if (typeof options === "number") {
      options = { max: options };
    }

    if (!options) {
      options = {};
    }

    const max = priv(this, "max", options.max);
    // Kind of weird to have a default max of Infinity, but oh well.
    if (!max || !(typeof max === "number") || max <= 0) {
      priv(this, "max", Infinity);
    }

    let lc = options.length || naiveLength;
    if (typeof lc !== "function") {
      lc = naiveLength;
    }
    priv(this, "lengthCalculator", lc);

    priv(this, "allowStale", options.stale || false);
    priv(this, "maxAge", options.maxAge || 0);
    priv(this, "dispose", options.dispose);
    this.reset();
  }

  // resize the cache when the max changes.
  public get max(): number {
    return priv(this, "max");
  }
  public set max(mL: number) {
    if (!mL || !(typeof mL === "number") || mL <= 0) {
      mL = Infinity;
    }
    priv(this, "max", mL);
    trim(this);
  }

  public get allowStale(): boolean {
    return priv(this, "allowStale");
  }
  public set allowStale(allowStale: boolean) {
    priv(this, "allowStale", !!allowStale);
  }

  public get maxAge(): number {
    return priv(this, "maxAge");
  }
  public set maxAge(mA: number) {
    if (!mA || !(typeof mA === "number") || mA < 0) {
      mA = 0;
    }
    priv(this, "maxAge", mA);
    trim(this);
  }

  public get lengthCalculator() {
    return priv(this, "lengthCalculator");
  }
  public set lengthCalculator(lC: any) {
    if (typeof lC !== "function") {
      lC = naiveLength;
    }
    if (lC !== priv(this, "lengthCalculator")) {
      priv(this, "lengthCalculator", lC);
      priv(this, "length", 0);
      priv(this, "lruList").forEach((hit: any) => {
        hit.length = priv(this, "lengthCalculator").call(this, hit.value, hit.key);
        priv(this, "length", priv(this, "length") + hit.length);
      }, this);
    }
    trim(this);
  }

  public get length() {
    return priv(this, "length");
  }

  public get itemCount() {
    return priv(this, "lruList").length;
  }

  public rforEach(fn: Function, thisp?: any) {
    thisp = thisp || this;
    for (let walker = priv(this, "lruList").tail; walker !== null;) {
      const prev = walker.prev;
      LRUCache.forEachStep(this, fn, walker, thisp);
      walker = prev;
    }
  }

  private static forEachStep(self: any, fn: Function, node: any, thisp?: any) {
    let hit = node.value;
    if (isStale(self, hit)) {
      del(self, node);
      if (!priv(self, "allowStale")) {
        hit = undefined;
      }
    }
    if (hit) {
      fn.call(thisp, hit.value, hit.key, self);
    }
  }

  public forEach(fn: Function, thisp?: any) {
    thisp = thisp || this;
    for (let walker = priv(this, "lruList").head; walker !== null;) {
      const next = walker.next;
      LRUCache.forEachStep(this, fn, walker, thisp);
      walker = next;
    }
  }

  public keys() {
    return priv(this, "lruList").toArray().map((k: any) => {
      return k.key;
    }, this);
  }

  public values() {
    return priv(this, "lruList").toArray().map((k: any) => {
      return k.value;
    }, this);
  }

  public reset() {
    if (priv(this, "dispose") &&
      priv(this, "lruList") &&
      priv(this, "lruList").length) {
      priv(this, "lruList").forEach((hit: any) => {
        priv(this, "dispose").call(this, hit.key, hit.value);
      }, this);
    }

    priv(this, "cache", new PseudoMap()); // hash of items by key
    priv(this, "lruList", new Yallist()); // list of items in order of use recency
    priv(this, "length", 0); // length of items in the list
  }

  public dump() {
    return priv(this, "lruList").map((hit: any) => {
      if (!isStale(this, hit)) {
        return {
          k: hit.key,
          v: hit.value,
          e: hit.now + (hit.maxAge || 0)
        };
      }
    }, this).toArray().filter((h: any) => {
      return h;
    });
  }

  public dumpLru() {
    return priv(this, "lruList");
  }

  public inspect(n: number, opts?: any) {
    let str = "LRUCache {";
    let extras = false;

    const as = priv(this, "allowStale");
    if (as) {
      str += "\n  allowStale: true";
      extras = true;
    }

    const max = priv(this, "max");
    if (max && max !== Infinity) {
      if (extras) {
        str += ",";
      }
      str += "\n  max: " + util.inspect(max, opts);
      extras = true;
    }

    const maxAge = priv(this, "maxAge");
    if (maxAge) {
      if (extras) {
        str += ",";
      }
      str += "\n  maxAge: " + util.inspect(maxAge, opts);
      extras = true;
    }

    const lc = priv(this, "lengthCalculator");
    if (lc && lc !== naiveLength) {
      if (extras) {
        str += ",";
      }
      str += "\n  length: " + util.inspect(priv(this, "length"), opts);
      extras = true;
    }

    let didFirst = false;
    priv(this, "lruList").forEach((item: any) => {
      if (didFirst) {
        str += ",\n  ";
      } else {
        if (extras) {
          str += ",\n";
        }
        didFirst = true;
        str += "\n  ";
      }
      const key = util.inspect(item.key).split("\n").join("\n  ");
      let val: any = { value: item.value };
      if (item.maxAge !== maxAge) {
        val.maxAge = item.maxAge;
      }
      if (lc !== naiveLength) {
        val.length = item.length;
      }
      if (isStale(this, item)) {
        val.stale = true;
      }

      val = util.inspect(val, opts).split("\n").join("\n  ");
      str +=  `${key} => ${val}`;
    });

    if (didFirst || extras) {
      str += "\n";
    }
    str += "}";

    return str;
  }

  public set(key: string, value: any, maxAge?: number) {
    maxAge = maxAge || priv(this, "maxAge");

    const now = maxAge ? Date.now() : 0;
    const len = priv(this, "lengthCalculator").call(this, value, key);

    if (priv(this, "cache").has(key)) {
      if (len > priv(this, "max")) {
        del(this, priv(this, "cache").get(key));
        return false;
      }

      const node = priv(this, "cache").get(key);
      const item = node.value;

      // dispose of the old one before overwriting
      if (priv(this, "dispose")) {
        priv(this, "dispose").call(this, key, item.value);
      }

      item.now = now;
      item.maxAge = maxAge;
      item.value = value;
      priv(this, "length", priv(this, "length") + (len - item.length));
      item.length = len;
      this.get(key);
      trim(this);
      return true;
    }

    const hit = new Entry(key, value, len, now, maxAge);

    // oversized objects fall out of cache automatically.
    if (hit.length > priv(this, "max")) {
      if (priv(this, "dispose")) {
        priv(this, "dispose").call(this, key, value);
      }
      return false;
    }

    priv(this, "length", priv(this, "length") + hit.length);
    priv(this, "lruList").unshift(hit);
    priv(this, "cache").set(key, priv(this, "lruList").head);
    trim(this);
    return true;
  }

  public has(key: string) {
    if (!priv(this, "cache").has(key)) return false;
    const hit = priv(this, "cache").get(key).value;
    if (isStale(this, hit)) {
      return false;
    }
    return true;
  }

  public get(key: string) {
    return get(this, key, true);
  }

  public peek(key: string) {
    return get(this, key, false);
  }

  public pop() {
    const node = priv(this, "lruList").tail;
    if (!node) return undefined;
    del(this, node);
    return node.value;
  }

  public del(key: string) {
    del(this, priv(this, "cache").get(key));
  }

  public load(arr: any) {
    // reset the cache
    this.reset();

    const now = Date.now();
      // A previous serialized cache has the most recent items first
    for (let l = arr.length - 1; l >= 0; l--) {
      const hit = arr[l];
      const expiresAt = hit.e || 0;
      if (expiresAt === 0) {
        // the item was created without expiration in a non aged cache
        this.set(hit.k, hit.v);
      } else {
        const maxAge = expiresAt - now;
          // dont add already expired items
        if (maxAge > 0) {
          this.set(hit.k, hit.v, maxAge);
        }
      }
    }
  }

  public prune() {
    const self = this;
    priv(this, "cache").forEach((value: any, key: string) => {
      get(self, key, false);
    });
  }
}

function get(self: any, key: string, doUse: boolean) {
  const node = priv(self, "cache").get(key);
  let hit: any;
  if (node) {
    hit = node.value;
    if (isStale(self, hit)) {
      del(self, node);
      if (!priv(self, "allowStale")) hit = undefined;
    } else {
      if (doUse) {
        priv(self, "lruList").unshiftNode(node);
      }
    }
    if (hit) hit = hit.value;
  }
  return hit;
}

function isStale(self: any, hit: any) {
  if (!hit || (!hit.maxAge && !priv(self, "maxAge"))) {
    return false;
  }
  let stale = false;
  const diff = Date.now() - hit.now;
  if (hit.maxAge) {
    stale = diff > hit.maxAge;
  } else {
    stale = priv(self, "maxAge") && (diff > priv(self, "maxAge"));
  }
  return stale;
}

function trim(self: any) {
  if (priv(self, "length") > priv(self, "max")) {
    for (let walker = priv(self, "lruList").tail; priv(self, "length") > priv(self, "max") && walker !== null;) {
      // We know that we're about to delete this one, and also
      // what the next least recently used key will be, so just
      // go ahead and set it now.
      const prev = walker.prev;
      del(self, walker);
      walker = prev;
    }
  }
}

function del(self: any, node: any) {
  if (node) {
    const hit = node.value;
    if (priv(self, "dispose")) {
      priv(self, "dispose").call(this, hit.key, hit.value);
    }
    priv(self, "length", priv(self, "length") - hit.length);
    priv(self, "cache").delete(hit.key);
    priv(self, "lruList").removeNode(node);
  }
}

// classy, since V8 prefers predictable objects.
export class Entry {
  public key: string;
  public value: any;
  public length: number;
  public now: number;
  public maxAge: number;

  constructor(key: string, value: any, length: number, now: number, maxAge?: number) {
    this.key = key;
    this.value = value;
    this.length = length;
    this.now = now;
    this.maxAge = maxAge || 0;
  }
}
/**
 * PseudoMap
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;

// Either identical, or both NaN
function same(a: any, b: any) {
  return a === b || a !== a && b !== b;
}

export class Entry {
  public key: any;
  public value: any;
  private _index: number;

  constructor(k: any, v: any, i: number) {
    this.key = k;
    this.value = v;
    this._index = i;
  }
}

function find(data: any, k: any) {
  let i: number;
  let s: string;
  let key: any;
  for (i = 0, s = `_${k}`, key = s;
       hasOwnProperty.call(data, key);
       key = s + i++) {
    if (same(data[key].key, k))
      return data[key];
  }
}

function set(data: any, k: any, v: any) {
  let i: number;
  let s: string;
  let key: any;
  for (i = 0, s = `_${k}`, key = s;
       hasOwnProperty.call(data, key);
       key = s + i++) {
    if (same(data[key].key, k)) {
      data[key].value = v;
      return;
    }
  }
  data.size++;
  data[key] = new Entry(k, v, key);
}

export class PseudoMap {
  private _data: any;

  constructor(set?: any) {
    this.clear();

    if (set) {
      if (set instanceof PseudoMap) {
        set.forEach((value: any, key: any) => {
          this.set(key, value);
        }, this);
      } else if (typeof Map === "function" && set instanceof Map) {
        set.forEach((value, key, map) => {
          this.set(key, value);
        }, this);
      } else if (Array.isArray(set)) {
        set.forEach((kv) => {
          this.set(kv[0], kv[1]);
        }, this);
      }
      else {
        throw new TypeError("invalid argument");
      }
    }
  }

  public forEach(fn: Function, thisp?: any) {
    thisp = thisp || this;
    Object.keys(this._data).forEach(function (k) {
      if (k !== "size")
        fn.call(thisp, this._data[k].value, this._data[k].key);
    }, this);
  }

  public has(k: any) {
    return !!find(this._data, k);
  }

  public get(k: any) {
    const res = find(this._data, k);
    return res && res.value;
  }

  public set(k: any, v: any) {
    set(this._data, k, v);
  }

  public delete(k: any) {
    const res = find(this._data, k);
    if (res) {
      delete this._data[res._index];
      this._data.size--;
    }
  }

  public clear() {
    const data = Object.create({});
    data.size = 0;
    this._data = {
      value: data,
      enumerable: false,
      configurable: true,
      writable: false
    };
  }

  public get size() {
    return this._data.size;
  }

  public get values() {
    throw new Error("iterators are not implemented in this version");
  }
  public get keys() {
    throw new Error("iterators are not implemented in this version");
  }
  public get entries() {
    throw new Error("iterators are not implemented in this version");
  }
}
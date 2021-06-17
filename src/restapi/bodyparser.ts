/**
 * REST API Body Parser class
 */
import * as http from "http";
import * as querystring from "querystring";
import * as zlib from "zlib";
import { Stream } from "stream";

export function parse(req: http.IncomingMessage) {
  const stream = contentStream(req);
  let parser: Parser;

  let bytesExpected: number = 0;
  if (req.headers["content-length"]) {
    bytesExpected = parseInt(req.headers["content-length"], 10);
  } else if (typeof req.headers["transfer-encoding"] === "undefined") {
    bytesExpected = 0;
  }

  if (req.headers["content-type"]) {
    if (req.headers["content-type"].match(/octet-stream/i)) {
      parser = new OctetParser();
    } else if (req.headers["content-type"].match(/urlencoded/i)) {
      parser = new QuerystringParser();
    } else if (req.headers["content-type"].match(/json/i)) {
      parser = new JSONParser(bytesExpected);
    }
  }

  return new Promise((resolve, reject) => {
    if (!parser) {
      reject(new Error("Body parser not supported"));
      return;
    }

    stream.on("error", (err) => {
      reject(err);
    })
    .on("aborted", () => {
      reject(new Error("Request aborted"));
    })
    .on("data", (buffer) => {
      parser.write(buffer);
    }).on("end", () => {
      parser.end((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  });
}

function contentStream(req: http.IncomingMessage): Stream {
  const encoding = (req.headers["content-encoding"] || "identity").toLowerCase();
  const length = req.headers["content-length"];
  let stream: any;
  switch (encoding) {
    case "deflate":
      stream = zlib.createInflate();
      req.pipe(stream);
      break;
    case "gzip":
      stream = zlib.createGunzip();
      req.pipe(stream);
      break;
    case "identity":
      stream = req;
      stream.length = length;
      break;
    default:
      throw new Error(`Unsupported content encoding "${encoding}"`);
  }
  return stream as Stream;
}

/**
 * Base Parser Class
 */
class Parser {
  public data: any;

  constructor() {}

  public write(buffer: any): number {
    return 0;
  }

  public end(cb: (err: Error, result: any) => void) {}
}

/**
 * OctetParser Class
 */
class OctetParser extends Parser {
  private buffer?: Buffer;
  private bytesWritten: number;

  constructor() {
    super();
  }

  public write(buffer: any): number {
    if (this.buffer.length >= this.bytesWritten + buffer.length) {
      buffer.copy(this.buffer, this.bytesWritten);
    } else {
      this.buffer = Buffer.concat([this.buffer, buffer]);
    }
    this.bytesWritten += buffer.length;
    return buffer.length;
  }

  public end(cb: (err: Error, result: any) => void) {
    this.data = this.buffer.toString("utf8");
    cb(undefined, this.data);
  }
}

/**
 * QuerystringParser Class
 */
class QuerystringParser extends Parser {
  private maxKeys: number;
  private buffer: string;

  constructor(maxKeys: number = 1000) {
    super();
    this.maxKeys = maxKeys;
    this.buffer = "";
  }

  public write(buffer: Buffer): number {
    this.buffer += buffer.toString("ascii");
    return buffer.length;
  }

  public end(cb: (err: Error, result: any) => void) {
    const fields = querystring.parse(this.buffer.replace(/\+/g, "%2B"), "&", "=", {
      maxKeys: this.maxKeys
    });
    for (const field in fields) {
      this.data[field] = fields[field];
    }
    this.buffer = "";
    cb(undefined, this.data);
  }
}

/**
 * JSONParser Class
 */
class JSONParser extends Parser {
  private buffer?: Buffer;
  private bytesWritten: number;

  constructor(length: number = 0) {
    super();
    if (length) {
      this.buffer = new Buffer(length);
    } else {
      this.buffer = new Buffer("");
    }
    this.bytesWritten = 0;
  }

  public write(buffer: Buffer): number {
    if (this.buffer.length >= this.bytesWritten + buffer.length) {
      buffer.copy(this.buffer, this.bytesWritten);
    } else {
      this.buffer = Buffer.concat([this.buffer, buffer]);
    }
    this.bytesWritten += buffer.length;
    return buffer.length;
  }

  public end(cb: (err: Error, result: any) => void) {
    let err: Error;
    try {
      const fields = JSON.parse(this.buffer.toString("utf8"));
      for (const field in fields) {
        this.data[field] = fields[field];
      }
    } catch (e) {
      err = e;
    }
    this.buffer = undefined;
    cb(err, this.data);
  }
}
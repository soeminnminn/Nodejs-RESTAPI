/*!
 * accepts
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 *
 * https://github.com/jshttp/accepts
 */

import { IncomingMessage } from "http";
import { mime } from "./mime";
import { Negotiator } from "./negotiator";

export class Accepts {
  private headers: any;
  private negotiator: Negotiator;

  constructor(req: IncomingMessage) {
    this.headers = req.headers;
    this.negotiator = new Negotiator(req);
  }

  /**
   * Check if the given `type(s)` is acceptable, returning
   * the best match when true, otherwise `undefined`, in which
   * case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single mime type string
   * such as "application/json", the extension name
   * such as "json" or an array `["json", "html", "text/plain"]`. When a list
   * or array is given the _best_ match, if any is returned.
   *
   * Examples:
   *
   *     // Accept: text/html
   *     this.types('html');
   *     // => "html"
   *
   *     // Accept: text/*, application/json
   *     this.types('html');
   *     // => "html"
   *     this.types('text/html');
   *     // => "text/html"
   *     this.types('json', 'text');
   *     // => "json"
   *     this.types('application/json');
   *     // => "application/json"
   *
   *     // Accept: text/*, application/json
   *     this.types('image/png');
   *     this.types('png');
   *     // => undefined
   *
   *     // Accept: text/*;q=.5, application/json
   *     this.types(['html', 'json']);
   *     this.types('html', 'json');
   *     // => "json"
   *
   * @param {String|Array} types...
   * @return {String|Array|Boolean}
   * @public
   */
  public type(...types: string[]) {
    // no types, return all requested types
    if (!types || types.length === 0) {
      return this.negotiator.mediaTypes();
    }

    // no accept header, return first given type
    if (!this.headers.accept) {
      return types[0];
    }
    const mimes = types.map((type) => {
      return type.indexOf("/") === -1 ? mime.lookup(type) : type;
    });
    const accepts = this.negotiator.mediaTypes(mimes.filter((type: any) => {
      return typeof type === "string";
    }));

    const first = accepts[0];
    return first ? types[mimes.indexOf(first)] : false;
  }

  /**
   * Return accepted encodings or best fit based on `encodings`.
   *
   * Given `Accept-Encoding: gzip, deflate`
   * an array sorted by quality is returned:
   *
   *     ['gzip', 'deflate']
   *
   * @param {String|Array} encodings...
   * @return {String|Array}
   * @public
   */
  public encoding(...encodings: string[]) {
    // no encodings, return all requested encodings
    if (!encodings || encodings.length === 0) {
      return this.negotiator.encodings();
    }

    return this.negotiator.encodings(encodings)[0] || false;
  }

  /**
   * Return accepted charsets or best fit based on `charsets`.
   *
   * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
   * an array sorted by quality is returned:
   *
   *     ['utf-8', 'utf-7', 'iso-8859-1']
   *
   * @param {String|Array} charsets...
   * @return {String|Array}
   * @public
   */
  public charset(...charsets: string[]) {
    // no charsets, return all requested charsets
    if (!charsets || charsets.length === 0) {
      return this.negotiator.charsets();
    }

    return this.negotiator.charsets(charsets)[0] || false;
  }

  /**
   * Return accepted languages or best fit based on `langs`.
   *
   * Given `Accept-Language: en;q=0.8, es, pt`
   * an array sorted by quality is returned:
   *
   *     ['es', 'pt', 'en']
   *
   * @param {String|Array} langs...
   * @return {Array|String}
   * @public
   */
  public languages(...languages: string[]) {
    // no languages, return all requested languages
    if (!languages || languages.length === 0) {
      return this.negotiator.languages();
    }

    return this.negotiator.languages(languages)[0] || false;
  }
}
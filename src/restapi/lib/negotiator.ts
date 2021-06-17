/*!
 * negotiator
 * Copyright(c) 2012 Federico Romero
 * Copyright(c) 2012-2014 Isaac Z. Schlueter
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 *
 * https://github.com/jshttp/negotiator
 */
import { IncomingMessage } from "http";

class PreferredCharsets {
  private simpleCharsetRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;

  constructor() {}

  /**
   * Get the preferred charsets from an Accept-Charset header.
   * @public
   */
  public parse(accept: any, provided: any) {
    // RFC 2616 sec 14.2: no header = *
    const accepts: any = this.parseAcceptCharset(accept === undefined ? "*" : accept || "");

    if (!provided) {
      // sorted list of all charsets
      return accepts
        .filter(this.isQuality)
        .sort(this.compareSpecs)
        .map(this.getFullCharset);
    }

    const priorities = provided.map((type: string, index: number) => {
      return this.getCharsetPriority(type, accepts, index);
    });

    // sorted list of accepted charsets
    return priorities.filter(this.isQuality).sort(this.compareSpecs).map((priority: number) => {
      return provided[priorities.indexOf(priority)];
    });
  }

  /**
   * Parse the Accept-Charset header.
   * @private
   */
  private parseAcceptCharset(accept: string) {
    const accepts = accept.split(",");
    let i: number = 0, j: number = 0;

    for (i = 0, j = 0; i < accepts.length; i++) {
      const charset: any = this.parseCharset(accepts[i].trim(), i);

      if (charset) {
        accepts[j++] = charset;
      }
    }

    // trim accepts
    accepts.length = j;

    return accepts;
  }

  /**
   * Parse a charset from the Accept-Charset header.
   * @private
   */
  private parseCharset(str: string, i: number) {
    const match = this.simpleCharsetRegExp.exec(str);
    if (!match) return undefined;

    const charset = match[1];
    let q = 1;
    if (match[2]) {
      const params = match[2].split(";");
      for (let i = 0; i < params.length; i ++) {
        const p = params[i].trim().split("=");
        if (p[0] === "q") {
          q = parseFloat(p[1]);
          break;
        }
      }
    }

    return {
      charset: charset,
      q: q,
      i: i
    };
  }

  /**
   * Get the priority of a charset.
   * @private
   */
  private getCharsetPriority(charset: any, accepted: any[], index: number) {
    let priority = {o: -1, q: 0, s: 0};

    for (let i = 0; i < accepted.length; i++) {
      const spec = this.specify(charset, accepted[i], index);

      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec;
      }
    }

    return priority;
  }

  /**
   * Get the specificity of the charset.
   * @private
   */
  private specify(charset: any, spec: any, index: number) {
    let s = 0;
    if (spec.charset.toLowerCase() === charset.toLowerCase()) {
      s |= 1;
    } else if (spec.charset !== "*" ) {
      return undefined;
    }

    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s: s
    };
  }

  /**
   * Compare two specs.
   * @private
   */
  private compareSpecs(a: any, b: any) {
    return (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0;
  }

  /**
   * Get full charset string.
   * @private
   */
  private getFullCharset(spec: any) {
    return spec.charset;
  }

  /**
   * Check if a spec has any quality.
   * @private
   */
  private isQuality(spec: any) {
    return spec.q > 0;
  }
}

class PreferredEncodings {
  private simpleEncodingRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;

  constructor() {}

  /**
   * Get the preferred encodings from an Accept-Encoding header.
   * @public
   */
  public parse(accept: any, provided: any) {
    const accepts: any = this.parseAcceptEncoding(accept || "");

    if (!provided) {
      // sorted list of all encodings
      return accepts
        .filter(this.isQuality)
        .sort(this.compareSpecs)
        .map(this.getFullEncoding);
    }

    const priorities: any = provided.map((type: string, index: number) => {
      return this.getEncodingPriority(type, accepts, index);
    });

    // sorted list of accepted encodings
    return priorities.filter(this.isQuality).sort(this.compareSpecs).map((priority: number) => {
      return provided[priorities.indexOf(priority)];
    });
  }

  /**
   * Parse the Accept-Encoding header.
   * @private
   */
  private parseAcceptEncoding(accept: any) {
    const accepts = accept.split(",");
    let hasIdentity: any = false;
    let minQuality = 1;
    let i: number = 0, j: number = 0;

    for (i = 0, j = 0; i < accepts.length; i++) {
      const encoding = this.parseEncoding(accepts[i].trim(), i);

      if (encoding) {
        accepts[j++] = encoding;
        hasIdentity = hasIdentity || this.specify("identity", encoding);
        minQuality = Math.min(minQuality, encoding.q || 1);
      }
    }

    if (!hasIdentity) {
      /*
      * If identity doesn't explicitly appear in the accept-encoding header,
      * it's added to the list of acceptable encoding with the lowest q
      */
      accepts[j++] = {
        encoding: "identity",
        q: minQuality,
        i: i
      };
    }

    // trim accepts
    accepts.length = j;

    return accepts;
  }

  /**
   * Parse an encoding from the Accept-Encoding header.
   * @private
   */
  private parseEncoding(str: string, i: number) {
    const match = this.simpleEncodingRegExp.exec(str);
    if (!match) return undefined;

    const encoding = match[1];
    let q = 1;
    if (match[2]) {
      const params = match[2].split(";");
      for (let i = 0; i < params.length; i ++) {
        const p = params[i].trim().split("=");
        if (p[0] === "q") {
          q = parseFloat(p[1]);
          break;
        }
      }
    }

    return {
      encoding: encoding,
      q: q,
      i: i
    };
  }

  /**
   * Get the priority of an encoding.
   * @private
   */
  private getEncodingPriority(encoding: string, accepted: any[], index: any) {
    let priority = {o: -1, q: 0, s: 0};

    for (let i = 0; i < accepted.length; i++) {
      const spec = this.specify(encoding, accepted[i], index);

      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec;
      }
    }

    return priority;
  }

  /**
   * Get the specificity of the encoding.
   * @private
   */
  private specify(encoding: string, spec: any, index?: number) {
    let s = 0;
    if (spec.encoding.toLowerCase() === encoding.toLowerCase()) {
      s |= 1;
    } else if (spec.encoding !== "*" ) {
      return undefined;
    }

    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s: s
    };
  }

  /**
   * Compare two specs.
   * @private
   */
  private compareSpecs(a: any, b: any) {
    return (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0;
  }

  /**
   * Get full encoding string.
   * @private
   */
  private getFullEncoding(spec: any) {
    return spec.encoding;
  }

  /**
   * Check if a spec has any quality.
   * @private
   */
  private isQuality(spec: any) {
    return spec.q > 0;
  }
}

class PreferredLanguages {
  private simpleLanguageRegExp = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;

  constructor() {}

  /**
   * Get the preferred languages from an Accept-Language header.
   * @public
   */
  public parse(accept: any, provided: any) {
    // RFC 2616 sec 14.4: no header = *
    const accepts = this.parseAcceptLanguage(accept === undefined ? "*" : accept || "");

    if (!provided) {
      // sorted list of all languages
      return accepts
        .filter(this.isQuality)
        .sort(this.compareSpecs)
        .map(this.getFullLanguage);
    }

    const priorities = provided.map((type: string, index: number) => {
      return this.getLanguagePriority(type, accepts, index);
    });

    // sorted list of accepted languages
    return priorities.filter(this.isQuality).sort(this.compareSpecs).map((priority: number) => {
      return provided[priorities.indexOf(priority)];
    });
  }

  /**
   * Parse the Accept-Language header.
   * @private
   */
  private parseAcceptLanguage(accept: any) {
    const accepts = accept.split(",");
    let i: number = 0, j: number = 0;

    for (i = 0, j = 0; i < accepts.length; i++) {
      const language = this.parseLanguage(accepts[i].trim(), i);

      if (language) {
        accepts[j++] = language;
      }
    }

    // trim accepts
    accepts.length = j;

    return accepts;
  }

  /**
   * Parse a language from the Accept-Language header.
   * @private
   */
  private parseLanguage(str: string, i?: number) {
    const match = this.simpleLanguageRegExp.exec(str);
    if (!match) return undefined;

    const prefix = match[1];
    const suffix = match[2];
    let full = prefix;

    if (suffix) full += "-" + suffix;

    let q = 1;
    if (match[3]) {
      const params = match[3].split(";");
      for (let i = 0; i < params.length; i ++) {
        const p = params[i].split("=");
        if (p[0] === "q") q = parseFloat(p[1]);
      }
    }

    return {
      prefix: prefix,
      suffix: suffix,
      q: q,
      i: i,
      full: full
    };
  }

  /**
   * Get the priority of a language.
   * @private
   */
  private getLanguagePriority(language: string, accepted: any[], index: number) {
    let priority = {o: -1, q: 0, s: 0};

    for (let i = 0; i < accepted.length; i++) {
      const spec = this.specify(language, accepted[i], index);

      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec;
      }
    }

    return priority;
  }

  /**
   * Get the specificity of the language.
   * @private
   */
  private specify(language: string, spec: any, index: number) {
    const p = this.parseLanguage(language);
    if (!p) return undefined;
    let s = 0;
    if (spec.full.toLowerCase() === p.full.toLowerCase()) {
      s |= 4;
    } else if (spec.prefix.toLowerCase() === p.full.toLowerCase()) {
      s |= 2;
    } else if (spec.full.toLowerCase() === p.prefix.toLowerCase()) {
      s |= 1;
    } else if (spec.full !== "*" ) {
      return undefined;
    }

    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s: s
    };
  }

  /**
   * Compare two specs.
   * @private
   */
  private compareSpecs(a: any, b: any) {
    return (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0;
  }

  /**
   * Get full language string.
   * @private
   */
  private getFullLanguage(spec: any) {
    return spec.full;
  }

  /**
   * Check if a spec has any quality.
   * @private
   */
  private isQuality(spec: any) {
    return spec.q > 0;
  }
}

class PreferredMediaTypes {
  private simpleMediaTypeRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;

  constructor() {}

  /**
   * Get the preferred media types from an Accept header.
   * @public
   */
  public parse(accept: any, provided: any) {
    // RFC 2616 sec 14.2: no header = */*
    const accepts: any[] = this.parseAccept(accept === undefined ? "*/*" : accept || "");

    if (!provided) {
      // sorted list of all types
      return accepts
        .filter(this.isQuality)
        .sort(this.compareSpecs)
        .map(this.getFullType);
    }

    const priorities = provided.map((type: string, index: number) => {
      return this.getMediaTypePriority(type, accepts, index);
    });

    // sorted list of accepted types
    return priorities.filter(this.isQuality).sort(this.compareSpecs).map((priority: number) => {
      return provided[priorities.indexOf(priority)];
    });
  }

  /**
   * Parse the Accept header.
   * @private
   */
  private parseAccept(accept: any) {
    const accepts: any[] = this.splitMediaTypes(accept);
    let i: number = 0, j: number = 0;

    for (i = 0, j = 0; i < accepts.length; i++) {
      const mediaType = this.parseMediaType(accepts[i].trim(), i);

      if (mediaType) {
        accepts[j++] = mediaType;
      }
    }

    // trim accepts
    accepts.length = j;

    return accepts;
  }

  /**
   * Parse a media type from the Accept header.
   * @private
   */
  private parseMediaType(str: string, i?: number) {
    const match = this.simpleMediaTypeRegExp.exec(str);
    if (!match) return undefined;

    const params = Object.create({});
    let q = 1;
    const subtype = match[2];
    const type = match[1];

    if (match[3]) {
      const kvps = this.splitParameters(match[3]).map(this.splitKeyValuePair);

      for (let j = 0; j < kvps.length; j++) {
        const pair = kvps[j];
        const key = pair[0].toLowerCase();
        const val = pair[1];

        // get the value, unwrapping quotes
        const value = val && val[0] === '"' && val[val.length - 1] === '"'
          ? val.substr(1, val.length - 2)
          : val;

        if (key === "q") {
          q = parseFloat(value);
          break;
        }

        // store parameter
        params[key] = value;
      }
    }

    return {
      type: type,
      subtype: subtype,
      params: params,
      q: q,
      i: i
    };
  }

  /**
   * Get the priority of a media type.
   * @private
   */
  private getMediaTypePriority(type: string, accepted: any[], index: number) {
    let priority = {o: -1, q: 0, s: 0};

    for (let i = 0; i < accepted.length; i++) {
      const spec = this.specify(type, accepted[i], index);

      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec;
      }
    }

    return priority;
  }

  /**
   * Get the specificity of the media type.
   * @private
   */
  private specify(type: string, spec: any, index: number) {
    const p = this.parseMediaType(type);
    let s = 0;

    if (!p) {
      return undefined;
    }

    if (spec.type.toLowerCase() == p.type.toLowerCase()) {
      s |= 4;
    } else if (spec.type != "*") {
      return undefined;
    }

    if (spec.subtype.toLowerCase() == p.subtype.toLowerCase()) {
      s |= 2;
    } else if (spec.subtype != "*") {
      return undefined;
    }

    const keys = Object.keys(spec.params);
    if (keys.length > 0) {
      if (keys.every(function (k) {
        return spec.params[k] == "*" || (spec.params[k] || "").toLowerCase() == (p.params[k] || "").toLowerCase();
      })) {
        s |= 1;
      } else {
        return undefined;
      }
    }

    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s: s,
    };
  }

  /**
   * Compare two specs.
   * @private
   */
  private compareSpecs(a: any, b: any) {
    return (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0;
  }

  /**
   * Get full type string.
   * @private
   */
  private getFullType(spec: any) {
    return `${spec.type}/${spec.subtype}`;
  }

  /**
   * Check if a spec has any quality.
   * @private
   */
  private isQuality(spec: any) {
    return spec.q > 0;
  }

  /**
   * Count the number of quotes in a string.
   * @private
   */
  private quoteCount(str: string) {
    let count = 0;
    let index = 0;

    while ((index = str.indexOf('"', index)) !== -1) {
      count++;
      index++;
    }

    return count;
  }

  /**
   * Split a key value pair.
   * @private
   */
  private splitKeyValuePair(str: string) {
    const index = str.indexOf("=");
    let key: any;
    let val: any;

    if (index === -1) {
      key = str;
    } else {
      key = str.substr(0, index);
      val = str.substr(index + 1);
    }

    return [key, val];
  }

  /**
   * Split an Accept header into media types.
   * @private
   */
  private splitMediaTypes(accept: string) {
    const accepts = accept.split(",");
    let i: number = 0, j: number = 0;

    for (i = 1, j = 0; i < accepts.length; i++) {
      if (this.quoteCount(accepts[j]) % 2 == 0) {
        accepts[++j] = accepts[i];
      } else {
        accepts[j] += `,${accepts[i]}`;
      }
    }

    // trim accepts
    accepts.length = j + 1;

    return accepts;
  }

  /**
   * Split a string of parameters.
   * @private
   */
  private splitParameters(str: string) {
    const parameters = str.split(";");
    let i: number = 0, j: number = 0;

    for (i = 1, j = 0; i < parameters.length; i++) {
      if (this.quoteCount(parameters[j]) % 2 == 0) {
        parameters[++j] = parameters[i];
      } else {
        parameters[j] += `;${parameters[i]}`;
      }
    }

    // trim parameters
    parameters.length = j + 1;

    for (let i = 0; i < parameters.length; i++) {
      parameters[i] = parameters[i].trim();
    }

    return parameters;
  }
}

/**
 * Create a Negotiator instance from a request.
 * @param {object} request
 * @public
 */
export class Negotiator {
  private request: IncomingMessage;

  constructor(req: IncomingMessage) {
    this.request = req;
  }

  public charset(available?: any) {
    const set = this.charsets(available);
    return set && set[0];
  }

  public charsets(available?: any) {
    const preferredCharsets = new PreferredCharsets();
    return preferredCharsets.parse(this.request.headers["accept-charset"], available);
  }

  public encoding(available?: any) {
    const set = this.encodings(available);
    return set && set[0];
  }

  public encodings(available?: any) {
    const preferredEncodings = new PreferredEncodings();
    return preferredEncodings.parse(this.request.headers["accept-encoding"], available);
  }

  public language(available?: any) {
    const set = this.languages(available);
    return set && set[0];
  }

  public languages(available?: any) {
    const preferredLanguages = new PreferredLanguages();
    return preferredLanguages.parse(this.request.headers["accept-language"], available);
  }

  public mediaType(available?: any) {
    const set = this.mediaTypes(available);
    return set && set[0];
  }

  public mediaTypes(available?: any) {
    const preferredMediaTypes = new PreferredMediaTypes();
    return preferredMediaTypes.parse(this.request.headers.accept, available);
  }
}
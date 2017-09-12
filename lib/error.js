
var STATUS = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",

  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",

  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "306": "Switch Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",

  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Time-out",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",

  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Time-out",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "510": "Not Extended",
  "511": "Network Authentication Required",

  "103": "Checkpoint",
  "103": "Early Hints",
  "419": "I'm a fox (Smoothwall/Foxwall)",
  "420": "Method Failure (Spring Framework)",
  "420": "Enhance Your Calm (Twitter)",
  "450": "Blocked by Windows Parental Controls (Microsoft)",
  "498": "Invalid Token (Esri)",
  "499": "Token Required (Esri)",
  "499": "Request has been forbidden by antivirus",
  "509": "Bandwidth Limit Exceeded (Apache Web Server/cPanel)",
  "530": "Site is frozen",
  "598": "(Informal convention) Network read timeout error",
  "599": "(Informal convention) Network connect timeout error",

  "440": "Login Time-out",
  "449": "Retry With",
  "451": "Redirect",

  "444": "No Response",
  "495": "SSL Certificate Error",
  "496": "SSL Certificate Required",
  "497": "HTTP Request Sent to HTTPS Port",
  "499": "Client Closed Request",

  "520": "Unknown Error",
  "521": "Web Server Is Down",
  "522": "Connection Timed Out",
  "523": "Origin Is Unreachable",
  "524": "A Timeout Occurred",
  "525": "SSL Handshake Failed",
  "526": "Invalid SSL Certificate",
  "527": "Railgun Error"
};

var TEMPLETE = "<!DOCTYPE html>" +
  "<html>" +
  "<head>" +
  "<meta charset=utf-8>" +
  "<meta content='IE=edge' http-equiv=X-UA-Compatible>" +
  "<meta content='width=device-width,initial-scale=1' name='viewport'>" +
  '<link rel="icon" type="image/png" href="./icon/favicon.png">' +
  "<title><%= title %></title>" +
  '<style type="text/css">' +
  'body { padding-top: 50px; font: 14px "Lucida Grande", Helvetica, Arial, sans-serif; margin: 0; }' +
  '.container { padding-right: 15px; padding-left: 15px; margin-right: auto; margin-left: auto; }' +
  '@media (min-width: 768px) { .container { width: 750px; } }' +
  '@media (min-width: 992px) { .container { width: 970px; } }' +
  '@media (min-width: 1200px) { .container { width: 1170px; } }' +
  'pre { overflow: auto; font-family: monospace, monospace; page-break-inside: avoid; display: block; padding: 9.5px; margin: 0 0 10px; font-size: 13px; line-height: 1.42857143; color: #333; word-break: break-all; word-wrap: break-word; background-color: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; }' +
  '.row:before, .row:after { display: table; content: " "; }' +
  '.row:after { clear: both; }' +
  '.row { margin-right: -15px; margin-left: -15px; }' +
  '.page-title { padding-bottom: 16px; border-bottom: 1px solid #e0e0e0; }' +
  '.image { text-align:center; padding: 9.5px; margin: 0 0 10px; border: 1px solid #ccc; border-radius: 4px; background-color: #f5f5f5; }' +
  "</style>" +
  "</head>" +
  "<body>" +
  "<div class='container'>" +
  "<div class='row'>" +
  "<h1 class='page-title'><%= title %></h1>" +
  "<h2><%= message %></h2>" +
  "<% if(typeof stack !== 'undefined' && stack != '') { %>" +
  "<pre><%= stack %></pre>" +
  "<% } %>" +
  "<% if(typeof img !== 'undefined' && img != '') { %>" +
  "<div class='image'><%= img %></div>" +
  "<% } %>" +
  "</div>" +
  "</div>" +
  "</body>" +
  "</html>";

function Renderer() {
  var settings = {
    evaluate: /\<\%([\s\S]+?(\}?)+)%>/g,
    interpolate: /\<\%=([\s\S]+?)%>/g,
    block: /\<\%#\s*([\w]+)\(([\s\S]*?)\)\s*%>/g,
    blockDef: /\<\%##\s*([\w]+)\(([\s\w,]*)\)\s*[\n]([\s\S]*?)\s*#%>/g,
    argValues: /\s*({[\s\S]*?}|[^,]+)/g,
    varname: 'obj',
    helpers: {}
  };

  var jsValue = function(val) {
    return val.trim().replace(/\\'/g, '\'');
  };

  var handleBlockCall = function(c, blocks) {
    return (m, name, argStr) => {
      if (!c.helpers[name] && !blocks[name]) { return ''; }

      const args = [];
      argStr.replace(c.argValues, (m2, val) => { args.push(val); });
      if (c.helpers[name]) {
        const val = c.helpers[name](args.map(a => Function(`return ${jsValue(a)};`)()));
        return `';__out+=${JSON.stringify(val)};__out+='`;
      }

      const lookup = blocks[name].args.reduce((res, k, i) => {
        const hash = res;
        hash[k] = args.length <= i ? undefined : jsValue(args[i]);
        return hash;
      }, {});

      const blockStr = blocks[name].body
      .replace(c.interpolate, (m2, codeVal) => {
        const code = codeVal.trim();
        const key = code.split('.')[0];
        if (!(key in lookup)) { return m2; }
        const valStr = `var ${key}=${lookup[key]};return ${code};`;
        const val = Function(valStr)();
        return `';__out+=${JSON.stringify(val)};__out+='`;
      })
      .replace(c.block, handleBlockCall(c, blocks));

      return blockStr;
    };
  };

  var self = {
    compile: function(tmpl, conf) {
      var str = tmpl || '';
      const c = Object.assign({}, settings, conf);
      const blocks = {};

      str = str
        .replace(/'/g, '\\\'')
        .replace(c.blockDef, (m, name, argStr, body) => {
          blocks[name] = { args: argStr.split(',').map(a => a.trim()), body, };
          return '';
        })
        .replace(c.block, handleBlockCall(c, blocks))
        .replace(c.interpolate, (m, code) => `';__out+=${jsValue(code)};__out+='`)
        .replace(c.evaluate, (m, code) => `';${jsValue(code)}__out+='`);

      str = `var __out='${str}';return __out;`
        .replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t')
        .replace(/(\s|;|\}|^|\{)__out\+='';/g, '$1').replace(/\+''/g, '');

      str = `with(${c.varname}){${str}}`;
      return new Function(c.varname, str);
    }
  };
  return self;
}

function sendForbidden(res) {
  var data = {};
  var code = 403;
  var str = STATUS['' + code];
  var img = '<svg xmlns="http://www.w3.org/2000/svg" width="128px" height="128px" viewBox="0 0 128 128">';
  img += '<circle fill="#E8484A" cx="64" cy="64" r="56.343"/>';
  img += '<path fill="#F5F5F5" d="M109.804,66.109c0,3.992-3.24,7.232-7.233,7.232H25.429c-3.994,0-7.232-3.24-7.232-7.232v-4.22 c0-3.994,3.238-7.231,7.232-7.231h77.142c3.993,0,7.233,3.237,7.233,7.231V66.109z"/>';
  img += '</svg>';
  data.title = code + ' ' + str;
  data.message = 'Access to this resource on the server is denied!';
  data.img = img;

  var render = new Renderer().compile(TEMPLETE);
  res.writeHead(code, {'Content-Type': 'text/html'});
  res.end(render(data));
}

function underConstruction() {
  return function(req, res, next) {
    var data = {};
    var code = 200;
    var img = '<svg xmlns="http://www.w3.org/2000/svg" width="256px" height="225px" viewBox="0 0 256 225">';
    img += '<path fill="#FFBE00" d="M128.483,221.999c-36.13,0-72.309,0-108.439,0c-4.578,0-8.659-1.095-11.894-4.528 c-4.628-4.876-5.475-11.744-2.09-17.617c8.311-14.432,16.672-28.814,24.982-43.196c15.328-26.425,30.655-52.9,45.983-79.326';
    img += ' c12.839-22.195,25.729-44.391,38.569-66.586c5.972-10.302,19.559-10.351,25.529,0c26.376,45.485,52.752,90.971,79.078,136.458 c10.002,17.218,19.955,34.438,29.958,51.654c3.683,6.32,3.484,12.492-0.597,17.668c-3.185,3.982-7.466,5.524-12.44,5.474';
    img += ' c-10.451,0-20.903,0-31.353,0C180.089,221.999,154.262,221.999,128.483,221.999z M31.192,199.854c64.943,0,129.589,0,194.483,0 c-32.447-55.984-64.794-111.723-97.241-167.759C95.937,88.181,63.639,143.918,31.192,199.854z"/>';
    img += '<path fill="#010101" d="M145.652,141.729c-0.647,1.045-1.095,1.741-1.494,2.439c-2.885,4.925-5.772,9.803-8.559,14.778 c-0.696,1.245-0.995,2.737-1.543,4.429c2.588-0.248,2.141,1.146,1.942,2.339c-0.947,6.521-1.942,12.991-2.788,19.56';
    img += ' c-0.299,2.389-0.299,4.878-0.299,7.265c0,1.593-0.697,2.19-2.189,2.19c-6.171,0-12.392,0.049-18.563-0.051 c-0.696,0-1.891-0.745-1.94-1.242c-0.05-0.698,0.547-1.843,1.194-2.141c2.189-1.144,4.529-2.091,6.818-2.986';
    img += ' c1.842-0.746,2.737-1.843,2.787-3.981c0.05-7.564,0.449-15.129,0.398-22.743c0-4.38,0.796-8.46,2.688-12.341 c0.547-1.044,0.945-2.189,1.592-3.683c-0.747,0.349-1.145,0.446-1.493,0.646c-2.687,1.542-5.325,3.136-8.062,4.628';
    img += ' c-0.896,0.497-1.194,1.045-1.293,2.04c-0.101,0.847-0.547,1.843-1.194,2.29c-1.195,0.945-2.638,1.592-4.031,2.239 c-1.095,0.548-2.24,0.795-3.136-0.547c-2.587,1.691-5.076,3.284-7.564,4.975c-0.299,0.201-0.498,0.946-0.398,1.346';
    img += ' c2.338,9.903,4.777,19.757,7.216,29.609c0.349,1.396,0.1,1.891-1.394,1.891c-20.852-0.049-41.654,0-62.505-0.049 c-0.398,0-0.846-0.101-1.493-0.148c0.298-0.698,0.448-1.245,0.747-1.743c9.505-16.322,19.06-32.646,28.565-48.969';
    img += ' c0.697-1.193,1.692-1.793,2.986-1.692c2.737,0.2,5.523,0.299,8.211,0.896c1.394,0.298,2.588,1.542,3.733,2.488 c0.547,0.448,0.945,1.243,1.293,1.892c1.493,2.985,3.583,5.124,6.918,6.219c1.492,0.499,2.637,2.142,4.18,3.436';
    img += ' c2.239-1.395,4.677-2.937,7.116-4.53c0.249-0.148,0.398-0.496,0.498-0.795c1.593-5.524,2.837-11.147,4.827-16.522 c1.643-4.479,1.693-8.759,0.847-13.288c-0.548-2.936-0.647-5.922-0.996-8.907c-0.249-1.991,0.349-3.683,1.543-5.275';
    img += ' c1.095-1.393,2.14-2.787,3.185-4.23c0.996-1.293,0.498-2.488-1.095-2.538c-5.524-0.1-9.007-3.384-11.446-7.863 c-2.041-3.683-1.443-7.465,1.045-10.75c2.189-2.886,5.225-4.33,8.858-3.633c5.375,0.996,9.057,5.674,9.207,11.446';
    img += ' c0.049,1.045,0.149,2.24,0.597,3.185c0.647,1.294,1.643,1.344,2.837,0.398c1.791-1.493,3.582-3.036,5.573-4.13 c1.641-0.896,3.633-1.593,5.425-1.593c7.067-0.05,14.134,0.348,20.901,2.936c3.035,1.145,5.024,3.086,5.423,6.42';
    img += ' c0.599,4.529,1.347,9.057,1.893,13.635c0.247,2.041,0.795,3.683,2.836,4.629c3.035,1.393,3.832,5.325,0.101,7.415 c-1.443,0.847-2.838,2.04-4.628,0.398c-0.201-0.2-1.593,0.646-2.24,1.243c-0.299,0.25-0.397,1.097-0.299,1.542';
    img += ' c1.443,5.773,2.985,11.546,4.329,17.318c0.598,2.688,0.946,5.476,1.145,8.212c0.149,2.19,1.195,3.732,2.737,5.227 c1.195-1.195,1.99-0.397,2.887,0.597c3.933,4.181,7.864,8.41,11.895,12.49c1.792,1.841,3.731,3.633,5.723,5.226';
    img += ' c1.394,1.146,1.841,2.389,1.094,3.932c-2.09,4.379-4.179,8.759-6.47,13.039c-1.393,2.639-4.329,3.633-7.264,3.034 c-1.793-0.347-2.141-1.193-1.346-2.835c0.847-1.692,1.693-3.334,2.29-5.127c1.096-3.234,0.198-5.821-2.637-7.961';
    img += ' c-5.075-3.883-9.953-8.111-14.98-12.046c-3.333-2.636-5.574-5.87-6.917-9.853c-1.543-4.578-3.333-9.106-5.026-13.685 C146.25,143.221,146.05,142.672,145.652,141.729z M121.516,120.828c-0.2,0.099-0.398,0.197-0.597,0.298c0,2.338-0.05,4.728,0,7.066';
    img += ' c0.099,1.991-0.299,3.831-1.344,5.522c-1.99,3.386-3.98,6.77-5.921,10.154c-0.348,0.646-0.398,1.492-0.598,2.237 c0.696-0.197,1.443-0.248,2.041-0.597c4.28-2.537,8.51-5.126,12.69-7.812c2.042-1.295,2.29-3.684,3.135-5.675';
    img += ' c0.1-0.199-0.1-0.697-0.299-0.896C127.637,127.694,124.602,124.261,121.516,120.828z M143.364,100.572 c4.627,6.669,8.956,12.988,13.585,19.657c0.399-0.897,1.145-1.791,0.995-2.438c-1.493-5.375-3.085-10.7-4.728-16.024';
    img += ' c-0.15-0.498-0.746-1.144-1.146-1.144C149.137,100.572,146.25,100.572,143.364,100.572z"/>';
    img += '</svg>';
    data.title = 'Under Construction';
    data.message = 'Our website is coming soon.';
    data.img = img;

    var render = new Renderer().compile(TEMPLETE);
    res.writeHead(code, {'Content-Type': 'text/html'});
    res.end(render(data));
  };
}

function error(debug) {
  return function(err, req, res, next) {
    var data = {};
    var code = 500;
    if (typeof err === 'object') {
      code = (err.status || 500);
      var str = STATUS['' + code];
      data.title = (typeof str === 'undefined') ? code + ' Unknown Error' : code + ' ' + str;
      data.message = err.message;
      data.stack = debug ? err.stack : '';

    } else if (typeof err === 'string') {
      var str = STATUS['' + code];
      data.title = code + ' ' + str;
      data.message = err;
      data.stack = '';

    } else {
      data.title = code + ' ' + STATUS['' + code];
      data.message = 'Unknown error.';
      data.stack = '';
    }

    var render = new Renderer().compile(TEMPLETE);
    res.writeHead(code, {'Content-Type': 'text/html'});
    res.end(render(data));
  };
}

function finalhandler(req, res, options) {
  var debug = options.debug || true;
  return function(err) {
    error(debug)(err, req, res);
  };
}

module.exports = error;
module.exports.finalhandler = finalhandler;
module.exports.sendForbidden = sendForbidden;
module.exports.underConstruction = underConstruction;

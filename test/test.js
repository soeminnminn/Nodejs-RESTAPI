var assert = require('assert');
var request = require('supertest');
var app = require("../app");
var splitter = require("../dist/restapi/splitter");

function parse(str, opts) {
	// pretend non-string parsed per-se
	if (typeof str !== "string") {
		return [str];
	}
	var res = [str];

	if (typeof opts === "string" || Array.isArray(opts)) {
		opts = { brackets: opts };
	} else if (!opts) {
		opts = {};
	}

	var delimiter = opts.delimiter;
	var brackets = opts.brackets ? (Array.isArray(opts.brackets) ? opts.brackets : [opts.brackets]) : ["''", "{}", "[]", "()"];
	var escape = opts.escape || "___";

	brackets.forEach(function (bracket) {
		// create parenthesis regex
		var pRE = new RegExp(["\\", bracket[0], "[^\\", bracket[0], "\\", bracket[1], "]*\\", bracket[1]].join(""));
		var ids = [];

		function replaceToken(token, idx, str){
			// save token to res
			var refId = res.push(token.slice(bracket[0].length, -bracket[1].length)) - 1;
			ids.push(refId);
			return escape + refId;
		}

		res.forEach(function (str, i) {
			var prevStr;

			// replace paren tokens till there’s none
			var a = 0;
			while (str != prevStr) {
				prevStr = str;
				str = str.replace(pRE, replaceToken);
				if (a++ > 10e3) throw Error("References have circular dependency. Please, check them.");
			}

			res[i] = str;
		})

		// wrap found refs to brackets
		ids = ids.reverse();
		res = res.map(function (str) {
			ids.forEach(function (id) {
				str = str.replace(new RegExp("(\\" + escape + id + "(?![0-9]))", "g"), bracket[0] + "$1" + bracket[1]);
			})
			return str;
		})
	});

	function flatten(arr) {
		var result = "";
		for (var i in arr) {
			if (Array.isArray(arr[i])) {
				result += flatten(arr[i]);
			} else {
				result += arr[i];
			}
		}
		return result;
	}

	var re = new RegExp("\\" + escape + "([0-9]+)");

	// transform references to tree
	function nest(str, refs, escape) {
		var res = [];
		var match;
		var a = 0;
		while (match = re.exec(str)) {
			if (a++ > 10e3) {
				throw Error("Circular references in parenthesis");
			}
			res.push(str.slice(0, match.index));
			res.push(nest(refs[match[1]], refs));
			str = str.slice(match.index + match[0].length);
		}
		res.push(str);
		return res;
	}

	function split(res, delimiter) {
		var d = [];
		var isInner = false;
		for (var i=0; i<res.length; i++) {
			var s = res[i];
			if (Array.isArray(s)) {
				var flated = d[d.length - 1] + flatten(s);
				d[d.length - 1] = flated;
				isInner = true;
			} else {
				var arr = s.split(delimiter);
				for (var a in arr) {
					if (isInner) {
						var flated = d[d.length - 1] + arr[a];
						d[d.length - 1] = flated;
						isInner = false;
					} else {
						d.push(arr[a]);
					}
				}
			}
		}
		return d;
	}

	res = nest(res[0], res);

	if (delimiter) {
		res = split(res, delimiter);
	}
	return res;
}

describe("CHECK FUNCTION", function() {
	it("It's Ok!", (done) => {
		const colStr = `code,raw(price,itemcount)@total,(10)@ten,'12 January,2019'@date`;
		const opts = {
			delimiter: ","
		};

		const output = parse(colStr, opts);
		console.log(JSON.stringify(output));
			
		const parser = new splitter.Splitter(opts)
		const output1 = parser.parse(colStr);
		console.log(JSON.stringify(output1));
			
		assert.equal(JSON.stringify(output1), JSON.stringify(output));
		done();
		// process.exit(0);
	});
});

// describe("GET /", function() {
//   it("displays \"It's work!\"", function(done) {
//     // The line below is the core test of our app.
//     request(app).get("/").expect("It's work!", done);
//   });
// });

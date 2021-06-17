import * as fs from "fs";
import * as path from "path";
import * as showdown from "showdown";

class ReadMe {
  private static SRC = "./README.md";
  private static DEST = "./dist/restapi/readme.html";
  private static HTML_TEMPLETE = [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    "<meta charset=utf-8>",
    "<meta content='IE=edge' http-equiv=X-UA-Compatible>",
    "<meta content='width=device-width,initial-scale=1' name='viewport'>",
    "<title>REST API - Readme</title>",
    "<style type='text/css'>",
    "* { box-sizing: border-box; }",
    "body { margin: 0; padding: 0; word-wrap: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }",
    ".container { width: 978px; margin: 0 auto; overflow-x: auto; border: 1px solid #eee; font-size: 16px; line-height: 1.5; padding: 8px 45px; border-radius: 0; }",
    "h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }",
    "h1, h2 { padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }",
    "h1 { font-size: 2em; }",
    "h2 { font-size: 1.5em; }",
    ".anchor { float: left; padding-right: 4px; margin-left: -20px; line-height: 1; }",
    "h1:hover .anchor, h2:hover .anchor, h3:hover .anchor, h4:hover .anchor, h5:hover .anchor, h6:hover .anchor { text-decoration: none; }",
    "h1 .octicon-link, h2 .octicon-link, h3 .octicon-link, h4 .octicon-link, h5 .octicon-link, h6 .octicon-link { color: #1b1f23; vertical-align: middle; visibility: hidden; }",
    "svg:not(:root) { overflow: hidden; }",
    ".octicon { vertical-align: text-bottom; display: inline-block; fill: currentColor; }",
    "h1:hover .anchor .octicon-link, h2:hover .anchor .octicon-link, h3:hover .anchor .octicon-link, h4:hover .anchor .octicon-link, h5:hover .anchor .octicon-link, h6:hover .anchor .octicon-link { visibility: visible; }",
    "hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #e1e4e8; border: 0; }",
    "p, blockquote, ul, ol, dl, table, pre { margin-top: 0; margin-bottom: 16px; }",
    "pre { padding: 16px; overflow: auto; font-size: 85%; line-height: 1.45; background-color: #f6f8fa; border-radius: 3px; word-wrap: normal; }",
    "tt, code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; border-radius: 3px; }",
    "pre > code { font-size: 100%; word-break: normal; white-space: pre; }",
    "pre code, pre tt { display: inline; max-width: auto; padding: 0; margin: 0; overflow: visible; line-height: inherit; word-wrap: normal; background-color: transparent; border: 0; }",
    "blockquote { padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; }",
    "ul, ol { padding-left: 2em; }",
    "table { border-spacing: 0; border-collapse: collapse; display: block; width: 100%; overflow: auto; }",
    "table th, table td { padding: 6px 13px; border: 1px solid #dfe2e5; }",
    "table th { font-weight: 600; }",
    "table tr { background-color: #fff; border-top: 1px solid #c6cbd1; }",
    "table tr:nth-child(2n) { background-color: #f6f8fa; }",
    "a { color: #0366d6; text-decoration: none; }",
    "a:hover { text-decoration: underline; }",
    "a:active, a:hover { outline-width: 0; }",
    "</style>",
    "</head>",
    "<body>",
    "<div class='container'>",
    "{{data}}",
    "</div>",
    "</body>",
    "</html>"
  ];
  private static HEAD_ANCHOR = [
    "<a id='user-content-{{name}}' class='anchor' href='#{{name}}' aria-hidden='true'>",
    "<svg aria-hidden='true' class='octicon octicon-link' height='16' version='1.1' viewBox='0 0 16 16' width='16'>",
    "<path fill-rule='evenodd' d='M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 \
    3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 \
    12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z'>",
    "</path></svg></a>"
  ];
  private converter: showdown.Converter;

  constructor() {
    this.converter = new showdown.Converter();
    this.converter.setFlavor("github");
    this.converter.setOption("tables", true);
  }

  public writeOut() {
    const srcFilePath = path.join(__dirname, ReadMe.SRC);
    const destFilePath = path.join(__dirname, ReadMe.DEST);

    fs.readFile(srcFilePath, (err, data) => {
      const mdStr = data.toString();
      const converted = this.converter.makeHtml(mdStr);
      const headAnchor = ReadMe.HEAD_ANCHOR.join("").replace(/[\s]+/g, " ");
      let html = converted.replace(/(<h[1-6] id=")([^\/]+)(">)([^<>]+<\/h[1-6]>)/gi, function(x, x1, x2, x3, x4) {
        const anchor = headAnchor.replace(/\{\{name\}\}/g, x2);
        return x1 + x2 + x3 + anchor + x4;
      });
      html = ReadMe.HTML_TEMPLETE.join("\n").replace(/\{\{data\}\}/, html);

      fs.writeFile(destFilePath, html, (werr) => {
        if (werr) {
          console.log(werr);
        } else {
          console.log("Sucess");
        }
      });
    });
  }
}

new ReadMe().writeOut();
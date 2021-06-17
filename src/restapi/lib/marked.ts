/**
 * marked - a markdown parser
 * Copyright (c) 2011-2018, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/markedjs/marked
 */

/**
 * Block-Level Grammar
 */
const block: any = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)/,
  nptable: noop,
  blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
  list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: "^ {0,3}(?:" // optional indentation
    + "<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)" // (1)
    + "|comment[^\\n]*(\\n+|$)" // (2)
    + "|<\\?[\\s\\S]*?\\?>\\n*" // (3)
    + "|<![A-Z][\\s\\S]*?>\\n*" // (4)
    + "|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>\\n*" // (5)
    + "|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)" // (6)
    + "|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=\\h*\\n)[\\s\\S]*?(?:\\n{2,}|$)" // (7) open tag
    + "|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=\\h*\\n)[\\s\\S]*?(?:\\n{2,}|$)" // (7) closing tag
    + ")",
  def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
  table: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading| {0,3}>|<\/?(?:tag)(?: +|\n|\/?>)|<(?:script|pre|style|!--))[^\n]+)*)/,
  text: /^[^\n]+/
};

block._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
block.def = edit(block.def)
  .replace("label", block._label)
  .replace("title", block._title)
  .getRegex();

block.bullet = /(?:[*+-]|\d{1,9}\.)/;
block.item = /^( *)(bull) ?[^\n]*(?:\n(?!\1bull ?)[^\n]*)*/;
block.item = edit(block.item, "gm")
  .replace(/bull/g, block.bullet)
  .getRegex();

block.list = edit(block.list)
  .replace(/bull/g, block.bullet)
  .replace("hr", "\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))")
  .replace("def", `\\n+(?=${block.def.source})`)
  .getRegex();

block._tag = "address|article|aside|base|basefont|blockquote|body|caption"
  + "|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption"
  + "|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe"
  + "|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option"
  + "|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr"
  + "|track|ul";
block._comment = /<!--(?!-?>)[\s\S]*?-->/;
block.html = edit(block.html, "i")
  .replace("comment", block._comment)
  .replace("tag", block._tag)
  .replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
  .getRegex();

block.paragraph = edit(block.paragraph)
  .replace("hr", block.hr)
  .replace("heading", block.heading)
  .replace("lheading", block.lheading)
  .replace("tag", block._tag) // pars can be interrupted by type (6) html blocks
  .getRegex();

block.blockquote = edit(block.blockquote)
  .replace("paragraph", block.paragraph)
  .getRegex();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ {0,3}(`{3,}|~{3,})([^`\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = edit(block.paragraph)
  .replace("(?!", "(?!"
    + block.gfm.fences.source.replace("\\1", "\\2") + "|"
    + block.list.source.replace("\\1", "\\3") + "|")
  .getRegex();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *([^|\n ].*\|.*)\n *([-:]+ *\|[-| :]*)(?:\n((?:.*[^>\n ].*(?:\n|$))*)\n*|$)/,
  table: /^ *\|(.+)\n *\|?( *[-:]+[-| :]*)(?:\n((?: *[^>\n ].*(?:\n|$))*)\n*|$)/
});

/**
 * Pedantic grammar
 */

block.pedantic = merge({}, block.normal, {
  html: edit(
    "^ *(?:comment *(?:\\n|\\s*$)"
    + "|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)" // closed tag
    + "|<tag(?:\"[^\"]*\"|\'[^\']*\'|\\s[^\'\"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))")
    .replace("comment", block._comment)
    .replace(/tag/g, "(?!(?:"
      + "a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub"
      + "|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)"
      + "\\b)\\w+(?!:|[^\\w\\s@]*@)\\b")
    .getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/
});

/**
 * Block Lexer
 */
class Lexer {
  public tokens: any;
  public options: any;
  public rules: any;

  constructor(options?: any) {
    this.tokens = [];
    this.tokens.links = Object.create({});
    this.options = options || marked.defaults;
    this.rules = block.normal;

    if (this.options.pedantic) {
      this.rules = block.pedantic;
    } else if (this.options.gfm) {
      if (this.options.tables) {
        this.rules = block.tables;
      } else {
        this.rules = block.gfm;
      }
    }
  }

  /**
   * Expose Block Rules
   */
  public static rules = block;

  /**
   * Static Lex Method
   */
  public static lex(src: string, options?: any) {
    const lexer = new Lexer(options);
    return lexer.lex(src);
  }

  /**
   * Preprocessing
   */
  public lex(src: string) {
    src = src
    .replace(/\r\n|\r/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/\u00a0/g, " ")
    .replace(/\u2424/g, "\n");

    return this.token(src, true);
  }

  /**
   * Lexing
   */
  public token(src: string, top: boolean) {
    src = src.replace(/^ +$/gm, "");
    let next;
    let loose;
    let cap;
    let bull;
    let b;
    let item;
    let listStart;
    let listItems;
    let t;
    let space;
    let i;
    let tag;
    let l;
    let isordered;
    let istask;
    let ischecked;

    while (src) {
      // newline
      if (cap = this.rules.newline.exec(src)) {
        src = src.substring(cap[0].length);
        if (cap[0].length > 1) {
          this.tokens.push({
            type: "space"
          });
        }
      }

      // code
      if (cap = this.rules.code.exec(src)) {
        src = src.substring(cap[0].length);
        cap = cap[0].replace(/^ {4}/gm, "");
        this.tokens.push({
          type: "code",
          text: !this.options.pedantic
            ? rtrim(cap, "\n")
            : cap
        });
        continue;
      }

      // fences (gfm)
      if (cap = this.rules.fences.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: "code",
          lang: cap[2] ? cap[2].trim() : cap[2],
          text: cap[3] || ""
        });
        continue;
      }

      // heading
      if (cap = this.rules.heading.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: "heading",
          depth: cap[1].length,
          text: cap[2]
        });
        continue;
      }

      // table no leading pipe (gfm)
      if (cap = this.rules.nptable.exec(src)) {
        item = {
          type: "table",
          header: splitCells(cap[1].replace(/^ *| *\| *$/g, "")),
          align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
          cells: cap[3] ? cap[3].replace(/\n$/, "").split("\n") : []
        };

        if (item.header.length === item.align.length) {
          src = src.substring(cap[0].length);

          for (i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = "right";
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = "center";
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = "left";
            } else {
              item.align[i] = undefined;
            }
          }

          for (i = 0; i < item.cells.length; i++) {
            item.cells[i] = splitCells(item.cells[i], item.header.length);
          }

          this.tokens.push(item);

          continue;
        }
      }

      // hr
      if (cap = this.rules.hr.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: "hr"
        });
        continue;
      }

      // blockquote
      if (cap = this.rules.blockquote.exec(src)) {
        src = src.substring(cap[0].length);

        this.tokens.push({
          type: "blockquote_start"
        });

        cap = cap[0].replace(/^ *> ?/gm, "");

        // Pass `top` to keep the current
        // "toplevel" state. This is exactly
        // how markdown.pl works.
        this.token(cap, top);

        this.tokens.push({
          type: "blockquote_end"
        });

        continue;
      }

      // list
      if (cap = this.rules.list.exec(src)) {
        src = src.substring(cap[0].length);
        bull = cap[2];
        isordered = bull.length > 1;

        listStart = {
          type: "list_start",
          ordered: isordered,
          start: isordered ? +bull : "",
          loose: false
        };

        this.tokens.push(listStart);

        // Get each top-level item.
        cap = cap[0].match(this.rules.item);

        listItems = [];
        next = false;
        l = cap.length;
        i = 0;

        for (; i < l; i++) {
          item = cap[i];

          // Remove the list item's bullet
          // so it is seen as the next token.
          space = item.length;
          item = item.replace(/^ *([*+-]|\d+\.) */, "");

          // Outdent whatever the
          // list item contains. Hacky.
          if (~item.indexOf("\n ")) {
            space -= item.length;
            item = !this.options.pedantic
              ? item.replace(new RegExp(`^ {1,${space}}`, "gm"), "")
              : item.replace(/^ {1,4}/gm, "");
          }

          // Determine whether the next list item belongs here.
          // Backpedal if it does not belong in this list.
          if (i !== l - 1) {
            b = block.bullet.exec(cap[i + 1])[0];
            if (bull.length > 1 ? b.length === 1
              : (b.length > 1 || (this.options.smartLists && b !== bull))) {
              src = cap.slice(i + 1).join("\n") + src;
              i = l - 1;
            }
          }

          // Determine whether item is loose or not.
          // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
          // for discount behavior.
          loose = next || /\n\n(?!\s*$)/.test(item);
          if (i !== l - 1) {
            next = item.charAt(item.length - 1) === "\n";
            if (!loose) loose = next;
          }

          if (loose) {
            listStart.loose = true;
          }

          // Check for task list items
          istask = /^\[[ xX]\] /.test(item);
          ischecked = undefined;
          if (istask) {
            ischecked = item[1] !== " ";
            item = item.replace(/^\[[ xX]\] +/, "");
          }

          t = {
            type: "list_item_start",
            task: istask,
            checked: ischecked,
            loose: loose
          };

          listItems.push(t);
          this.tokens.push(t);

          // Recurse.
          this.token(item, false);

          this.tokens.push({
            type: "list_item_end"
          });
        }

        if (listStart.loose) {
          l = listItems.length;
          i = 0;
          for (; i < l; i++) {
            listItems[i].loose = true;
          }
        }

        this.tokens.push({
          type: "list_end"
        });

        continue;
      }

      // html
      if (cap = this.rules.html.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: this.options.sanitize
            ? "paragraph"
            : "html",
          pre: !this.options.sanitizer
            && (cap[1] === "pre" || cap[1] === "script" || cap[1] === "style"),
          text: cap[0]
        });
        continue;
      }

      // def
      if (top && (cap = this.rules.def.exec(src))) {
        src = src.substring(cap[0].length);
        if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
        tag = cap[1].toLowerCase().replace(/\s+/g, " ");
        if (!this.tokens.links[tag]) {
          this.tokens.links[tag] = {
            href: cap[2],
            title: cap[3]
          };
        }
        continue;
      }

      // table (gfm)
      if (cap = this.rules.table.exec(src)) {
        item = {
          type: "table",
          header: splitCells(cap[1].replace(/^ *| *\| *$/g, "")),
          align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
          cells: cap[3] ? cap[3].replace(/\n$/, "").split("\n") : []
        };

        if (item.header.length === item.align.length) {
          src = src.substring(cap[0].length);

          for (i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = "right";
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = "center";
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = "left";
            } else {
              item.align[i] = undefined;
            }
          }

          for (i = 0; i < item.cells.length; i++) {
            item.cells[i] = splitCells(
              item.cells[i].replace(/^ *\| *| *\| *$/g, ""),
              item.header.length);
          }

          this.tokens.push(item);

          continue;
        }
      }

      // lheading
      if (cap = this.rules.lheading.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: "heading",
          depth: cap[2] === "=" ? 1 : 2,
          text: cap[1]
        });
        continue;
      }

      // top-level paragraph
      if (top && (cap = this.rules.paragraph.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: "paragraph",
          text: cap[1].charAt(cap[1].length - 1) === "\n"
            ? cap[1].slice(0, -1)
            : cap[1]
        });
        continue;
      }

      // text
      if (cap = this.rules.text.exec(src)) {
        // Top-level should never reach here.
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: "text",
          text: cap[0]
        });
        continue;
      }

      if (src) {
        throw new Error(`Infinite loop on byte: ${src.charCodeAt(0)}`);
      }
    }

    return this.tokens;
  }
}

/**
 * Inline-Level Grammar
 */

const inline: any = {
  escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
  autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
  url: noop,
  tag: "^comment"
    + "|^</[a-zA-Z][\\w:-]*\\s*>" // self-closing tag
    + "|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>" // open tag
    + "|^<\\?[\\s\\S]*?\\?>" // processing instruction, e.g. <?php ?>
    + "|^<![a-zA-Z]+\\s[\\s\\S]*?>" // declaration, e.g. <!DOCTYPE html>
    + "|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>", // CDATA section
  link: /^!?\[(label)\]\(href(?:\s+(title))?\s*\)/,
  reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
  nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
  strong: /^__([^\s_])__(?!_)|^\*\*([^\s*])\*\*(?!\*)|^__([^\s][\s\S]*?[^\s])__(?!_)|^\*\*([^\s][\s\S]*?[^\s])\*\*(?!\*)/,
  em: /^_([^\s_])_(?!_)|^\*([^\s*"<\[])\*(?!\*)|^_([^\s][\s\S]*?[^\s_])_(?!_|[^\spunctuation])|^_([^\s_][\s\S]*?[^\s])_(?!_|[^\spunctuation])|^\*([^\s"<\[][\s\S]*?[^\s*])\*(?!\*)|^\*([^\s*"<\[][\s\S]*?[^\s])\*(?!\*)/,
  code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
  br: /^( {2,}|\\)\n(?!\s*$)/,
  del: noop,
  text: /^(`+|[^`])[\s\S]*?(?=[\\<!\[`*]|\b_| {2,}\n|$)/
};

inline._punctuation = "!\"#$%&\'()*+,\\-./:;<=>?@\\[^_{|}~";
inline.em = edit(inline.em).replace(/punctuation/g, inline._punctuation).getRegex();

inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
inline.autolink = edit(inline.autolink)
  .replace("scheme", inline._scheme)
  .replace("email", inline._email)
  .getRegex();

inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

inline.tag = edit(inline.tag)
  .replace("comment", block._comment)
  .replace("attribute", inline._attribute)
  .getRegex();

inline._label = /(?:\[[^\[\]]*\]|\\[\[\]]?|`[^`]*`|`(?!`)|[^\[\]\\`])*?/;
inline._href = /\s*(<(?:\\[<>]?|[^\s<>\\])*>|[^\s\x00-\x1f]*)/;
inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

inline.link = edit(inline.link)
  .replace("label", inline._label)
  .replace("href", inline._href)
  .replace("title", inline._title)
  .getRegex();

inline.reflink = edit(inline.reflink)
  .replace("label", inline._label)
  .getRegex();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/,
  link: edit(/^!?\[(label)\]\((.*?)\)/)
    .replace("label", inline._label)
    .getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
    .replace("label", inline._label)
    .getRegex()
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: edit(inline.escape).replace("])", "~|])").getRegex(),
  _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
  url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
  _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
  del: /^~+(?=\S)([\s\S]*?\S)~+/,
  text: edit(inline.text)
    .replace("]|", "~]|")
    .replace("|$", "|https?://|ftp://|www\\.|[a-zA-Z0-9.!#$%&\'*+/=?^_`{\\|}~-]+@|$")
    .getRegex()
});

inline.gfm.url = edit(inline.gfm.url)
  .replace("email", inline.gfm._extended_email)
  .getRegex();
/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: edit(inline.br).replace("{2,}", "*").getRegex(),
  text: edit(inline.gfm.text).replace("{2,}", "*").getRegex()
});

class InlineLexer {
  public options: any;
  public links: any;
  public rules: any;
  public renderer: any;
  private inLink: boolean;
  private inRawBlock: boolean;

  constructor(links: any, options?: any) {
    this.options = options || marked.defaults;
    this.links = links;
    this.rules = inline.normal;
    this.renderer = this.options.renderer || new Renderer();
    this.renderer.options = this.options;

    if (!this.links) {
      throw new Error("Tokens array requires a `links` property.");
    }

    if (this.options.pedantic) {
      this.rules = inline.pedantic;
    } else if (this.options.gfm) {
      if (this.options.breaks) {
        this.rules = inline.breaks;
      } else {
        this.rules = inline.gfm;
      }
    }
  }

  /**
   * Expose Inline Rules
   */
  public static rules: any = inline;

  /**
   * Static Lexing/Compiling Method
   */
  public static output(src: string, links: any, options?: any) {
    const inline = new InlineLexer(links, options);
    return inline.output(src);
  }

  /**
   * Lexing/Compiling
   */
  public output(src: string) {
    let out = "";
    let link;
    let text;
    let href;
    let title;
    let cap;
    let prevCapZero;

    while (src) {
      // escape
      if (cap = this.rules.escape.exec(src)) {
        src = src.substring(cap[0].length);
        out += escaper(cap[1]);
        continue;
      }

      // tag
      if (cap = this.rules.tag.exec(src)) {
        if (!this.inLink && /^<a /i.test(cap[0])) {
          this.inLink = true;
        } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
          this.inLink = false;
        }
        if (!this.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.inRawBlock = true;
        } else if (this.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.inRawBlock = false;
        }

        src = src.substring(cap[0].length);
        out += this.options.sanitize
          ? this.options.sanitizer
            ? this.options.sanitizer(cap[0])
            : escaper(cap[0])
          : cap[0];
        continue;
      }

      // link
      if (cap = this.rules.link.exec(src)) {
        const lastParenIndex = findClosingBracket(cap[2], "()");
        if (lastParenIndex > -1) {
          const linkLen = cap[0].length - (cap[2].length - lastParenIndex) - (cap[3] || "").length;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = "";
        }
        src = src.substring(cap[0].length);
        this.inLink = true;
        href = cap[2];
        if (this.options.pedantic) {
          link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

          if (link) {
            href = link[1];
            title = link[3];
          } else {
            title = "";
          }
        } else {
          title = cap[3] ? cap[3].slice(1, -1) : "";
        }
        href = href.trim().replace(/^<([\s\S]*)>$/, "$1");
        out += this.outputLink(cap, {
          href: InlineLexer.escapes(href),
          title: InlineLexer.escapes(title)
        });
        this.inLink = false;
        continue;
      }

      // reflink, nolink
      if ((cap = this.rules.reflink.exec(src))
          || (cap = this.rules.nolink.exec(src))) {
        src = src.substring(cap[0].length);
        link = (cap[2] || cap[1]).replace(/\s+/g, " ");
        link = this.links[link.toLowerCase()];
        if (!link || !link.href) {
          out += cap[0].charAt(0);
          src = cap[0].substring(1) + src;
          continue;
        }
        this.inLink = true;
        out += this.outputLink(cap, link);
        this.inLink = false;
        continue;
      }

      // strong
      if (cap = this.rules.strong.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.strong(this.output(cap[4] || cap[3] || cap[2] || cap[1]));
        continue;
      }

      // em
      if (cap = this.rules.em.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.em(this.output(cap[6] || cap[5] || cap[4] || cap[3] || cap[2] || cap[1]));
        continue;
      }

      // code
      if (cap = this.rules.code.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.codespan(escaper(cap[2].trim(), true));
        continue;
      }

      // br
      if (cap = this.rules.br.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.br();
        continue;
      }

      // del (gfm)
      if (cap = this.rules.del.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.del(this.output(cap[1]));
        continue;
      }

      // autolink
      if (cap = this.rules.autolink.exec(src)) {
        src = src.substring(cap[0].length);
        if (cap[2] === "@") {
          text = escaper(this.mangle(cap[1]));
          href = `mailto:${text}`;
        } else {
          text = escaper(cap[1]);
          href = text;
        }
        out += this.renderer.link(href, undefined, text);
        continue;
      }

      // url (gfm)
      if (!this.inLink && (cap = this.rules.url.exec(src))) {
        if (cap[2] === "@") {
          text = escaper(cap[0]);
          href = `mailto:${text}`;
        } else {
          // do extended autolink path validation
          do {
            prevCapZero = cap[0];
            cap[0] = this.rules._backpedal.exec(cap[0])[0];
          } while (prevCapZero !== cap[0]);
          text = escaper(cap[0]);
          if (cap[1] === "www.") {
            href = `http://${text}`;
          } else {
            href = text;
          }
        }
        src = src.substring(cap[0].length);
        out += this.renderer.link(href, undefined, text);
        continue;
      }

      // text
      if (cap = this.rules.text.exec(src)) {
        src = src.substring(cap[0].length);
        if (this.inRawBlock) {
          out += this.renderer.text(cap[0]);
        } else {
          out += this.renderer.text(escaper(this.smartypants(cap[0])));
        }
        continue;
      }

      if (src) {
        throw new Error(`Infinite loop on byte: ${src.charCodeAt(0)}`);
      }
    }

    return out;
  }

  public static escapes(text: string) {
    return text ? text.replace(InlineLexer.rules._escapes, "$1") : text;
  }

  /**
   * Compile Link
   */
  public outputLink(cap: any[], link: any) {
    const href = link.href;
    const title = link.title ? escaper(link.title) : "";

    return cap[0].charAt(0) !== "!"
      ? this.renderer.link(href, title, this.output(cap[1]))
      : this.renderer.image(href, title, escaper(cap[1]));
  }

  /**
   * Smartypants Transformations
   */
  public smartypants(text: string) {
    if (!this.options.smartypants) return text;
    return text
      // em-dashes
      .replace(/---/g, "\u2014")
      // en-dashes
      .replace(/--/g, "\u2013")
      // opening singles
      .replace(/(^|[-\u2014/(\[{"\s])'/g, "$1\u2018")
      // closing singles & apostrophes
      .replace(/'/g, "\u2019")
      // opening doubles
      .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1\u201c")
      // closing doubles
      .replace(/"/g, "\u201d")
      // ellipses
      .replace(/\.{3}/g, "\u2026");
  }

  /**
   * Mangle Links
   */
  public mangle(text: string) {
    if (!this.options.mangle) return text;
    let out = "";
    const l = text.length;
    let i = 0;
    let ch;

    for (; i < l; i++) {
      ch = text.charCodeAt(i);
      if (Math.random() > 0.5) {
        ch = `x${ch.toString(16)}`;
      }
      out += `&#${ch};`;
    }

    return out;
  }
}

class Renderer {
  public options: any;

  constructor(options?: any) {
    this.options = options || marked.defaults;
  }

  public code(code: string, lang: string, escaped: boolean) {
    if (this.options.highlight) {
      const out = this.options.highlight(code, lang);
      if (!out && out !== code) {
        escaped = true;
        code = out;
      }
    }

    if (!lang) {
      return `<pre><code>${(escaped ? code : escaper(code, true))}</code></pre>`;
    }

    return "<pre><code class=\""
      + this.options.langPrefix
      + escaper(lang, true)
      + '">'
      + (escaped ? code : escaper(code, true))
      + "</code></pre>\n";
  }

  public blockquote(quote: string) {
    return `<blockquote>\n${quote}</blockquote>\n`;
  }

  public html(html: string) {
    return html;
  }

  public heading(text: string, level: number, raw: string) {
    if (this.options.headerIds) {
      return `<h${level} id=\"${this.options.headerPrefix}${raw.toLowerCase().replace(/[^\w]+/g, "-")}\">${text}</h${level}>\n`;
    }
    // ignore IDs
    return `<h${level}>${text}</h${level}>\n`;
  }

  public hr() {
    return this.options.xhtml ? "<hr/>\n" : "<hr>\n";
  }

  public list(body: string, ordered: boolean, start: number) {
    const type = ordered ? "ol" : "ul",
      startatt = (ordered && start !== 1) ? (` start=\"${start}\"`) : "";
    return `<${type}${startatt}>\n${body}</${type}>\n`;
  }

  public listitem(text: string) {
    return `<li>${text}</li>\n`;
  }

  public checkbox(checked: boolean) {
    return "<input "
      + (checked ? "checked=\"\" " : "")
      + "disabled=\"\" type=\"checkbox\""
      + (this.options.xhtml ? " /" : "")
      + "> ";
  }

  public paragraph(text: string) {
    return `<p>${text}</p>\n`;
  }

  public table(header: string, body: string) {
    if (body) body = `<tbody>${body}</tbody>`;
    return `<table>\n<thead>\n${header}</thead>\n${body}</table>\n`;
  }

  public tablerow(content: string) {
    return `<tr>\n${content}</tr>\n`;
  }

  public tablecell(content: string, flags: any) {
    const type = flags.header ? "th" : "td";
    const tag = flags.align
      ? `<${type} align=\"${flags.align}\">`
      : `<${type}>`;
    return `${tag}${content}</${type}>\n`;
  }

  // span level renderer
  public strong(text: string) {
    return `<strong>${text}</strong>`;
  }

  public em(text: string) {
    return `<em>${text}</em>`;
  }

  public codespan(text: string) {
    return `<code>${text}</code>`;
  }

  public br() {
    return this.options.xhtml ? "<br/>" : "<br>";
  }

  public del(text: string) {
    return `<del>${text}</del>`;
  }

  public link(href: string, title: string, text: string) {
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }
    let out = `<a href=\"${escaper(href)}\"`;
    if (title) {
      out += ` title=\"${title}\"`;
    }
    out += `>${text}</a>`;
    return out;
  }

  public image(href: string, title: string, text: string) {
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }

    let out = `<img src=\"${href}\" alt=\"${text}\"`;
    if (title) {
      out += ` title=\"${title}\"`;
    }
    out += this.options.xhtml ? "/>" : ">";
    return out;
  }

  public text(text: string) {
    return text;
  }
}

/**
 * TextRenderer
 * returns only the textual part of the token
 */
class TextRenderer {
  constructor() {}

  // no need for block level renderers
  public strong(text: string): string {
    return text;
  }

  public em(text: string): string {
    return text;
  }

  public codespan(text: string): string {
    return text;
  }

  public del(text: string): string {
    return text;
  }

  public text(text: string): string {
    return text;
  }

  public link(href: string, title: string, text: string) {
    return `${text}`;
  }

  public image(href: string, title: string, text: string) {
    return `${text}`;
  }

  public br() {
    return "";
  }
}

/**
 * Parsing & Compiling
 */
class Parser {
  public tokens: any[];
  public token: any;
  public options: any;
  public renderer: any;
  private inline: any;
  private inlineText: any;
  private slugger: Slugger;

  /**
   * Static Parse Method
   */
  public static parse(src: any, options?: any) {
    const parser = new Parser(options);
    return parser.parse(src);
  }

  constructor(options?: any) {
    this.tokens = [];
    this.token = undefined;
    this.options = options || marked.defaults;
    this.options.renderer = this.options.renderer || new Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.slugger = new Slugger();
  }

  /**
   * Parse Loop
   */
  public parse(src: any) {
    this.inline = new InlineLexer(src.links, this.options);
    // use an InlineLexer with a TextRenderer to extract pure text
    this.inlineText = new InlineLexer(
      src.links,
      merge({}, this.options, {renderer: new TextRenderer()})
    );
    this.tokens = src.reverse();

    let out = "";
    while (this.next()) {
      out += this.tok();
    }

    return out;
  }

  /**
   * Next Token
   */
  public next() {
    return this.token = this.tokens.pop();
  }

  /**
   * Preview Next Token
   */
  public peek() {
    return this.tokens[this.tokens.length - 1] || 0;
  }

  /**
   * Parse Text Tokens
   */
  public parseText() {
    let body = this.token.text;

    while (this.peek().type === "text") {
      body += `\n${this.next().text}`;
    }

    return this.inline.output(body);
  }

  /**
   * Parse Current Token
   */
  public tok() {
    let header = "";
    let body = "";

    switch (this.token.type) {
      case "space": {
        return "";
      }
      case "hr": {
        return this.renderer.hr();
      }
      case "heading": {
        return this.renderer.heading(
          this.inline.output(this.token.text),
          this.token.depth,
          unescape(this.inlineText.output(this.token.text)),
          this.slugger);
      }
      case "code": {
        return this.renderer.code(this.token.text,
          this.token.lang,
          this.token.escaped);
      }
      case "table": {
        let i;
        let row;
        let cell;
        let j;

        // header
        cell = "";
        for (i = 0; i < this.token.header.length; i++) {
          cell += this.renderer.tablecell(
            this.inline.output(this.token.header[i]),
            { header: true, align: this.token.align[i] }
          );
        }
        header += this.renderer.tablerow(cell);

        for (i = 0; i < this.token.cells.length; i++) {
          row = this.token.cells[i];

          cell = "";
          for (j = 0; j < row.length; j++) {
            cell += this.renderer.tablecell(
              this.inline.output(row[j]),
              { header: false, align: this.token.align[j] }
            );
          }

          body += this.renderer.tablerow(cell);
        }
        return this.renderer.table(header, body);
      }
      case "blockquote_start": {
        body = "";

        while (this.next().type !== "blockquote_end") {
          body += this.tok();
        }

        return this.renderer.blockquote(body);
      }
      case "list_start": {
        body = "";
        const ordered = this.token.ordered;
        const start = this.token.start;

        while (this.next().type !== "list_end") {
          body += this.tok();
        }

        return this.renderer.list(body, ordered, start);
      }
      case "list_item_start": {
        body = "";
        const loose = this.token.loose;
        const checked = this.token.checked;
        const task = this.token.task;

        if (this.token.task) {
          body += this.renderer.checkbox(checked);
        }

        while (this.next().type !== "list_item_end") {
          body += !loose && this.token.type === "text"
            ? this.parseText()
            : this.tok();
        }
        return this.renderer.listitem(body, task, checked);
      }
      case "html": {
        // TODO parse inline content if parameter markdown=1
        return this.renderer.html(this.token.text);
      }
      case "paragraph": {
        return this.renderer.paragraph(this.inline.output(this.token.text));
      }
      case "text": {
        return this.renderer.paragraph(this.parseText());
      }
      default: {
        const errMsg = `Token with "${this.token.type}" type was not found.`;
        if (this.options.silent) {
          console.log(errMsg);
        } else {
          throw new Error(errMsg);
        }
      }
    }
  }
}

/**
 * Slugger generates header id
 */
class Slugger {
  private seen: any;

  constructor() {
    this.seen = {};
  }

  /**
   * Convert string to unique id
   */
  public slug(value: any) {
    let slug = value
      .toLowerCase()
      .trim()
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "")
      .replace(/\s/g, "-");

    if (this.seen.hasOwnProperty(slug)) {
      const originalSlug = slug;
      do {
        this.seen[originalSlug]++;
        slug = `${originalSlug}-${this.seen[originalSlug]}`;
      } while (this.seen.hasOwnProperty(slug));
    }
    this.seen[slug] = 0;

    return slug;
  }
}

/**
 * Helpers
 */
const escaper = function(html: string, encode: boolean = false) {
  if (encode) {
    if (escaper.escapeTest.test(html)) {
      return html.replace(escaper.escapeReplace, (ch) => { return (<any>escaper.replacements)[ch]; });
    }
  } else {
    if (escaper.escapeTestNoEncode.test(html)) {
      return html.replace(escaper.escapeReplaceNoEncode, (ch) => { return (<any>escaper.replacements)[ch]; });
    }
  }

  return html;
};

escaper.escapeTest = /[&<>"']/;
escaper.escapeReplace = /[&<>"']/g;
escaper.replacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
};

escaper.escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
escaper.escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;

function unescape(html: string) {
  // explicitly match decimal, hex, and named HTML entities
  return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, (_, n) => {
    n = n.toLowerCase();
    if (n === "colon") return ":";
    if (n.charAt(0) === "#") {
      return n.charAt(1) === "x"
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return "";
  });
}

function edit(regex: any, opt?: any) {
  regex = regex.source || regex;
  opt = opt || "";
  return {
    replace: (name: string | RegExp, val: any) => {
      val = val.source || val;
      val = val.replace(/(^|[^\[])\^/g, "$1");
      regex = regex.replace(name, val);
      return this;
    },
    getRegex: () => {
      return new RegExp(regex, opt);
    }
  };
}

function cleanUrl(sanitize: string, base: string, href: string) {
  if (sanitize) {
    let prot: string;
    try {
      prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, "")
        .toLowerCase();
    } catch (e) {
      return undefined;
    }
    if (prot.indexOf("javascript:") === 0 || prot.indexOf("vbscript:") === 0 || prot.indexOf("data:") === 0) {
      return undefined;
    }
  }
  if (base && !originIndependentUrl.test(href)) {
    href = resolveUrl(base, href);
  }
  try {
    href = encodeURI(href).replace(/%25/g, "%");
  } catch (e) {
    return undefined;
  }
  return href;
}

function resolveUrl(base: string, href: string) {
  if (!baseUrls[` ${base}`]) {
    // we can ignore everything in base after the last slash of its path component,
    // but we might need to add _that_
    // https://tools.ietf.org/html/rfc3986#section-3
    if (/^[^:]+:\/*[^/]*$/.test(base)) {
      baseUrls[` ${base}`] = `${base}/`;
    } else {
      baseUrls[` ${base}`] = rtrim(base, "/", true);
    }
  }
  base = baseUrls[` ${base}`];

  if (href.slice(0, 2) === "//") {
    return base.replace(/:[\s\S]*/, ":") + href;
  } else if (href.charAt(0) === "/") {
    return base.replace(/(:\/*[^/]*)[\s\S]*/, "$1") + href;
  } else {
    return base + href;
  }
}
const baseUrls: any = {};
const originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;

function noop() {}
noop.exec = noop;

function merge(obj: any, ...args: any) {
  let target;
  let key;

  for (let i = 0; i < args.length; i++) {
    target = args[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}

function splitCells(tableRow: string, count: number = 0) {
  // ensure that every cell-delimiting pipe has a space
  // before it to distinguish it from an escaped pipe
  const row = tableRow.replace(/\|/g, (match, offset, str) => {
      let escaped = false;
      let curr = offset;
      while (--curr >= 0 && str[curr] === "\\") escaped = !escaped;
      if (escaped) {
        // odd number of slashes means | is escaped
        // so we leave it alone
        return "|";
      } else {
        // add space before unescaped |
        return " |";
      }
    });
  const cells = row.split(/ \|/);
  let i = 0;

  if (cells.length > count) {
    cells.splice(count);
  } else {
    while (cells.length < count) cells.push("");
  }

  for (; i < cells.length; i++) {
    // leading or trailing whitespace is ignored per the gfm spec
    cells[i] = cells[i].trim().replace(/\\\|/g, "|");
  }
  return cells;
}

// Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
// /c*$/ is vulnerable to REDOS.
// invert: Remove suffix of non-c chars instead. Default falsey.
function rtrim(str: string, c: string, invert: boolean = false) {
  if (str.length === 0) {
    return "";
  }

  // Length of suffix matching the invert condition.
  let suffLen = 0;

  // Step left until we fail to match the invert condition.
  while (suffLen < str.length) {
    const currChar = str.charAt(str.length - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }

  return str.substr(0, str.length - suffLen);
}

function findClosingBracket(str: string, b: any) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\") {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Marked
 */
const marked = function(src: string, opt: any, callback: Function) {
  // throw error in case of non string input
  if (typeof src === "undefined" || src === null) {
    throw new Error("marked(): input parameter is undefined or null");
  }
  if (typeof src !== "string") {
    throw new Error(`marked(): input parameter is of type `
      + `${Object.prototype.toString.call(src)}, string expected`);
  }

  if (callback || typeof opt === "function") {
    if (!callback) {
      callback = opt;
      opt = undefined;
    }

    opt = merge({}, marked.defaults, opt || {});

    const highlight = opt.highlight;
    let tokens: any;
    let pending: number;
    let i = 0;

    try {
      tokens = Lexer.lex(src, opt);
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    const done = (err?: any) => {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      let out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(undefined, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== "code") {
          return --pending || done();
        }
        return highlight(token.text, token.lang, (err: any, code: string) => {
          if (err) return done(err);
          if (!code || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += "\nPlease report this to https://github.com/markedjs/marked.";
    if ((opt || marked.defaults).silent) {
      return `<p>An error occurred:</p><pre>${escaper(`${e.message}`, true)}</pre>`;
    }
    throw e;
  }
};

/**
 * Options
 */

marked.options =
marked.setOptions = (opt: any) => {
  merge(marked.defaults, opt);
  return marked;
};

marked.getDefaults = () => {
  return {
    baseUrl: "",
    breaks: false,
    gfm: true,
    headerIds: true,
    headerPrefix: "",
    highlight: "",
    langPrefix: "language-",
    mangle: true,
    pedantic: false,
    renderer: new Renderer(),
    sanitize: false,
    sanitizer: "",
    silent: false,
    smartLists: false,
    smartypants: false,
    tables: true,
    xhtml: false
  };
};

marked.defaults = marked.getDefaults();

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;
marked.TextRenderer = TextRenderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;
export default marked;
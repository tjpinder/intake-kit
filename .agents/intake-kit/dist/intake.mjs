// intake-kit: Node version guard
{
  var __ikMajor = parseInt(process.versions.node.split(".")[0], 10);
  if (!(__ikMajor >= 22)) {
    process.stderr.write("intake-kit needs Node 22 or later (found " + process.versions.node + "). Install it from https://nodejs.org\n");
    process.exit(1);
  }
}
import { createRequire as __ikCreateRequire } from "node:module";
const require = __ikCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar;
    exports.isSeq = isSeq;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path) {
      const ctrl = callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = visit_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path) {
      const ctrl = await callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path) {
      if (typeof visitor === "function")
        return visitor(key, node, path);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path);
      return void 0;
    }
    function replaceNode(key, path, node) {
      const parent = path[path.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        if (found && ctx) {
          const { anchors: anchors2, doc: doc2, maxAliasCount } = ctx;
          let data = anchors2.get(found);
          if (!data) {
            toJS.toJS(found, null, ctx);
            data = anchors2.get(found);
          }
          if (data?.res === void 0) {
            const msg = "This should not happen: Alias anchor was not resolved?";
            throw new ReferenceError(msg);
          }
          if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
              data.aliasCount = getAliasCount(doc2, found, anchors2);
            if (data.count * data.aliasCount > maxAliasCount) {
              const msg = "Excessive alias count indicates a resource exhaustion attack";
              throw new ReferenceError(msg);
            }
          }
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const source = this.resolve(ctx.doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        return ctx.anchors.get(source).res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path, value) {
      let v = value;
      for (let i = path.length - 1; i >= 0; --i) {
        const k = path[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path, value) {
        if (isEmptyPath(path))
          this.add(value);
        else {
          const [key, ...rest] = path;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        const [key, ...rest] = path;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start2 = i + 1;
      let ch = text[start2];
      while (ch === " " || ch === "	") {
        if (i < start2 + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start2 = i + 1;
          ch = text[start2];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start2 = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start2 > limit)
            return true;
          start2 = i + 1;
          if (strLen - start2 <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start2 = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start2, i) + "\\ ";
          i += 1;
          start2 = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start2, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start2 = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start2, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start2 = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start2 ? str + json.slice(start2) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start2 = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start2) {
        value = value.substring(start2.length);
        start2 = start2.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start2}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start2}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start: start2, end } = flowChars;
      if (lines.length === 0) {
        return start2 + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start2;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start2}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        if (Collection.isEmptyPath(path)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        if (Collection.isEmptyPath(path))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path) {
        if (Collection.isEmptyPath(path))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        if (Collection.isEmptyPath(path)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start2 = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start2 ?? (start2 = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start2 ?? (start2 = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start2 ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start: start2, key, sep, value } = collItem;
        const keyProps = resolveProps.resolveProps(start2, {
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start2[start2.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start2, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start: start2, value } of bs.items) {
        const props = resolveProps.resolveProps(start2, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start2, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep + cb;
              sep = "";
              break;
            }
            case "newline":
              if (comment)
                sep += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start: start2, key, sep, value } = collItem;
        const props = resolveProps.resolveProps(start2, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start2) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start2, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep)
                for (const st of sep) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start2 = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start2, start2, start2] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start2 + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start2, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep === " ")
            sep = "\n";
          else if (!prevMoreIndented && sep === "\n")
            sep = "\n\n";
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep === "\n")
            value += "\n";
          else
            sep = "\n";
        } else {
          value += sep + content;
          sep = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start2 + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start2, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return unfoldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function unfoldLines(source) {
      const line = /(.*?)\r?\n/sy;
      let match = line.exec(source);
      if (!match)
        return source;
      let trimEnd, trimBoth;
      try {
        trimEnd = new RegExp("(?<![ 	])[ 	]+$");
        trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
      } catch {
        trimEnd = /[ \t]+$/;
        trimBoth = /^[ \t]+|[ \t]+$/g;
      }
      let res = match[1].replace(trimEnd, "");
      let sep = " ";
      let pos = line.lastIndex;
      while (match = line.exec(source)) {
        const lm = match[1].replace(trimBoth, "");
        if (lm === "") {
          if (sep === "\n")
            res += sep;
          else
            sep = "\n";
        } else {
          res += sep + lm;
          sep = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start: start2, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start2, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start2, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start: start2, key, sep, value }) {
      let res = "";
      for (const st of start2)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep)
        for (const st of sep)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path) => {
      let item = cst;
      for (const [field, index] of path) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path) => {
      const parent = visit.itemAtPath(cst, path.slice(0, -1));
      const field = path[path.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path, item, visitor) {
      let ctrl = visitor(item, path);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
    }
    exports.visit = visit;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start2 = this.lineStarts[low - 1];
          return { line: low, col: offset - start2 + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list2, type) {
      for (let i = 0; i < list2.length; ++i)
        if (list2[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list2) {
      for (let i = 0; i < list2.length; ++i) {
        switch (list2[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start2 = getFirstKeyStartProps(prev);
          let sep;
          if (scalar.end) {
            sep = scalar.end;
            sep.push(this.sourceToken);
            delete scalar.end;
          } else
            sep = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start: start2, key: scalar, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start2 = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start2 = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start2.push(this.sourceToken);
                map.items.push({ start: start2 });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start2.push(this.sourceToken);
                map.items.push({ start: start2, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start3 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start3, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start3 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep = it.sep;
                  sep.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start3, key, sep }]
                  });
                } else if (start2.length > 0) {
                  it.sep = it.sep.concat(start2, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start: start2, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start: start2, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start: start2 });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start2 = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep = fc.end.splice(1, fc.end.length);
            sep.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start: start2, key: fc, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start2 = getFirstKeyStartProps(prev);
            start2.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: start2, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start2 = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: start2, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start2, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start2.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit.visit;
    exports.visitAsync = visit.visitAsync;
  }
});

// src/cli/intake.ts
import { existsSync as existsSync4, mkdirSync as mkdirSync2, readFileSync as readFileSync4, rmSync, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname2, join as join4 } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

// src/lib/generated/framework-validators.js
var framework_validators_exports = {};
__export(framework_validators_exports, {
  module: () => module,
  router: () => router,
  scoring: () => scoring,
  sections: () => sections
});

// src/lib/schema-runtime.ts
function deepEqual(a, b) {
  if (a === b) return true;
  if (a && b && typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return a !== a && b !== b;
}
function ucs2length(str) {
  let length = 0;
  for (const _ of str) length++;
  return length;
}
var DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;
function dateTime(s) {
  const m = DATE_TIME.exec(s);
  if (!m) return false;
  const [y, mo, d, h, mi, se] = m.slice(1, 7).map(Number);
  const leap = y % 4 === 0 && y % 100 !== 0 || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (!days || d < 1 || d > days || h > 23 || mi > 59 || se > 60) return false;
  const sign = m[7] === "-" ? -1 : 1, tzH = Number(m[8] ?? 0), tzM = Number(m[9] ?? 0);
  if (tzH > 23 || tzM > 59) return false;
  if (se < 60) return true;
  const utcMin = mi - tzM * sign;
  const utcHr = h - tzH * sign - (utcMin < 0 ? 1 : 0);
  return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1);
}
var equal = { default: deepEqual };
var ucs2 = { default: ucs2length };
var formats = { fullFormats: { "date-time": { validate: dateTime } } };

// src/lib/generated/framework-validators.js
var router = validate53;
var schema20 = { "type": "object", "additionalProperties": false, "required": ["framework_version", "types", "modifiers", "rules"], "properties": { "framework_version": { "$ref": "#/$defs/semver" }, "types": { "type": "object", "propertyNames": { "$ref": "#/$defs/item_type" }, "minProperties": 5, "additionalProperties": { "type": "object", "additionalProperties": false, "required": ["label", "signals", "low_confidence_probe", "output", "module"], "properties": { "label": { "type": "string" }, "signals": { "$ref": "#/$defs/phrases" }, "low_confidence_probe": { "type": "string", "minLength": 1 }, "output": { "enum": ["diagnostic_brief", "process_map", "feasibility_spec", "opportunity_backlog", "metric_spec"] }, "module": { "type": "string" } } } }, "modifiers": { "type": "object", "propertyNames": { "$ref": "#/$defs/modifier" }, "minProperties": 3, "additionalProperties": { "type": "object", "additionalProperties": false, "required": ["label", "signals", "module"], "properties": { "label": { "type": "string" }, "signals": { "$ref": "#/$defs/phrases" }, "module": { "type": "string" }, "effects": { "$ref": "#/$defs/effects" } } } }, "rules": { "type": "object", "required": ["reclassify_min_signals"], "properties": { "reclassify_min_signals": { "type": "integer", "minimum": 1 } } } } };
var pattern3 = new RegExp("^\\d+\\.\\d+\\.\\d+$", "u");
function validate54(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate54.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data === "string") {
    if (!pattern3.test(data)) {
      const err0 = { instancePath, schemaPath: "#/pattern", keyword: "pattern", params: { pattern: "^\\d+\\.\\d+\\.\\d+$" }, message: 'must match pattern "^\\d+\\.\\d+\\.\\d+$"' };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate54.errors = vErrors;
  return errors === 0;
}
validate54.evaluated = { "dynamicProps": false, "dynamicItems": false };
var schema22 = { "enum": ["broken", "manual_process", "known_idea", "exploratory", "data_report"] };
function validate56(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate56.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data === "broken" || data === "manual_process" || data === "known_idea" || data === "exploratory" || data === "data_report")) {
    const err0 = { instancePath, schemaPath: "#/enum", keyword: "enum", params: { allowedValues: schema22.enum }, message: "must be equal to one of the allowed values" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate56.errors = vErrors;
  return errors === 0;
}
validate56.evaluated = { "dynamicProps": false, "dynamicItems": false };
var func1 = ucs2.default;
function validate58(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate58.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (Array.isArray(data)) {
    if (data.length < 1) {
      const err0 = { instancePath, schemaPath: "#/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    const len0 = data.length;
    for (let i0 = 0; i0 < len0; i0++) {
      let data0 = data[i0];
      if (typeof data0 === "string") {
        if (func1(data0) < 1) {
          const err1 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      } else {
        const err2 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
  } else {
    const err3 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  validate58.errors = vErrors;
  return errors === 0;
}
validate58.evaluated = { "items": true, "dynamicProps": false, "dynamicItems": false };
var schema24 = { "enum": ["integration", "compliance", "migration"] };
function validate60(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate60.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data === "integration" || data === "compliance" || data === "migration")) {
    const err0 = { instancePath, schemaPath: "#/enum", keyword: "enum", params: { allowedValues: schema24.enum }, message: "must be equal to one of the allowed values" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate60.errors = vErrors;
  return errors === 0;
}
validate60.evaluated = { "dynamicProps": false, "dynamicItems": false };
var schema25 = { "type": "object", "additionalProperties": false, "properties": { "risk_tier": { "enum": ["high"] }, "gate": { "enum": ["gather_more"] } } };
function validate63(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate63.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    for (const key0 in data) {
      if (!(key0 === "risk_tier" || key0 === "gate")) {
        const err0 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
    if (data.risk_tier !== void 0) {
      if (!(data.risk_tier === "high")) {
        const err1 = { instancePath: instancePath + "/risk_tier", schemaPath: "#/properties/risk_tier/enum", keyword: "enum", params: { allowedValues: schema25.properties.risk_tier.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.gate !== void 0) {
      if (!(data.gate === "gather_more")) {
        const err2 = { instancePath: instancePath + "/gate", schemaPath: "#/properties/gate/enum", keyword: "enum", params: { allowedValues: schema25.properties.gate.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
  } else {
    const err3 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  validate63.errors = vErrors;
  return errors === 0;
}
validate63.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate53(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate53.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.framework_version === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "framework_version" }, message: "must have required property 'framework_version'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.types === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "types" }, message: "must have required property 'types'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.modifiers === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "modifiers" }, message: "must have required property 'modifiers'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.rules === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "rules" }, message: "must have required property 'rules'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "framework_version" || key0 === "types" || key0 === "modifiers" || key0 === "rules")) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.framework_version !== void 0) {
      if (!validate54(data.framework_version, { instancePath: instancePath + "/framework_version", parentData: data, parentDataProperty: "framework_version", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
        errors = vErrors.length;
      }
    }
    if (data.types !== void 0) {
      let data1 = data.types;
      if (data1 && typeof data1 == "object" && !Array.isArray(data1)) {
        if (Object.keys(data1).length < 5) {
          const err5 = { instancePath: instancePath + "/types", schemaPath: "#/properties/types/minProperties", keyword: "minProperties", params: { limit: 5 }, message: "must NOT have fewer than 5 properties" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        for (const key1 in data1) {
          const _errs5 = errors;
          if (!validate56(key1, { instancePath: instancePath + "/types", parentData: data1, parentDataProperty: "types", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
            errors = vErrors.length;
          }
          var valid1 = _errs5 === errors;
          if (!valid1) {
            const err6 = { instancePath: instancePath + "/types", schemaPath: "#/properties/types/propertyNames", keyword: "propertyNames", params: { propertyName: key1 }, message: "property name must be valid" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        for (const key2 in data1) {
          let data2 = data1[key2];
          if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
            if (data2.label === void 0) {
              const err7 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/types/additionalProperties/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err7];
              } else {
                vErrors.push(err7);
              }
              errors++;
            }
            if (data2.signals === void 0) {
              const err8 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/types/additionalProperties/required", keyword: "required", params: { missingProperty: "signals" }, message: "must have required property 'signals'" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
            if (data2.low_confidence_probe === void 0) {
              const err9 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/types/additionalProperties/required", keyword: "required", params: { missingProperty: "low_confidence_probe" }, message: "must have required property 'low_confidence_probe'" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
            if (data2.output === void 0) {
              const err10 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/types/additionalProperties/required", keyword: "required", params: { missingProperty: "output" }, message: "must have required property 'output'" };
              if (vErrors === null) {
                vErrors = [err10];
              } else {
                vErrors.push(err10);
              }
              errors++;
            }
            if (data2.module === void 0) {
              const err11 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/types/additionalProperties/required", keyword: "required", params: { missingProperty: "module" }, message: "must have required property 'module'" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
            for (const key3 in data2) {
              if (!(key3 === "label" || key3 === "signals" || key3 === "low_confidence_probe" || key3 === "output" || key3 === "module")) {
                const err12 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/types/additionalProperties/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
              }
            }
            if (data2.label !== void 0) {
              if (typeof data2.label !== "string") {
                const err13 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/label", schemaPath: "#/properties/types/additionalProperties/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
              }
            }
            if (data2.signals !== void 0) {
              if (!validate58(data2.signals, { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/signals", parentData: data2, parentDataProperty: "signals", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
                errors = vErrors.length;
              }
            }
            if (data2.low_confidence_probe !== void 0) {
              let data5 = data2.low_confidence_probe;
              if (typeof data5 === "string") {
                if (func1(data5) < 1) {
                  const err14 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/low_confidence_probe", schemaPath: "#/properties/types/additionalProperties/properties/low_confidence_probe/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err14];
                  } else {
                    vErrors.push(err14);
                  }
                  errors++;
                }
              } else {
                const err15 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/low_confidence_probe", schemaPath: "#/properties/types/additionalProperties/properties/low_confidence_probe/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
              }
            }
            if (data2.output !== void 0) {
              let data6 = data2.output;
              if (!(data6 === "diagnostic_brief" || data6 === "process_map" || data6 === "feasibility_spec" || data6 === "opportunity_backlog" || data6 === "metric_spec")) {
                const err16 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/output", schemaPath: "#/properties/types/additionalProperties/properties/output/enum", keyword: "enum", params: { allowedValues: schema20.properties.types.additionalProperties.properties.output.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err16];
                } else {
                  vErrors.push(err16);
                }
                errors++;
              }
            }
            if (data2.module !== void 0) {
              if (typeof data2.module !== "string") {
                const err17 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/module", schemaPath: "#/properties/types/additionalProperties/properties/module/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
          } else {
            const err18 = { instancePath: instancePath + "/types/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/types/additionalProperties/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err18];
            } else {
              vErrors.push(err18);
            }
            errors++;
          }
        }
      } else {
        const err19 = { instancePath: instancePath + "/types", schemaPath: "#/properties/types/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
    if (data.modifiers !== void 0) {
      let data8 = data.modifiers;
      if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
        if (Object.keys(data8).length < 3) {
          const err20 = { instancePath: instancePath + "/modifiers", schemaPath: "#/properties/modifiers/minProperties", keyword: "minProperties", params: { limit: 3 }, message: "must NOT have fewer than 3 properties" };
          if (vErrors === null) {
            vErrors = [err20];
          } else {
            vErrors.push(err20);
          }
          errors++;
        }
        for (const key4 in data8) {
          const _errs20 = errors;
          if (!validate60(key4, { instancePath: instancePath + "/modifiers", parentData: data8, parentDataProperty: "modifiers", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate60.errors : vErrors.concat(validate60.errors);
            errors = vErrors.length;
          }
          var valid4 = _errs20 === errors;
          if (!valid4) {
            const err21 = { instancePath: instancePath + "/modifiers", schemaPath: "#/properties/modifiers/propertyNames", keyword: "propertyNames", params: { propertyName: key4 }, message: "property name must be valid" };
            if (vErrors === null) {
              vErrors = [err21];
            } else {
              vErrors.push(err21);
            }
            errors++;
          }
        }
        for (const key5 in data8) {
          let data9 = data8[key5];
          if (data9 && typeof data9 == "object" && !Array.isArray(data9)) {
            if (data9.label === void 0) {
              const err22 = { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/modifiers/additionalProperties/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
            if (data9.signals === void 0) {
              const err23 = { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/modifiers/additionalProperties/required", keyword: "required", params: { missingProperty: "signals" }, message: "must have required property 'signals'" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
            if (data9.module === void 0) {
              const err24 = { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/modifiers/additionalProperties/required", keyword: "required", params: { missingProperty: "module" }, message: "must have required property 'module'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            for (const key6 in data9) {
              if (!(key6 === "label" || key6 === "signals" || key6 === "module" || key6 === "effects")) {
                const err25 = { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/modifiers/additionalProperties/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key6 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err25];
                } else {
                  vErrors.push(err25);
                }
                errors++;
              }
            }
            if (data9.label !== void 0) {
              if (typeof data9.label !== "string") {
                const err26 = { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1") + "/label", schemaPath: "#/properties/modifiers/additionalProperties/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data9.signals !== void 0) {
              if (!validate58(data9.signals, { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1") + "/signals", parentData: data9, parentDataProperty: "signals", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
                errors = vErrors.length;
              }
            }
            if (data9.module !== void 0) {
              if (typeof data9.module !== "string") {
                const err27 = { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1") + "/module", schemaPath: "#/properties/modifiers/additionalProperties/properties/module/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data9.effects !== void 0) {
              if (!validate63(data9.effects, { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1") + "/effects", parentData: data9, parentDataProperty: "effects", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err28 = { instancePath: instancePath + "/modifiers/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/modifiers/additionalProperties/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err28];
            } else {
              vErrors.push(err28);
            }
            errors++;
          }
        }
      } else {
        const err29 = { instancePath: instancePath + "/modifiers", schemaPath: "#/properties/modifiers/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err29];
        } else {
          vErrors.push(err29);
        }
        errors++;
      }
    }
    if (data.rules !== void 0) {
      let data14 = data.rules;
      if (data14 && typeof data14 == "object" && !Array.isArray(data14)) {
        if (data14.reclassify_min_signals === void 0) {
          const err30 = { instancePath: instancePath + "/rules", schemaPath: "#/properties/rules/required", keyword: "required", params: { missingProperty: "reclassify_min_signals" }, message: "must have required property 'reclassify_min_signals'" };
          if (vErrors === null) {
            vErrors = [err30];
          } else {
            vErrors.push(err30);
          }
          errors++;
        }
        if (data14.reclassify_min_signals !== void 0) {
          let data15 = data14.reclassify_min_signals;
          if (!(typeof data15 == "number" && (!(data15 % 1) && !isNaN(data15)) && isFinite(data15))) {
            const err31 = { instancePath: instancePath + "/rules/reclassify_min_signals", schemaPath: "#/properties/rules/properties/reclassify_min_signals/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
          if (typeof data15 == "number" && isFinite(data15)) {
            if (data15 < 1 || isNaN(data15)) {
              const err32 = { instancePath: instancePath + "/rules/reclassify_min_signals", schemaPath: "#/properties/rules/properties/reclassify_min_signals/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
              if (vErrors === null) {
                vErrors = [err32];
              } else {
                vErrors.push(err32);
              }
              errors++;
            }
          }
        }
      } else {
        const err33 = { instancePath: instancePath + "/rules", schemaPath: "#/properties/rules/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err33];
        } else {
          vErrors.push(err33);
        }
        errors++;
      }
    }
  } else {
    const err34 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err34];
    } else {
      vErrors.push(err34);
    }
    errors++;
  }
  validate53.errors = vErrors;
  return errors === 0;
}
validate53.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var module = validate65;
var schema26 = { "type": "object", "additionalProperties": false, "required": ["module", "applies_to", "areas"], "properties": { "module": { "type": "string", "pattern": "^(core|broken|manual_process|known_idea|exploratory|data_report|mod\\.(integration|compliance|migration))$" }, "applies_to": { "enum": ["all", "modifier", "broken", "manual_process", "known_idea", "exploratory", "data_report"] }, "methods": { "type": "array", "items": { "type": "string" } }, "effects": { "$ref": "#/$defs/effects" }, "step_tags": { "type": "array", "items": { "type": "string" } }, "candidates": { "type": "string" }, "adoption_forces": { "type": "array", "items": { "enum": ["push", "pull", "anxiety", "habit"] } }, "spawns_items": { "type": "boolean" }, "asks_core": { "description": "Shared core areas that are always asked for items of this type, though not critical for every type.", "type": "array", "items": { "type": "string", "pattern": "^core\\.[a-z_]+$" } }, "self_serve_rule": { "type": "string" }, "areas": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["id", "must_capture", "probes", "critical", "followup_conditions", "feeds"], "properties": { "id": { "type": "string" }, "must_capture": { "type": "string", "minLength": 1 }, "probes": { "$ref": "#/$defs/phrases" }, "always_ask": { "type": "boolean" }, "critical": { "type": "boolean" }, "stop_at": { "type": "string" }, "followup_conditions": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["when", "ask"], "properties": { "when": { "type": "string", "minLength": 1 }, "ask": { "type": "string", "minLength": 1 }, "spawns": { "enum": ["item", "broken", "manual_process", "known_idea", "exploratory", "data_report"] } } } }, "feeds": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["file", "section"], "properties": { "file": { "type": "string", "pattern": "^[A-Z_]+\\.md$" }, "section": { "type": "string", "pattern": "^[a-z_]+$" } } } }, "guardrail": { "enum": ["traceability", "eval_gate", "kill_criteria", "flagged_paths", "open_assumptions"] } } } } } };
var func3 = Object.prototype.hasOwnProperty;
var pattern4 = new RegExp("^(core|broken|manual_process|known_idea|exploratory|data_report|mod\\.(integration|compliance|migration))$", "u");
var pattern5 = new RegExp("^core\\.[a-z_]+$", "u");
var pattern6 = new RegExp("^[A-Z_]+\\.md$", "u");
var pattern7 = new RegExp("^[a-z_]+$", "u");
function validate65(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate65.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.module === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "module" }, message: "must have required property 'module'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.applies_to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "applies_to" }, message: "must have required property 'applies_to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.areas === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "areas" }, message: "must have required property 'areas'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func3.call(schema26.properties, key0)) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.module !== void 0) {
      let data0 = data.module;
      if (typeof data0 === "string") {
        if (!pattern4.test(data0)) {
          const err4 = { instancePath: instancePath + "/module", schemaPath: "#/properties/module/pattern", keyword: "pattern", params: { pattern: "^(core|broken|manual_process|known_idea|exploratory|data_report|mod\\.(integration|compliance|migration))$" }, message: 'must match pattern "^(core|broken|manual_process|known_idea|exploratory|data_report|mod\\.(integration|compliance|migration))$"' };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = { instancePath: instancePath + "/module", schemaPath: "#/properties/module/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.applies_to !== void 0) {
      let data1 = data.applies_to;
      if (!(data1 === "all" || data1 === "modifier" || data1 === "broken" || data1 === "manual_process" || data1 === "known_idea" || data1 === "exploratory" || data1 === "data_report")) {
        const err6 = { instancePath: instancePath + "/applies_to", schemaPath: "#/properties/applies_to/enum", keyword: "enum", params: { allowedValues: schema26.properties.applies_to.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.methods !== void 0) {
      let data2 = data.methods;
      if (Array.isArray(data2)) {
        const len0 = data2.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data2[i0] !== "string") {
            const err7 = { instancePath: instancePath + "/methods/" + i0, schemaPath: "#/properties/methods/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
      } else {
        const err8 = { instancePath: instancePath + "/methods", schemaPath: "#/properties/methods/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.effects !== void 0) {
      if (!validate63(data.effects, { instancePath: instancePath + "/effects", parentData: data, parentDataProperty: "effects", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
        errors = vErrors.length;
      }
    }
    if (data.step_tags !== void 0) {
      let data5 = data.step_tags;
      if (Array.isArray(data5)) {
        const len1 = data5.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (typeof data5[i1] !== "string") {
            const err9 = { instancePath: instancePath + "/step_tags/" + i1, schemaPath: "#/properties/step_tags/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/step_tags", schemaPath: "#/properties/step_tags/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.candidates !== void 0) {
      if (typeof data.candidates !== "string") {
        const err11 = { instancePath: instancePath + "/candidates", schemaPath: "#/properties/candidates/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.adoption_forces !== void 0) {
      let data8 = data.adoption_forces;
      if (Array.isArray(data8)) {
        const len2 = data8.length;
        for (let i2 = 0; i2 < len2; i2++) {
          let data9 = data8[i2];
          if (!(data9 === "push" || data9 === "pull" || data9 === "anxiety" || data9 === "habit")) {
            const err12 = { instancePath: instancePath + "/adoption_forces/" + i2, schemaPath: "#/properties/adoption_forces/items/enum", keyword: "enum", params: { allowedValues: schema26.properties.adoption_forces.items.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/adoption_forces", schemaPath: "#/properties/adoption_forces/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.spawns_items !== void 0) {
      if (typeof data.spawns_items !== "boolean") {
        const err14 = { instancePath: instancePath + "/spawns_items", schemaPath: "#/properties/spawns_items/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.asks_core !== void 0) {
      let data11 = data.asks_core;
      if (Array.isArray(data11)) {
        const len3 = data11.length;
        for (let i3 = 0; i3 < len3; i3++) {
          let data12 = data11[i3];
          if (typeof data12 === "string") {
            if (!pattern5.test(data12)) {
              const err15 = { instancePath: instancePath + "/asks_core/" + i3, schemaPath: "#/properties/asks_core/items/pattern", keyword: "pattern", params: { pattern: "^core\\.[a-z_]+$" }, message: 'must match pattern "^core\\.[a-z_]+$"' };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
          } else {
            const err16 = { instancePath: instancePath + "/asks_core/" + i3, schemaPath: "#/properties/asks_core/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
      } else {
        const err17 = { instancePath: instancePath + "/asks_core", schemaPath: "#/properties/asks_core/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.self_serve_rule !== void 0) {
      if (typeof data.self_serve_rule !== "string") {
        const err18 = { instancePath: instancePath + "/self_serve_rule", schemaPath: "#/properties/self_serve_rule/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.areas !== void 0) {
      let data14 = data.areas;
      if (Array.isArray(data14)) {
        if (data14.length < 1) {
          const err19 = { instancePath: instancePath + "/areas", schemaPath: "#/properties/areas/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err19];
          } else {
            vErrors.push(err19);
          }
          errors++;
        }
        const len4 = data14.length;
        for (let i4 = 0; i4 < len4; i4++) {
          let data15 = data14[i4];
          if (data15 && typeof data15 == "object" && !Array.isArray(data15)) {
            if (data15.id === void 0) {
              const err20 = { instancePath: instancePath + "/areas/" + i4, schemaPath: "#/properties/areas/items/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err20];
              } else {
                vErrors.push(err20);
              }
              errors++;
            }
            if (data15.must_capture === void 0) {
              const err21 = { instancePath: instancePath + "/areas/" + i4, schemaPath: "#/properties/areas/items/required", keyword: "required", params: { missingProperty: "must_capture" }, message: "must have required property 'must_capture'" };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
            if (data15.probes === void 0) {
              const err22 = { instancePath: instancePath + "/areas/" + i4, schemaPath: "#/properties/areas/items/required", keyword: "required", params: { missingProperty: "probes" }, message: "must have required property 'probes'" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
            if (data15.critical === void 0) {
              const err23 = { instancePath: instancePath + "/areas/" + i4, schemaPath: "#/properties/areas/items/required", keyword: "required", params: { missingProperty: "critical" }, message: "must have required property 'critical'" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
            if (data15.followup_conditions === void 0) {
              const err24 = { instancePath: instancePath + "/areas/" + i4, schemaPath: "#/properties/areas/items/required", keyword: "required", params: { missingProperty: "followup_conditions" }, message: "must have required property 'followup_conditions'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (data15.feeds === void 0) {
              const err25 = { instancePath: instancePath + "/areas/" + i4, schemaPath: "#/properties/areas/items/required", keyword: "required", params: { missingProperty: "feeds" }, message: "must have required property 'feeds'" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            for (const key1 in data15) {
              if (!func3.call(schema26.properties.areas.items.properties, key1)) {
                const err26 = { instancePath: instancePath + "/areas/" + i4, schemaPath: "#/properties/areas/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data15.id !== void 0) {
              if (typeof data15.id !== "string") {
                const err27 = { instancePath: instancePath + "/areas/" + i4 + "/id", schemaPath: "#/properties/areas/items/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data15.must_capture !== void 0) {
              let data17 = data15.must_capture;
              if (typeof data17 === "string") {
                if (func1(data17) < 1) {
                  const err28 = { instancePath: instancePath + "/areas/" + i4 + "/must_capture", schemaPath: "#/properties/areas/items/properties/must_capture/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err28];
                  } else {
                    vErrors.push(err28);
                  }
                  errors++;
                }
              } else {
                const err29 = { instancePath: instancePath + "/areas/" + i4 + "/must_capture", schemaPath: "#/properties/areas/items/properties/must_capture/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
            if (data15.probes !== void 0) {
              if (!validate58(data15.probes, { instancePath: instancePath + "/areas/" + i4 + "/probes", parentData: data15, parentDataProperty: "probes", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
                errors = vErrors.length;
              }
            }
            if (data15.always_ask !== void 0) {
              if (typeof data15.always_ask !== "boolean") {
                const err30 = { instancePath: instancePath + "/areas/" + i4 + "/always_ask", schemaPath: "#/properties/areas/items/properties/always_ask/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
            if (data15.critical !== void 0) {
              if (typeof data15.critical !== "boolean") {
                const err31 = { instancePath: instancePath + "/areas/" + i4 + "/critical", schemaPath: "#/properties/areas/items/properties/critical/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
              }
            }
            if (data15.stop_at !== void 0) {
              if (typeof data15.stop_at !== "string") {
                const err32 = { instancePath: instancePath + "/areas/" + i4 + "/stop_at", schemaPath: "#/properties/areas/items/properties/stop_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err32];
                } else {
                  vErrors.push(err32);
                }
                errors++;
              }
            }
            if (data15.followup_conditions !== void 0) {
              let data22 = data15.followup_conditions;
              if (Array.isArray(data22)) {
                const len5 = data22.length;
                for (let i5 = 0; i5 < len5; i5++) {
                  let data23 = data22[i5];
                  if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                    if (data23.when === void 0) {
                      const err33 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5, schemaPath: "#/properties/areas/items/properties/followup_conditions/items/required", keyword: "required", params: { missingProperty: "when" }, message: "must have required property 'when'" };
                      if (vErrors === null) {
                        vErrors = [err33];
                      } else {
                        vErrors.push(err33);
                      }
                      errors++;
                    }
                    if (data23.ask === void 0) {
                      const err34 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5, schemaPath: "#/properties/areas/items/properties/followup_conditions/items/required", keyword: "required", params: { missingProperty: "ask" }, message: "must have required property 'ask'" };
                      if (vErrors === null) {
                        vErrors = [err34];
                      } else {
                        vErrors.push(err34);
                      }
                      errors++;
                    }
                    for (const key2 in data23) {
                      if (!(key2 === "when" || key2 === "ask" || key2 === "spawns")) {
                        const err35 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5, schemaPath: "#/properties/areas/items/properties/followup_conditions/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                        if (vErrors === null) {
                          vErrors = [err35];
                        } else {
                          vErrors.push(err35);
                        }
                        errors++;
                      }
                    }
                    if (data23.when !== void 0) {
                      let data24 = data23.when;
                      if (typeof data24 === "string") {
                        if (func1(data24) < 1) {
                          const err36 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5 + "/when", schemaPath: "#/properties/areas/items/properties/followup_conditions/items/properties/when/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                          if (vErrors === null) {
                            vErrors = [err36];
                          } else {
                            vErrors.push(err36);
                          }
                          errors++;
                        }
                      } else {
                        const err37 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5 + "/when", schemaPath: "#/properties/areas/items/properties/followup_conditions/items/properties/when/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err37];
                        } else {
                          vErrors.push(err37);
                        }
                        errors++;
                      }
                    }
                    if (data23.ask !== void 0) {
                      let data25 = data23.ask;
                      if (typeof data25 === "string") {
                        if (func1(data25) < 1) {
                          const err38 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5 + "/ask", schemaPath: "#/properties/areas/items/properties/followup_conditions/items/properties/ask/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                          if (vErrors === null) {
                            vErrors = [err38];
                          } else {
                            vErrors.push(err38);
                          }
                          errors++;
                        }
                      } else {
                        const err39 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5 + "/ask", schemaPath: "#/properties/areas/items/properties/followup_conditions/items/properties/ask/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err39];
                        } else {
                          vErrors.push(err39);
                        }
                        errors++;
                      }
                    }
                    if (data23.spawns !== void 0) {
                      let data26 = data23.spawns;
                      if (!(data26 === "item" || data26 === "broken" || data26 === "manual_process" || data26 === "known_idea" || data26 === "exploratory" || data26 === "data_report")) {
                        const err40 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5 + "/spawns", schemaPath: "#/properties/areas/items/properties/followup_conditions/items/properties/spawns/enum", keyword: "enum", params: { allowedValues: schema26.properties.areas.items.properties.followup_conditions.items.properties.spawns.enum }, message: "must be equal to one of the allowed values" };
                        if (vErrors === null) {
                          vErrors = [err40];
                        } else {
                          vErrors.push(err40);
                        }
                        errors++;
                      }
                    }
                  } else {
                    const err41 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions/" + i5, schemaPath: "#/properties/areas/items/properties/followup_conditions/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                    if (vErrors === null) {
                      vErrors = [err41];
                    } else {
                      vErrors.push(err41);
                    }
                    errors++;
                  }
                }
              } else {
                const err42 = { instancePath: instancePath + "/areas/" + i4 + "/followup_conditions", schemaPath: "#/properties/areas/items/properties/followup_conditions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err42];
                } else {
                  vErrors.push(err42);
                }
                errors++;
              }
            }
            if (data15.feeds !== void 0) {
              let data27 = data15.feeds;
              if (Array.isArray(data27)) {
                if (data27.length < 1) {
                  const err43 = { instancePath: instancePath + "/areas/" + i4 + "/feeds", schemaPath: "#/properties/areas/items/properties/feeds/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
                  if (vErrors === null) {
                    vErrors = [err43];
                  } else {
                    vErrors.push(err43);
                  }
                  errors++;
                }
                const len6 = data27.length;
                for (let i6 = 0; i6 < len6; i6++) {
                  let data28 = data27[i6];
                  if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
                    if (data28.file === void 0) {
                      const err44 = { instancePath: instancePath + "/areas/" + i4 + "/feeds/" + i6, schemaPath: "#/properties/areas/items/properties/feeds/items/required", keyword: "required", params: { missingProperty: "file" }, message: "must have required property 'file'" };
                      if (vErrors === null) {
                        vErrors = [err44];
                      } else {
                        vErrors.push(err44);
                      }
                      errors++;
                    }
                    if (data28.section === void 0) {
                      const err45 = { instancePath: instancePath + "/areas/" + i4 + "/feeds/" + i6, schemaPath: "#/properties/areas/items/properties/feeds/items/required", keyword: "required", params: { missingProperty: "section" }, message: "must have required property 'section'" };
                      if (vErrors === null) {
                        vErrors = [err45];
                      } else {
                        vErrors.push(err45);
                      }
                      errors++;
                    }
                    for (const key3 in data28) {
                      if (!(key3 === "file" || key3 === "section")) {
                        const err46 = { instancePath: instancePath + "/areas/" + i4 + "/feeds/" + i6, schemaPath: "#/properties/areas/items/properties/feeds/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                        if (vErrors === null) {
                          vErrors = [err46];
                        } else {
                          vErrors.push(err46);
                        }
                        errors++;
                      }
                    }
                    if (data28.file !== void 0) {
                      let data29 = data28.file;
                      if (typeof data29 === "string") {
                        if (!pattern6.test(data29)) {
                          const err47 = { instancePath: instancePath + "/areas/" + i4 + "/feeds/" + i6 + "/file", schemaPath: "#/properties/areas/items/properties/feeds/items/properties/file/pattern", keyword: "pattern", params: { pattern: "^[A-Z_]+\\.md$" }, message: 'must match pattern "^[A-Z_]+\\.md$"' };
                          if (vErrors === null) {
                            vErrors = [err47];
                          } else {
                            vErrors.push(err47);
                          }
                          errors++;
                        }
                      } else {
                        const err48 = { instancePath: instancePath + "/areas/" + i4 + "/feeds/" + i6 + "/file", schemaPath: "#/properties/areas/items/properties/feeds/items/properties/file/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err48];
                        } else {
                          vErrors.push(err48);
                        }
                        errors++;
                      }
                    }
                    if (data28.section !== void 0) {
                      let data30 = data28.section;
                      if (typeof data30 === "string") {
                        if (!pattern7.test(data30)) {
                          const err49 = { instancePath: instancePath + "/areas/" + i4 + "/feeds/" + i6 + "/section", schemaPath: "#/properties/areas/items/properties/feeds/items/properties/section/pattern", keyword: "pattern", params: { pattern: "^[a-z_]+$" }, message: 'must match pattern "^[a-z_]+$"' };
                          if (vErrors === null) {
                            vErrors = [err49];
                          } else {
                            vErrors.push(err49);
                          }
                          errors++;
                        }
                      } else {
                        const err50 = { instancePath: instancePath + "/areas/" + i4 + "/feeds/" + i6 + "/section", schemaPath: "#/properties/areas/items/properties/feeds/items/properties/section/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err50];
                        } else {
                          vErrors.push(err50);
                        }
                        errors++;
                      }
                    }
                  } else {
                    const err51 = { instancePath: instancePath + "/areas/" + i4 + "/feeds/" + i6, schemaPath: "#/properties/areas/items/properties/feeds/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                    if (vErrors === null) {
                      vErrors = [err51];
                    } else {
                      vErrors.push(err51);
                    }
                    errors++;
                  }
                }
              } else {
                const err52 = { instancePath: instancePath + "/areas/" + i4 + "/feeds", schemaPath: "#/properties/areas/items/properties/feeds/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err52];
                } else {
                  vErrors.push(err52);
                }
                errors++;
              }
            }
            if (data15.guardrail !== void 0) {
              let data31 = data15.guardrail;
              if (!(data31 === "traceability" || data31 === "eval_gate" || data31 === "kill_criteria" || data31 === "flagged_paths" || data31 === "open_assumptions")) {
                const err53 = { instancePath: instancePath + "/areas/" + i4 + "/guardrail", schemaPath: "#/properties/areas/items/properties/guardrail/enum", keyword: "enum", params: { allowedValues: schema26.properties.areas.items.properties.guardrail.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err53];
                } else {
                  vErrors.push(err53);
                }
                errors++;
              }
            }
          } else {
            const err54 = { instancePath: instancePath + "/areas/" + i4, schemaPath: "#/properties/areas/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err54];
            } else {
              vErrors.push(err54);
            }
            errors++;
          }
        }
      } else {
        const err55 = { instancePath: instancePath + "/areas", schemaPath: "#/properties/areas/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err55];
        } else {
          vErrors.push(err55);
        }
        errors++;
      }
    }
  } else {
    const err56 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err56];
    } else {
      vErrors.push(err56);
    }
    errors++;
  }
  validate65.errors = vErrors;
  return errors === 0;
}
validate65.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var scoring = validate68;
var schema27 = { "type": "object", "additionalProperties": false, "required": ["rules_version", "min_known_per_composite", "criteria", "composites", "thresholds", "quadrants", "ai_overlay", "adoption", "gate_facts", "gates"], "properties": { "rules_version": { "$ref": "#/$defs/semver" }, "min_known_per_composite": { "type": "integer", "minimum": 1 }, "criteria": { "type": "object", "additionalProperties": { "type": "object", "additionalProperties": false, "required": ["label", "bands", "describe", "usually_from"], "properties": { "label": { "type": "string" }, "bands": { "$ref": "#/$defs/band_scores" }, "describe": { "type": "object", "additionalProperties": { "type": "string" } }, "usually_from": { "type": "array", "minItems": 1, "items": { "type": "string" }, "description": "Coverage areas whose answers usually decide this band, shown in the guide." } } } }, "composites": { "type": "object", "additionalProperties": false, "required": ["automation_potential", "ease"], "properties": { "automation_potential": { "type": "object", "additionalProperties": false, "required": ["criteria"], "properties": { "criteria": { "$ref": "#/$defs/weights" } } }, "ease": { "type": "object", "additionalProperties": false, "required": ["criteria"], "properties": { "criteria": { "$ref": "#/$defs/weights" } } } } }, "thresholds": { "type": "object", "additionalProperties": false, "required": ["high_min_pct", "low_below_pct"], "properties": { "high_min_pct": { "type": "number", "exclusiveMinimum": 0, "maximum": 1 }, "low_below_pct": { "type": "number", "minimum": 0, "exclusiveMaximum": 1 } } }, "quadrants": { "type": "object", "additionalProperties": false, "required": ["prioritize", "review", "defer"], "properties": { "prioritize": { "type": "string" }, "review": { "type": "string" }, "defer": { "type": "string" } } }, "ai_overlay": { "type": "object", "additionalProperties": false, "required": ["applies_fact", "applies_bands", "checks", "check_bands", "dont_build_on_fail"], "properties": { "applies_fact": { "const": "ai_applies" }, "applies_bands": { "type": "object", "required": ["unknown"], "properties": { "unknown": { "const": false } }, "additionalProperties": { "type": "boolean" } }, "checks": { "type": "object", "additionalProperties": { "type": "object", "additionalProperties": false, "required": ["label", "passes_when", "basis"], "properties": { "label": { "type": "string" }, "passes_when": { "type": "string" }, "basis": { "type": "string" } } } }, "check_bands": { "const": ["pass", "fail", "unknown"] }, "dont_build_on_fail": { "type": "array", "items": { "type": "string" } } } }, "adoption": { "type": "object", "additionalProperties": false, "required": ["applies_to", "forces", "bands", "risk_when"], "properties": { "applies_to": { "type": "array", "items": { "$ref": "#/$defs/item_type" } }, "forces": { "const": ["push", "pull", "anxiety", "habit"] }, "bands": { "$ref": "#/$defs/band_list" }, "risk_when": { "type": "object", "additionalProperties": { "type": "array", "items": { "type": "string" } } }, "usually_from": { "description": "Per force, the areas its band is usually picked from. Shown in the guide.", "type": "object", "additionalProperties": { "type": "array", "items": { "type": "string" } } } } }, "gate_facts": { "type": "object", "additionalProperties": { "$ref": "#/$defs/band_list" } }, "gate_fact_notes": { "type": "object", "description": "How to pick a gate fact when its band names don't say enough. Shown in the guide.", "additionalProperties": { "type": "string", "minLength": 1 } }, "gates": { "type": "object", "additionalProperties": false, "required": ["go_requires_core", "precedence", "fix_not_build", "dont_build_definitive", "gather_more", "dont_build_quadrant", "go", "fallthrough"], "properties": { "go_requires_core": { "type": "array", "minItems": 1, "items": { "type": "string", "pattern": "^core\\.[a-z_]+$" } }, "precedence": { "const": ["fix_not_build", "dont_build_definitive", "gather_more", "dont_build_quadrant", "go"], "description": "Fixed for v1. The order is part of the gate logic; reordering it is a code change, not a tuning change." }, "fix_not_build": { "type": "object", "additionalProperties": false, "required": ["applies_to", "when_cause", "when_workaround_permanent"], "properties": { "applies_to": { "type": "array", "items": { "$ref": "#/$defs/item_type" } }, "when_cause": { "type": "array", "items": { "type": "string" } }, "when_workaround_permanent": { "type": "array", "items": { "type": "string" } } } }, "dont_build_definitive": { "type": "object", "additionalProperties": false, "required": ["existing_asset", "decision_depends", "decision_depends_applies_to", "value", "superseded_by_go_item"], "properties": { "existing_asset": { "type": "array", "items": { "type": "string" } }, "decision_depends": { "type": "array", "items": { "type": "string" } }, "decision_depends_applies_to": { "description": "Item types where no decision depending on it is a definitive Don't build. For other types it routes to Gather more.", "type": "array", "items": { "$ref": "#/$defs/item_type" } }, "value": { "type": "array", "items": { "type": "string" } }, "superseded_by_go_item": { "type": "boolean" } } }, "gather_more": { "type": "object", "additionalProperties": false, "required": ["critical_unknown", "stability", "review_without_mitigation", "modifiers", "defer_with_critical_unknown", "composite_null", "ai_overlay_unresolved"], "properties": { "critical_unknown": { "type": "boolean" }, "stability": { "type": "array", "items": { "type": "string" } }, "review_without_mitigation": { "type": "boolean" }, "modifiers": { "type": "array", "items": { "$ref": "#/$defs/modifier" } }, "defer_with_critical_unknown": { "type": "boolean" }, "composite_null": { "type": "boolean" }, "ai_overlay_unresolved": { "type": "boolean" }, "decision_depends": { "description": "decision_depends bands that route to Gather more when they aren't a definitive Don't build for the item's type. Missing information is never a reason not to build.", "type": "array", "items": { "type": "string" } } } }, "dont_build_quadrant": { "type": "object", "additionalProperties": false, "required": ["quadrant", "defer_rescued_by_ai_overlay", "ai_overlay_fail"], "properties": { "quadrant": { "type": "array", "items": { "enum": ["prioritize", "review", "defer"] } }, "defer_rescued_by_ai_overlay": { "type": "boolean" }, "ai_overlay_fail": { "type": "boolean" } } }, "go": { "type": "object", "additionalProperties": false, "required": ["success_metric", "quadrants", "review_needs_mitigation", "ai_candidate_from_defer", "ai_overlay_must_pass", "reflect_back_confirmed"], "properties": { "success_metric": { "type": "array", "items": { "type": "string" } }, "quadrants": { "type": "array", "items": { "enum": ["prioritize", "review", "defer"] } }, "review_needs_mitigation": { "type": "boolean" }, "ai_candidate_from_defer": { "type": "boolean" }, "ai_overlay_must_pass": { "type": "boolean" }, "reflect_back_confirmed": { "type": "boolean" } } }, "fallthrough": { "const": "gather_more" } } } } };
var func0 = equal.default;
var pattern8 = new RegExp("^[a-z0-9][a-z0-9_+-]*$", "u");
function validate70(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate70.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (Object.keys(data).length < 2) {
      const err0 = { instancePath, schemaPath: "#/minProperties", keyword: "minProperties", params: { limit: 2 }, message: "must NOT have fewer than 2 properties" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.unknown === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "unknown" }, message: "must have required property 'unknown'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      const _errs1 = errors;
      if (typeof key0 === "string") {
        if (!pattern8.test(key0)) {
          const err2 = { instancePath, schemaPath: "#/propertyNames/pattern", keyword: "pattern", params: { pattern: "^[a-z0-9][a-z0-9_+-]*$" }, message: 'must match pattern "^[a-z0-9][a-z0-9_+-]*$"', propertyName: key0 };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      }
      var valid0 = _errs1 === errors;
      if (!valid0) {
        const err3 = { instancePath, schemaPath: "#/propertyNames", keyword: "propertyNames", params: { propertyName: key0 }, message: "property name must be valid" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    for (const key1 in data) {
      if (!(key1 === "unknown")) {
        let data0 = data[key1];
        const _errs4 = errors;
        let valid2 = false;
        let passing0 = null;
        const _errs5 = errors;
        if (!(typeof data0 == "number" && (!(data0 % 1) && !isNaN(data0)) && isFinite(data0))) {
          const err4 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/oneOf/0/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (typeof data0 == "number" && isFinite(data0)) {
          if (data0 > 5 || isNaN(data0)) {
            const err5 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/oneOf/0/maximum", keyword: "maximum", params: { comparison: "<=", limit: 5 }, message: "must be <= 5" };
            if (vErrors === null) {
              vErrors = [err5];
            } else {
              vErrors.push(err5);
            }
            errors++;
          }
          if (data0 < 1 || isNaN(data0)) {
            const err6 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/oneOf/0/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        var _valid0 = _errs5 === errors;
        if (_valid0) {
          valid2 = true;
          passing0 = 0;
        }
        const _errs7 = errors;
        if (data0 !== null) {
          const err7 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/oneOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        var _valid0 = _errs7 === errors;
        if (_valid0 && valid2) {
          valid2 = false;
          passing0 = [passing0, 1];
        } else {
          if (_valid0) {
            valid2 = true;
            passing0 = 1;
          }
        }
        if (!valid2) {
          const err8 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        } else {
          errors = _errs4;
          if (vErrors !== null) {
            if (_errs4) {
              vErrors.length = _errs4;
            } else {
              vErrors = null;
            }
          }
        }
      }
    }
    if (data.unknown !== void 0) {
      if (data.unknown !== null) {
        const err9 = { instancePath: instancePath + "/unknown", schemaPath: "#/properties/unknown/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
  } else {
    const err10 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate70.errors = vErrors;
  return errors === 0;
}
validate70.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate72(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate72.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (Object.keys(data).length < 1) {
      const err0 = { instancePath, schemaPath: "#/minProperties", keyword: "minProperties", params: { limit: 1 }, message: "must NOT have fewer than 1 properties" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    for (const key0 in data) {
      let data0 = data[key0];
      if (typeof data0 == "number" && isFinite(data0)) {
        if (data0 <= 0 || isNaN(data0)) {
          const err1 = { instancePath: instancePath + "/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      } else {
        const err2 = { instancePath: instancePath + "/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
  } else {
    const err3 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  validate72.errors = vErrors;
  return errors === 0;
}
validate72.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
function validate76(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate76.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (Array.isArray(data)) {
    if (data.length < 2) {
      const err0 = { instancePath, schemaPath: "#/minItems", keyword: "minItems", params: { limit: 2 }, message: "must NOT have fewer than 2 items" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    const len0 = data.length;
    for (let i0 = 0; i0 < len0; i0++) {
      let data0 = data[i0];
      if (typeof data0 === "string") {
        if (!pattern8.test(data0)) {
          const err1 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/pattern", keyword: "pattern", params: { pattern: "^[a-z0-9][a-z0-9_+-]*$" }, message: 'must match pattern "^[a-z0-9][a-z0-9_+-]*$"' };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      } else {
        const err2 = { instancePath: instancePath + "/" + i0, schemaPath: "#/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    const _errs3 = errors;
    const len1 = data.length;
    for (let i1 = 0; i1 < len1; i1++) {
      const _errs4 = errors;
      if ("unknown" !== data[i1]) {
        const err3 = { instancePath: instancePath + "/" + i1, schemaPath: "#/contains/const", keyword: "const", params: { allowedValue: "unknown" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      var valid2 = _errs4 === errors;
      if (valid2) {
        break;
      }
    }
    if (!valid2) {
      const err4 = { instancePath, schemaPath: "#/contains", keyword: "contains", params: { minContains: 1 }, message: "must contain at least 1 valid item(s)" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    } else {
      errors = _errs3;
      if (vErrors !== null) {
        if (_errs3) {
          vErrors.length = _errs3;
        } else {
          vErrors = null;
        }
      }
    }
    let i2 = data.length;
    let j0;
    if (i2 > 1) {
      const indices0 = {};
      for (; i2--; ) {
        let item0 = data[i2];
        if (typeof item0 !== "string") {
          continue;
        }
        if (typeof indices0[item0] == "number") {
          j0 = indices0[item0];
          const err5 = { instancePath, schemaPath: "#/uniqueItems", keyword: "uniqueItems", params: { i: i2, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i2 + " are identical)" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
          break;
        }
        indices0[item0] = i2;
      }
    }
  } else {
    const err6 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" };
    if (vErrors === null) {
      vErrors = [err6];
    } else {
      vErrors.push(err6);
    }
    errors++;
  }
  validate76.errors = vErrors;
  return errors === 0;
}
validate76.evaluated = { "items": true, "dynamicProps": false, "dynamicItems": false };
function validate68(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate68.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.rules_version === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "rules_version" }, message: "must have required property 'rules_version'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.min_known_per_composite === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "min_known_per_composite" }, message: "must have required property 'min_known_per_composite'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.criteria === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "criteria" }, message: "must have required property 'criteria'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.composites === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "composites" }, message: "must have required property 'composites'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.thresholds === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "thresholds" }, message: "must have required property 'thresholds'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.quadrants === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quadrants" }, message: "must have required property 'quadrants'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.ai_overlay === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "ai_overlay" }, message: "must have required property 'ai_overlay'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.adoption === void 0) {
      const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "adoption" }, message: "must have required property 'adoption'" };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data.gate_facts === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "gate_facts" }, message: "must have required property 'gate_facts'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.gates === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "gates" }, message: "must have required property 'gates'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func3.call(schema27.properties, key0)) {
        const err10 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.rules_version !== void 0) {
      if (!validate54(data.rules_version, { instancePath: instancePath + "/rules_version", parentData: data, parentDataProperty: "rules_version", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
        errors = vErrors.length;
      }
    }
    if (data.min_known_per_composite !== void 0) {
      let data1 = data.min_known_per_composite;
      if (!(typeof data1 == "number" && (!(data1 % 1) && !isNaN(data1)) && isFinite(data1))) {
        const err11 = { instancePath: instancePath + "/min_known_per_composite", schemaPath: "#/properties/min_known_per_composite/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
      if (typeof data1 == "number" && isFinite(data1)) {
        if (data1 < 1 || isNaN(data1)) {
          const err12 = { instancePath: instancePath + "/min_known_per_composite", schemaPath: "#/properties/min_known_per_composite/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
      }
    }
    if (data.criteria !== void 0) {
      let data2 = data.criteria;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        for (const key1 in data2) {
          let data3 = data2[key1];
          if (data3 && typeof data3 == "object" && !Array.isArray(data3)) {
            if (data3.label === void 0) {
              const err13 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
            if (data3.bands === void 0) {
              const err14 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/required", keyword: "required", params: { missingProperty: "bands" }, message: "must have required property 'bands'" };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
            if (data3.describe === void 0) {
              const err15 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/required", keyword: "required", params: { missingProperty: "describe" }, message: "must have required property 'describe'" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
            if (data3.usually_from === void 0) {
              const err16 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/required", keyword: "required", params: { missingProperty: "usually_from" }, message: "must have required property 'usually_from'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key2 in data3) {
              if (!(key2 === "label" || key2 === "bands" || key2 === "describe" || key2 === "usually_from")) {
                const err17 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data3.label !== void 0) {
              if (typeof data3.label !== "string") {
                const err18 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/label", schemaPath: "#/properties/criteria/additionalProperties/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data3.bands !== void 0) {
              if (!validate70(data3.bands, { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/bands", parentData: data3, parentDataProperty: "bands", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate70.errors : vErrors.concat(validate70.errors);
                errors = vErrors.length;
              }
            }
            if (data3.describe !== void 0) {
              let data6 = data3.describe;
              if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
                for (const key3 in data6) {
                  if (typeof data6[key3] !== "string") {
                    const err19 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/describe/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/properties/describe/additionalProperties/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err19];
                    } else {
                      vErrors.push(err19);
                    }
                    errors++;
                  }
                }
              } else {
                const err20 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/describe", schemaPath: "#/properties/criteria/additionalProperties/properties/describe/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
            if (data3.usually_from !== void 0) {
              let data8 = data3.usually_from;
              if (Array.isArray(data8)) {
                if (data8.length < 1) {
                  const err21 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/usually_from", schemaPath: "#/properties/criteria/additionalProperties/properties/usually_from/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
                  if (vErrors === null) {
                    vErrors = [err21];
                  } else {
                    vErrors.push(err21);
                  }
                  errors++;
                }
                const len0 = data8.length;
                for (let i0 = 0; i0 < len0; i0++) {
                  if (typeof data8[i0] !== "string") {
                    const err22 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/usually_from/" + i0, schemaPath: "#/properties/criteria/additionalProperties/properties/usually_from/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err22];
                    } else {
                      vErrors.push(err22);
                    }
                    errors++;
                  }
                }
              } else {
                const err23 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/usually_from", schemaPath: "#/properties/criteria/additionalProperties/properties/usually_from/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
            }
          } else {
            const err24 = { instancePath: instancePath + "/criteria/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err24];
            } else {
              vErrors.push(err24);
            }
            errors++;
          }
        }
      } else {
        const err25 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
    if (data.composites !== void 0) {
      let data10 = data.composites;
      if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
        if (data10.automation_potential === void 0) {
          const err26 = { instancePath: instancePath + "/composites", schemaPath: "#/properties/composites/required", keyword: "required", params: { missingProperty: "automation_potential" }, message: "must have required property 'automation_potential'" };
          if (vErrors === null) {
            vErrors = [err26];
          } else {
            vErrors.push(err26);
          }
          errors++;
        }
        if (data10.ease === void 0) {
          const err27 = { instancePath: instancePath + "/composites", schemaPath: "#/properties/composites/required", keyword: "required", params: { missingProperty: "ease" }, message: "must have required property 'ease'" };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
        for (const key4 in data10) {
          if (!(key4 === "automation_potential" || key4 === "ease")) {
            const err28 = { instancePath: instancePath + "/composites", schemaPath: "#/properties/composites/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key4 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err28];
            } else {
              vErrors.push(err28);
            }
            errors++;
          }
        }
        if (data10.automation_potential !== void 0) {
          let data11 = data10.automation_potential;
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            if (data11.criteria === void 0) {
              const err29 = { instancePath: instancePath + "/composites/automation_potential", schemaPath: "#/properties/composites/properties/automation_potential/required", keyword: "required", params: { missingProperty: "criteria" }, message: "must have required property 'criteria'" };
              if (vErrors === null) {
                vErrors = [err29];
              } else {
                vErrors.push(err29);
              }
              errors++;
            }
            for (const key5 in data11) {
              if (!(key5 === "criteria")) {
                const err30 = { instancePath: instancePath + "/composites/automation_potential", schemaPath: "#/properties/composites/properties/automation_potential/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key5 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
            if (data11.criteria !== void 0) {
              if (!validate72(data11.criteria, { instancePath: instancePath + "/composites/automation_potential/criteria", parentData: data11, parentDataProperty: "criteria", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate72.errors : vErrors.concat(validate72.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err31 = { instancePath: instancePath + "/composites/automation_potential", schemaPath: "#/properties/composites/properties/automation_potential/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
        if (data10.ease !== void 0) {
          let data13 = data10.ease;
          if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
            if (data13.criteria === void 0) {
              const err32 = { instancePath: instancePath + "/composites/ease", schemaPath: "#/properties/composites/properties/ease/required", keyword: "required", params: { missingProperty: "criteria" }, message: "must have required property 'criteria'" };
              if (vErrors === null) {
                vErrors = [err32];
              } else {
                vErrors.push(err32);
              }
              errors++;
            }
            for (const key6 in data13) {
              if (!(key6 === "criteria")) {
                const err33 = { instancePath: instancePath + "/composites/ease", schemaPath: "#/properties/composites/properties/ease/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key6 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
            if (data13.criteria !== void 0) {
              if (!validate72(data13.criteria, { instancePath: instancePath + "/composites/ease/criteria", parentData: data13, parentDataProperty: "criteria", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate72.errors : vErrors.concat(validate72.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err34 = { instancePath: instancePath + "/composites/ease", schemaPath: "#/properties/composites/properties/ease/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err34];
            } else {
              vErrors.push(err34);
            }
            errors++;
          }
        }
      } else {
        const err35 = { instancePath: instancePath + "/composites", schemaPath: "#/properties/composites/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err35];
        } else {
          vErrors.push(err35);
        }
        errors++;
      }
    }
    if (data.thresholds !== void 0) {
      let data15 = data.thresholds;
      if (data15 && typeof data15 == "object" && !Array.isArray(data15)) {
        if (data15.high_min_pct === void 0) {
          const err36 = { instancePath: instancePath + "/thresholds", schemaPath: "#/properties/thresholds/required", keyword: "required", params: { missingProperty: "high_min_pct" }, message: "must have required property 'high_min_pct'" };
          if (vErrors === null) {
            vErrors = [err36];
          } else {
            vErrors.push(err36);
          }
          errors++;
        }
        if (data15.low_below_pct === void 0) {
          const err37 = { instancePath: instancePath + "/thresholds", schemaPath: "#/properties/thresholds/required", keyword: "required", params: { missingProperty: "low_below_pct" }, message: "must have required property 'low_below_pct'" };
          if (vErrors === null) {
            vErrors = [err37];
          } else {
            vErrors.push(err37);
          }
          errors++;
        }
        for (const key7 in data15) {
          if (!(key7 === "high_min_pct" || key7 === "low_below_pct")) {
            const err38 = { instancePath: instancePath + "/thresholds", schemaPath: "#/properties/thresholds/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key7 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err38];
            } else {
              vErrors.push(err38);
            }
            errors++;
          }
        }
        if (data15.high_min_pct !== void 0) {
          let data16 = data15.high_min_pct;
          if (typeof data16 == "number" && isFinite(data16)) {
            if (data16 > 1 || isNaN(data16)) {
              const err39 = { instancePath: instancePath + "/thresholds/high_min_pct", schemaPath: "#/properties/thresholds/properties/high_min_pct/maximum", keyword: "maximum", params: { comparison: "<=", limit: 1 }, message: "must be <= 1" };
              if (vErrors === null) {
                vErrors = [err39];
              } else {
                vErrors.push(err39);
              }
              errors++;
            }
            if (data16 <= 0 || isNaN(data16)) {
              const err40 = { instancePath: instancePath + "/thresholds/high_min_pct", schemaPath: "#/properties/thresholds/properties/high_min_pct/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" };
              if (vErrors === null) {
                vErrors = [err40];
              } else {
                vErrors.push(err40);
              }
              errors++;
            }
          } else {
            const err41 = { instancePath: instancePath + "/thresholds/high_min_pct", schemaPath: "#/properties/thresholds/properties/high_min_pct/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err41];
            } else {
              vErrors.push(err41);
            }
            errors++;
          }
        }
        if (data15.low_below_pct !== void 0) {
          let data17 = data15.low_below_pct;
          if (typeof data17 == "number" && isFinite(data17)) {
            if (data17 < 0 || isNaN(data17)) {
              const err42 = { instancePath: instancePath + "/thresholds/low_below_pct", schemaPath: "#/properties/thresholds/properties/low_below_pct/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
              if (vErrors === null) {
                vErrors = [err42];
              } else {
                vErrors.push(err42);
              }
              errors++;
            }
            if (data17 >= 1 || isNaN(data17)) {
              const err43 = { instancePath: instancePath + "/thresholds/low_below_pct", schemaPath: "#/properties/thresholds/properties/low_below_pct/exclusiveMaximum", keyword: "exclusiveMaximum", params: { comparison: "<", limit: 1 }, message: "must be < 1" };
              if (vErrors === null) {
                vErrors = [err43];
              } else {
                vErrors.push(err43);
              }
              errors++;
            }
          } else {
            const err44 = { instancePath: instancePath + "/thresholds/low_below_pct", schemaPath: "#/properties/thresholds/properties/low_below_pct/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          }
        }
      } else {
        const err45 = { instancePath: instancePath + "/thresholds", schemaPath: "#/properties/thresholds/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err45];
        } else {
          vErrors.push(err45);
        }
        errors++;
      }
    }
    if (data.quadrants !== void 0) {
      let data18 = data.quadrants;
      if (data18 && typeof data18 == "object" && !Array.isArray(data18)) {
        if (data18.prioritize === void 0) {
          const err46 = { instancePath: instancePath + "/quadrants", schemaPath: "#/properties/quadrants/required", keyword: "required", params: { missingProperty: "prioritize" }, message: "must have required property 'prioritize'" };
          if (vErrors === null) {
            vErrors = [err46];
          } else {
            vErrors.push(err46);
          }
          errors++;
        }
        if (data18.review === void 0) {
          const err47 = { instancePath: instancePath + "/quadrants", schemaPath: "#/properties/quadrants/required", keyword: "required", params: { missingProperty: "review" }, message: "must have required property 'review'" };
          if (vErrors === null) {
            vErrors = [err47];
          } else {
            vErrors.push(err47);
          }
          errors++;
        }
        if (data18.defer === void 0) {
          const err48 = { instancePath: instancePath + "/quadrants", schemaPath: "#/properties/quadrants/required", keyword: "required", params: { missingProperty: "defer" }, message: "must have required property 'defer'" };
          if (vErrors === null) {
            vErrors = [err48];
          } else {
            vErrors.push(err48);
          }
          errors++;
        }
        for (const key8 in data18) {
          if (!(key8 === "prioritize" || key8 === "review" || key8 === "defer")) {
            const err49 = { instancePath: instancePath + "/quadrants", schemaPath: "#/properties/quadrants/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key8 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err49];
            } else {
              vErrors.push(err49);
            }
            errors++;
          }
        }
        if (data18.prioritize !== void 0) {
          if (typeof data18.prioritize !== "string") {
            const err50 = { instancePath: instancePath + "/quadrants/prioritize", schemaPath: "#/properties/quadrants/properties/prioritize/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err50];
            } else {
              vErrors.push(err50);
            }
            errors++;
          }
        }
        if (data18.review !== void 0) {
          if (typeof data18.review !== "string") {
            const err51 = { instancePath: instancePath + "/quadrants/review", schemaPath: "#/properties/quadrants/properties/review/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err51];
            } else {
              vErrors.push(err51);
            }
            errors++;
          }
        }
        if (data18.defer !== void 0) {
          if (typeof data18.defer !== "string") {
            const err52 = { instancePath: instancePath + "/quadrants/defer", schemaPath: "#/properties/quadrants/properties/defer/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err52];
            } else {
              vErrors.push(err52);
            }
            errors++;
          }
        }
      } else {
        const err53 = { instancePath: instancePath + "/quadrants", schemaPath: "#/properties/quadrants/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err53];
        } else {
          vErrors.push(err53);
        }
        errors++;
      }
    }
    if (data.ai_overlay !== void 0) {
      let data22 = data.ai_overlay;
      if (data22 && typeof data22 == "object" && !Array.isArray(data22)) {
        if (data22.applies_fact === void 0) {
          const err54 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/required", keyword: "required", params: { missingProperty: "applies_fact" }, message: "must have required property 'applies_fact'" };
          if (vErrors === null) {
            vErrors = [err54];
          } else {
            vErrors.push(err54);
          }
          errors++;
        }
        if (data22.applies_bands === void 0) {
          const err55 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/required", keyword: "required", params: { missingProperty: "applies_bands" }, message: "must have required property 'applies_bands'" };
          if (vErrors === null) {
            vErrors = [err55];
          } else {
            vErrors.push(err55);
          }
          errors++;
        }
        if (data22.checks === void 0) {
          const err56 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/required", keyword: "required", params: { missingProperty: "checks" }, message: "must have required property 'checks'" };
          if (vErrors === null) {
            vErrors = [err56];
          } else {
            vErrors.push(err56);
          }
          errors++;
        }
        if (data22.check_bands === void 0) {
          const err57 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/required", keyword: "required", params: { missingProperty: "check_bands" }, message: "must have required property 'check_bands'" };
          if (vErrors === null) {
            vErrors = [err57];
          } else {
            vErrors.push(err57);
          }
          errors++;
        }
        if (data22.dont_build_on_fail === void 0) {
          const err58 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/required", keyword: "required", params: { missingProperty: "dont_build_on_fail" }, message: "must have required property 'dont_build_on_fail'" };
          if (vErrors === null) {
            vErrors = [err58];
          } else {
            vErrors.push(err58);
          }
          errors++;
        }
        for (const key9 in data22) {
          if (!(key9 === "applies_fact" || key9 === "applies_bands" || key9 === "checks" || key9 === "check_bands" || key9 === "dont_build_on_fail")) {
            const err59 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key9 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err59];
            } else {
              vErrors.push(err59);
            }
            errors++;
          }
        }
        if (data22.applies_fact !== void 0) {
          if ("ai_applies" !== data22.applies_fact) {
            const err60 = { instancePath: instancePath + "/ai_overlay/applies_fact", schemaPath: "#/properties/ai_overlay/properties/applies_fact/const", keyword: "const", params: { allowedValue: "ai_applies" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err60];
            } else {
              vErrors.push(err60);
            }
            errors++;
          }
        }
        if (data22.applies_bands !== void 0) {
          let data24 = data22.applies_bands;
          if (data24 && typeof data24 == "object" && !Array.isArray(data24)) {
            if (data24.unknown === void 0) {
              const err61 = { instancePath: instancePath + "/ai_overlay/applies_bands", schemaPath: "#/properties/ai_overlay/properties/applies_bands/required", keyword: "required", params: { missingProperty: "unknown" }, message: "must have required property 'unknown'" };
              if (vErrors === null) {
                vErrors = [err61];
              } else {
                vErrors.push(err61);
              }
              errors++;
            }
            for (const key10 in data24) {
              if (!(key10 === "unknown")) {
                if (typeof data24[key10] !== "boolean") {
                  const err62 = { instancePath: instancePath + "/ai_overlay/applies_bands/" + key10.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/ai_overlay/properties/applies_bands/additionalProperties/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                  if (vErrors === null) {
                    vErrors = [err62];
                  } else {
                    vErrors.push(err62);
                  }
                  errors++;
                }
              }
            }
            if (data24.unknown !== void 0) {
              if (false !== data24.unknown) {
                const err63 = { instancePath: instancePath + "/ai_overlay/applies_bands/unknown", schemaPath: "#/properties/ai_overlay/properties/applies_bands/properties/unknown/const", keyword: "const", params: { allowedValue: false }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err63];
                } else {
                  vErrors.push(err63);
                }
                errors++;
              }
            }
          } else {
            const err64 = { instancePath: instancePath + "/ai_overlay/applies_bands", schemaPath: "#/properties/ai_overlay/properties/applies_bands/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err64];
            } else {
              vErrors.push(err64);
            }
            errors++;
          }
        }
        if (data22.checks !== void 0) {
          let data27 = data22.checks;
          if (data27 && typeof data27 == "object" && !Array.isArray(data27)) {
            for (const key11 in data27) {
              let data28 = data27[key11];
              if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
                if (data28.label === void 0) {
                  const err65 = { instancePath: instancePath + "/ai_overlay/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
                  if (vErrors === null) {
                    vErrors = [err65];
                  } else {
                    vErrors.push(err65);
                  }
                  errors++;
                }
                if (data28.passes_when === void 0) {
                  const err66 = { instancePath: instancePath + "/ai_overlay/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/required", keyword: "required", params: { missingProperty: "passes_when" }, message: "must have required property 'passes_when'" };
                  if (vErrors === null) {
                    vErrors = [err66];
                  } else {
                    vErrors.push(err66);
                  }
                  errors++;
                }
                if (data28.basis === void 0) {
                  const err67 = { instancePath: instancePath + "/ai_overlay/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/required", keyword: "required", params: { missingProperty: "basis" }, message: "must have required property 'basis'" };
                  if (vErrors === null) {
                    vErrors = [err67];
                  } else {
                    vErrors.push(err67);
                  }
                  errors++;
                }
                for (const key12 in data28) {
                  if (!(key12 === "label" || key12 === "passes_when" || key12 === "basis")) {
                    const err68 = { instancePath: instancePath + "/ai_overlay/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key12 }, message: "must NOT have additional properties" };
                    if (vErrors === null) {
                      vErrors = [err68];
                    } else {
                      vErrors.push(err68);
                    }
                    errors++;
                  }
                }
                if (data28.label !== void 0) {
                  if (typeof data28.label !== "string") {
                    const err69 = { instancePath: instancePath + "/ai_overlay/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1") + "/label", schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err69];
                    } else {
                      vErrors.push(err69);
                    }
                    errors++;
                  }
                }
                if (data28.passes_when !== void 0) {
                  if (typeof data28.passes_when !== "string") {
                    const err70 = { instancePath: instancePath + "/ai_overlay/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1") + "/passes_when", schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/properties/passes_when/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err70];
                    } else {
                      vErrors.push(err70);
                    }
                    errors++;
                  }
                }
                if (data28.basis !== void 0) {
                  if (typeof data28.basis !== "string") {
                    const err71 = { instancePath: instancePath + "/ai_overlay/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1") + "/basis", schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/properties/basis/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err71];
                    } else {
                      vErrors.push(err71);
                    }
                    errors++;
                  }
                }
              } else {
                const err72 = { instancePath: instancePath + "/ai_overlay/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                if (vErrors === null) {
                  vErrors = [err72];
                } else {
                  vErrors.push(err72);
                }
                errors++;
              }
            }
          } else {
            const err73 = { instancePath: instancePath + "/ai_overlay/checks", schemaPath: "#/properties/ai_overlay/properties/checks/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err73];
            } else {
              vErrors.push(err73);
            }
            errors++;
          }
        }
        if (data22.check_bands !== void 0) {
          if (!func0(data22.check_bands, schema27.properties.ai_overlay.properties.check_bands.const)) {
            const err74 = { instancePath: instancePath + "/ai_overlay/check_bands", schemaPath: "#/properties/ai_overlay/properties/check_bands/const", keyword: "const", params: { allowedValue: schema27.properties.ai_overlay.properties.check_bands.const }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err74];
            } else {
              vErrors.push(err74);
            }
            errors++;
          }
        }
        if (data22.dont_build_on_fail !== void 0) {
          let data33 = data22.dont_build_on_fail;
          if (Array.isArray(data33)) {
            const len1 = data33.length;
            for (let i1 = 0; i1 < len1; i1++) {
              if (typeof data33[i1] !== "string") {
                const err75 = { instancePath: instancePath + "/ai_overlay/dont_build_on_fail/" + i1, schemaPath: "#/properties/ai_overlay/properties/dont_build_on_fail/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err75];
                } else {
                  vErrors.push(err75);
                }
                errors++;
              }
            }
          } else {
            const err76 = { instancePath: instancePath + "/ai_overlay/dont_build_on_fail", schemaPath: "#/properties/ai_overlay/properties/dont_build_on_fail/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err76];
            } else {
              vErrors.push(err76);
            }
            errors++;
          }
        }
      } else {
        const err77 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err77];
        } else {
          vErrors.push(err77);
        }
        errors++;
      }
    }
    if (data.adoption !== void 0) {
      let data35 = data.adoption;
      if (data35 && typeof data35 == "object" && !Array.isArray(data35)) {
        if (data35.applies_to === void 0) {
          const err78 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/required", keyword: "required", params: { missingProperty: "applies_to" }, message: "must have required property 'applies_to'" };
          if (vErrors === null) {
            vErrors = [err78];
          } else {
            vErrors.push(err78);
          }
          errors++;
        }
        if (data35.forces === void 0) {
          const err79 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/required", keyword: "required", params: { missingProperty: "forces" }, message: "must have required property 'forces'" };
          if (vErrors === null) {
            vErrors = [err79];
          } else {
            vErrors.push(err79);
          }
          errors++;
        }
        if (data35.bands === void 0) {
          const err80 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/required", keyword: "required", params: { missingProperty: "bands" }, message: "must have required property 'bands'" };
          if (vErrors === null) {
            vErrors = [err80];
          } else {
            vErrors.push(err80);
          }
          errors++;
        }
        if (data35.risk_when === void 0) {
          const err81 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/required", keyword: "required", params: { missingProperty: "risk_when" }, message: "must have required property 'risk_when'" };
          if (vErrors === null) {
            vErrors = [err81];
          } else {
            vErrors.push(err81);
          }
          errors++;
        }
        for (const key13 in data35) {
          if (!(key13 === "applies_to" || key13 === "forces" || key13 === "bands" || key13 === "risk_when" || key13 === "usually_from")) {
            const err82 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key13 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err82];
            } else {
              vErrors.push(err82);
            }
            errors++;
          }
        }
        if (data35.applies_to !== void 0) {
          let data36 = data35.applies_to;
          if (Array.isArray(data36)) {
            const len2 = data36.length;
            for (let i2 = 0; i2 < len2; i2++) {
              if (!validate56(data36[i2], { instancePath: instancePath + "/adoption/applies_to/" + i2, parentData: data36, parentDataProperty: i2, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err83 = { instancePath: instancePath + "/adoption/applies_to", schemaPath: "#/properties/adoption/properties/applies_to/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err83];
            } else {
              vErrors.push(err83);
            }
            errors++;
          }
        }
        if (data35.forces !== void 0) {
          if (!func0(data35.forces, schema27.properties.adoption.properties.forces.const)) {
            const err84 = { instancePath: instancePath + "/adoption/forces", schemaPath: "#/properties/adoption/properties/forces/const", keyword: "const", params: { allowedValue: schema27.properties.adoption.properties.forces.const }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err84];
            } else {
              vErrors.push(err84);
            }
            errors++;
          }
        }
        if (data35.bands !== void 0) {
          if (!validate76(data35.bands, { instancePath: instancePath + "/adoption/bands", parentData: data35, parentDataProperty: "bands", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate76.errors : vErrors.concat(validate76.errors);
            errors = vErrors.length;
          }
        }
        if (data35.risk_when !== void 0) {
          let data40 = data35.risk_when;
          if (data40 && typeof data40 == "object" && !Array.isArray(data40)) {
            for (const key14 in data40) {
              let data41 = data40[key14];
              if (Array.isArray(data41)) {
                const len3 = data41.length;
                for (let i3 = 0; i3 < len3; i3++) {
                  if (typeof data41[i3] !== "string") {
                    const err85 = { instancePath: instancePath + "/adoption/risk_when/" + key14.replace(/~/g, "~0").replace(/\//g, "~1") + "/" + i3, schemaPath: "#/properties/adoption/properties/risk_when/additionalProperties/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err85];
                    } else {
                      vErrors.push(err85);
                    }
                    errors++;
                  }
                }
              } else {
                const err86 = { instancePath: instancePath + "/adoption/risk_when/" + key14.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/adoption/properties/risk_when/additionalProperties/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err86];
                } else {
                  vErrors.push(err86);
                }
                errors++;
              }
            }
          } else {
            const err87 = { instancePath: instancePath + "/adoption/risk_when", schemaPath: "#/properties/adoption/properties/risk_when/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err87];
            } else {
              vErrors.push(err87);
            }
            errors++;
          }
        }
        if (data35.usually_from !== void 0) {
          let data43 = data35.usually_from;
          if (data43 && typeof data43 == "object" && !Array.isArray(data43)) {
            for (const key15 in data43) {
              let data44 = data43[key15];
              if (Array.isArray(data44)) {
                const len4 = data44.length;
                for (let i4 = 0; i4 < len4; i4++) {
                  if (typeof data44[i4] !== "string") {
                    const err88 = { instancePath: instancePath + "/adoption/usually_from/" + key15.replace(/~/g, "~0").replace(/\//g, "~1") + "/" + i4, schemaPath: "#/properties/adoption/properties/usually_from/additionalProperties/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err88];
                    } else {
                      vErrors.push(err88);
                    }
                    errors++;
                  }
                }
              } else {
                const err89 = { instancePath: instancePath + "/adoption/usually_from/" + key15.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/adoption/properties/usually_from/additionalProperties/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err89];
                } else {
                  vErrors.push(err89);
                }
                errors++;
              }
            }
          } else {
            const err90 = { instancePath: instancePath + "/adoption/usually_from", schemaPath: "#/properties/adoption/properties/usually_from/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err90];
            } else {
              vErrors.push(err90);
            }
            errors++;
          }
        }
      } else {
        const err91 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err91];
        } else {
          vErrors.push(err91);
        }
        errors++;
      }
    }
    if (data.gate_facts !== void 0) {
      let data46 = data.gate_facts;
      if (data46 && typeof data46 == "object" && !Array.isArray(data46)) {
        for (const key16 in data46) {
          if (!validate76(data46[key16], { instancePath: instancePath + "/gate_facts/" + key16.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data46, parentDataProperty: key16, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate76.errors : vErrors.concat(validate76.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err92 = { instancePath: instancePath + "/gate_facts", schemaPath: "#/properties/gate_facts/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err92];
        } else {
          vErrors.push(err92);
        }
        errors++;
      }
    }
    if (data.gate_fact_notes !== void 0) {
      let data48 = data.gate_fact_notes;
      if (data48 && typeof data48 == "object" && !Array.isArray(data48)) {
        for (const key17 in data48) {
          let data49 = data48[key17];
          if (typeof data49 === "string") {
            if (func1(data49) < 1) {
              const err93 = { instancePath: instancePath + "/gate_fact_notes/" + key17.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/gate_fact_notes/additionalProperties/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err93];
              } else {
                vErrors.push(err93);
              }
              errors++;
            }
          } else {
            const err94 = { instancePath: instancePath + "/gate_fact_notes/" + key17.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/gate_fact_notes/additionalProperties/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err94];
            } else {
              vErrors.push(err94);
            }
            errors++;
          }
        }
      } else {
        const err95 = { instancePath: instancePath + "/gate_fact_notes", schemaPath: "#/properties/gate_fact_notes/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err95];
        } else {
          vErrors.push(err95);
        }
        errors++;
      }
    }
    if (data.gates !== void 0) {
      let data50 = data.gates;
      if (data50 && typeof data50 == "object" && !Array.isArray(data50)) {
        if (data50.go_requires_core === void 0) {
          const err96 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/required", keyword: "required", params: { missingProperty: "go_requires_core" }, message: "must have required property 'go_requires_core'" };
          if (vErrors === null) {
            vErrors = [err96];
          } else {
            vErrors.push(err96);
          }
          errors++;
        }
        if (data50.precedence === void 0) {
          const err97 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/required", keyword: "required", params: { missingProperty: "precedence" }, message: "must have required property 'precedence'" };
          if (vErrors === null) {
            vErrors = [err97];
          } else {
            vErrors.push(err97);
          }
          errors++;
        }
        if (data50.fix_not_build === void 0) {
          const err98 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/required", keyword: "required", params: { missingProperty: "fix_not_build" }, message: "must have required property 'fix_not_build'" };
          if (vErrors === null) {
            vErrors = [err98];
          } else {
            vErrors.push(err98);
          }
          errors++;
        }
        if (data50.dont_build_definitive === void 0) {
          const err99 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/required", keyword: "required", params: { missingProperty: "dont_build_definitive" }, message: "must have required property 'dont_build_definitive'" };
          if (vErrors === null) {
            vErrors = [err99];
          } else {
            vErrors.push(err99);
          }
          errors++;
        }
        if (data50.gather_more === void 0) {
          const err100 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/required", keyword: "required", params: { missingProperty: "gather_more" }, message: "must have required property 'gather_more'" };
          if (vErrors === null) {
            vErrors = [err100];
          } else {
            vErrors.push(err100);
          }
          errors++;
        }
        if (data50.dont_build_quadrant === void 0) {
          const err101 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/required", keyword: "required", params: { missingProperty: "dont_build_quadrant" }, message: "must have required property 'dont_build_quadrant'" };
          if (vErrors === null) {
            vErrors = [err101];
          } else {
            vErrors.push(err101);
          }
          errors++;
        }
        if (data50.go === void 0) {
          const err102 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/required", keyword: "required", params: { missingProperty: "go" }, message: "must have required property 'go'" };
          if (vErrors === null) {
            vErrors = [err102];
          } else {
            vErrors.push(err102);
          }
          errors++;
        }
        if (data50.fallthrough === void 0) {
          const err103 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/required", keyword: "required", params: { missingProperty: "fallthrough" }, message: "must have required property 'fallthrough'" };
          if (vErrors === null) {
            vErrors = [err103];
          } else {
            vErrors.push(err103);
          }
          errors++;
        }
        for (const key18 in data50) {
          if (!(key18 === "go_requires_core" || key18 === "precedence" || key18 === "fix_not_build" || key18 === "dont_build_definitive" || key18 === "gather_more" || key18 === "dont_build_quadrant" || key18 === "go" || key18 === "fallthrough")) {
            const err104 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key18 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err104];
            } else {
              vErrors.push(err104);
            }
            errors++;
          }
        }
        if (data50.go_requires_core !== void 0) {
          let data51 = data50.go_requires_core;
          if (Array.isArray(data51)) {
            if (data51.length < 1) {
              const err105 = { instancePath: instancePath + "/gates/go_requires_core", schemaPath: "#/properties/gates/properties/go_requires_core/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err105];
              } else {
                vErrors.push(err105);
              }
              errors++;
            }
            const len5 = data51.length;
            for (let i5 = 0; i5 < len5; i5++) {
              let data52 = data51[i5];
              if (typeof data52 === "string") {
                if (!pattern5.test(data52)) {
                  const err106 = { instancePath: instancePath + "/gates/go_requires_core/" + i5, schemaPath: "#/properties/gates/properties/go_requires_core/items/pattern", keyword: "pattern", params: { pattern: "^core\\.[a-z_]+$" }, message: 'must match pattern "^core\\.[a-z_]+$"' };
                  if (vErrors === null) {
                    vErrors = [err106];
                  } else {
                    vErrors.push(err106);
                  }
                  errors++;
                }
              } else {
                const err107 = { instancePath: instancePath + "/gates/go_requires_core/" + i5, schemaPath: "#/properties/gates/properties/go_requires_core/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err107];
                } else {
                  vErrors.push(err107);
                }
                errors++;
              }
            }
          } else {
            const err108 = { instancePath: instancePath + "/gates/go_requires_core", schemaPath: "#/properties/gates/properties/go_requires_core/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err108];
            } else {
              vErrors.push(err108);
            }
            errors++;
          }
        }
        if (data50.precedence !== void 0) {
          if (!func0(data50.precedence, schema27.properties.gates.properties.precedence.const)) {
            const err109 = { instancePath: instancePath + "/gates/precedence", schemaPath: "#/properties/gates/properties/precedence/const", keyword: "const", params: { allowedValue: schema27.properties.gates.properties.precedence.const }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err109];
            } else {
              vErrors.push(err109);
            }
            errors++;
          }
        }
        if (data50.fix_not_build !== void 0) {
          let data54 = data50.fix_not_build;
          if (data54 && typeof data54 == "object" && !Array.isArray(data54)) {
            if (data54.applies_to === void 0) {
              const err110 = { instancePath: instancePath + "/gates/fix_not_build", schemaPath: "#/properties/gates/properties/fix_not_build/required", keyword: "required", params: { missingProperty: "applies_to" }, message: "must have required property 'applies_to'" };
              if (vErrors === null) {
                vErrors = [err110];
              } else {
                vErrors.push(err110);
              }
              errors++;
            }
            if (data54.when_cause === void 0) {
              const err111 = { instancePath: instancePath + "/gates/fix_not_build", schemaPath: "#/properties/gates/properties/fix_not_build/required", keyword: "required", params: { missingProperty: "when_cause" }, message: "must have required property 'when_cause'" };
              if (vErrors === null) {
                vErrors = [err111];
              } else {
                vErrors.push(err111);
              }
              errors++;
            }
            if (data54.when_workaround_permanent === void 0) {
              const err112 = { instancePath: instancePath + "/gates/fix_not_build", schemaPath: "#/properties/gates/properties/fix_not_build/required", keyword: "required", params: { missingProperty: "when_workaround_permanent" }, message: "must have required property 'when_workaround_permanent'" };
              if (vErrors === null) {
                vErrors = [err112];
              } else {
                vErrors.push(err112);
              }
              errors++;
            }
            for (const key19 in data54) {
              if (!(key19 === "applies_to" || key19 === "when_cause" || key19 === "when_workaround_permanent")) {
                const err113 = { instancePath: instancePath + "/gates/fix_not_build", schemaPath: "#/properties/gates/properties/fix_not_build/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key19 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err113];
                } else {
                  vErrors.push(err113);
                }
                errors++;
              }
            }
            if (data54.applies_to !== void 0) {
              let data55 = data54.applies_to;
              if (Array.isArray(data55)) {
                const len6 = data55.length;
                for (let i6 = 0; i6 < len6; i6++) {
                  if (!validate56(data55[i6], { instancePath: instancePath + "/gates/fix_not_build/applies_to/" + i6, parentData: data55, parentDataProperty: i6, rootData, dynamicAnchors })) {
                    vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
                    errors = vErrors.length;
                  }
                }
              } else {
                const err114 = { instancePath: instancePath + "/gates/fix_not_build/applies_to", schemaPath: "#/properties/gates/properties/fix_not_build/properties/applies_to/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err114];
                } else {
                  vErrors.push(err114);
                }
                errors++;
              }
            }
            if (data54.when_cause !== void 0) {
              let data57 = data54.when_cause;
              if (Array.isArray(data57)) {
                const len7 = data57.length;
                for (let i7 = 0; i7 < len7; i7++) {
                  if (typeof data57[i7] !== "string") {
                    const err115 = { instancePath: instancePath + "/gates/fix_not_build/when_cause/" + i7, schemaPath: "#/properties/gates/properties/fix_not_build/properties/when_cause/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err115];
                    } else {
                      vErrors.push(err115);
                    }
                    errors++;
                  }
                }
              } else {
                const err116 = { instancePath: instancePath + "/gates/fix_not_build/when_cause", schemaPath: "#/properties/gates/properties/fix_not_build/properties/when_cause/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err116];
                } else {
                  vErrors.push(err116);
                }
                errors++;
              }
            }
            if (data54.when_workaround_permanent !== void 0) {
              let data59 = data54.when_workaround_permanent;
              if (Array.isArray(data59)) {
                const len8 = data59.length;
                for (let i8 = 0; i8 < len8; i8++) {
                  if (typeof data59[i8] !== "string") {
                    const err117 = { instancePath: instancePath + "/gates/fix_not_build/when_workaround_permanent/" + i8, schemaPath: "#/properties/gates/properties/fix_not_build/properties/when_workaround_permanent/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err117];
                    } else {
                      vErrors.push(err117);
                    }
                    errors++;
                  }
                }
              } else {
                const err118 = { instancePath: instancePath + "/gates/fix_not_build/when_workaround_permanent", schemaPath: "#/properties/gates/properties/fix_not_build/properties/when_workaround_permanent/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err118];
                } else {
                  vErrors.push(err118);
                }
                errors++;
              }
            }
          } else {
            const err119 = { instancePath: instancePath + "/gates/fix_not_build", schemaPath: "#/properties/gates/properties/fix_not_build/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err119];
            } else {
              vErrors.push(err119);
            }
            errors++;
          }
        }
        if (data50.dont_build_definitive !== void 0) {
          let data61 = data50.dont_build_definitive;
          if (data61 && typeof data61 == "object" && !Array.isArray(data61)) {
            if (data61.existing_asset === void 0) {
              const err120 = { instancePath: instancePath + "/gates/dont_build_definitive", schemaPath: "#/properties/gates/properties/dont_build_definitive/required", keyword: "required", params: { missingProperty: "existing_asset" }, message: "must have required property 'existing_asset'" };
              if (vErrors === null) {
                vErrors = [err120];
              } else {
                vErrors.push(err120);
              }
              errors++;
            }
            if (data61.decision_depends === void 0) {
              const err121 = { instancePath: instancePath + "/gates/dont_build_definitive", schemaPath: "#/properties/gates/properties/dont_build_definitive/required", keyword: "required", params: { missingProperty: "decision_depends" }, message: "must have required property 'decision_depends'" };
              if (vErrors === null) {
                vErrors = [err121];
              } else {
                vErrors.push(err121);
              }
              errors++;
            }
            if (data61.decision_depends_applies_to === void 0) {
              const err122 = { instancePath: instancePath + "/gates/dont_build_definitive", schemaPath: "#/properties/gates/properties/dont_build_definitive/required", keyword: "required", params: { missingProperty: "decision_depends_applies_to" }, message: "must have required property 'decision_depends_applies_to'" };
              if (vErrors === null) {
                vErrors = [err122];
              } else {
                vErrors.push(err122);
              }
              errors++;
            }
            if (data61.value === void 0) {
              const err123 = { instancePath: instancePath + "/gates/dont_build_definitive", schemaPath: "#/properties/gates/properties/dont_build_definitive/required", keyword: "required", params: { missingProperty: "value" }, message: "must have required property 'value'" };
              if (vErrors === null) {
                vErrors = [err123];
              } else {
                vErrors.push(err123);
              }
              errors++;
            }
            if (data61.superseded_by_go_item === void 0) {
              const err124 = { instancePath: instancePath + "/gates/dont_build_definitive", schemaPath: "#/properties/gates/properties/dont_build_definitive/required", keyword: "required", params: { missingProperty: "superseded_by_go_item" }, message: "must have required property 'superseded_by_go_item'" };
              if (vErrors === null) {
                vErrors = [err124];
              } else {
                vErrors.push(err124);
              }
              errors++;
            }
            for (const key20 in data61) {
              if (!(key20 === "existing_asset" || key20 === "decision_depends" || key20 === "decision_depends_applies_to" || key20 === "value" || key20 === "superseded_by_go_item")) {
                const err125 = { instancePath: instancePath + "/gates/dont_build_definitive", schemaPath: "#/properties/gates/properties/dont_build_definitive/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key20 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err125];
                } else {
                  vErrors.push(err125);
                }
                errors++;
              }
            }
            if (data61.existing_asset !== void 0) {
              let data62 = data61.existing_asset;
              if (Array.isArray(data62)) {
                const len9 = data62.length;
                for (let i9 = 0; i9 < len9; i9++) {
                  if (typeof data62[i9] !== "string") {
                    const err126 = { instancePath: instancePath + "/gates/dont_build_definitive/existing_asset/" + i9, schemaPath: "#/properties/gates/properties/dont_build_definitive/properties/existing_asset/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err126];
                    } else {
                      vErrors.push(err126);
                    }
                    errors++;
                  }
                }
              } else {
                const err127 = { instancePath: instancePath + "/gates/dont_build_definitive/existing_asset", schemaPath: "#/properties/gates/properties/dont_build_definitive/properties/existing_asset/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err127];
                } else {
                  vErrors.push(err127);
                }
                errors++;
              }
            }
            if (data61.decision_depends !== void 0) {
              let data64 = data61.decision_depends;
              if (Array.isArray(data64)) {
                const len10 = data64.length;
                for (let i10 = 0; i10 < len10; i10++) {
                  if (typeof data64[i10] !== "string") {
                    const err128 = { instancePath: instancePath + "/gates/dont_build_definitive/decision_depends/" + i10, schemaPath: "#/properties/gates/properties/dont_build_definitive/properties/decision_depends/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err128];
                    } else {
                      vErrors.push(err128);
                    }
                    errors++;
                  }
                }
              } else {
                const err129 = { instancePath: instancePath + "/gates/dont_build_definitive/decision_depends", schemaPath: "#/properties/gates/properties/dont_build_definitive/properties/decision_depends/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err129];
                } else {
                  vErrors.push(err129);
                }
                errors++;
              }
            }
            if (data61.decision_depends_applies_to !== void 0) {
              let data66 = data61.decision_depends_applies_to;
              if (Array.isArray(data66)) {
                const len11 = data66.length;
                for (let i11 = 0; i11 < len11; i11++) {
                  if (!validate56(data66[i11], { instancePath: instancePath + "/gates/dont_build_definitive/decision_depends_applies_to/" + i11, parentData: data66, parentDataProperty: i11, rootData, dynamicAnchors })) {
                    vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
                    errors = vErrors.length;
                  }
                }
              } else {
                const err130 = { instancePath: instancePath + "/gates/dont_build_definitive/decision_depends_applies_to", schemaPath: "#/properties/gates/properties/dont_build_definitive/properties/decision_depends_applies_to/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err130];
                } else {
                  vErrors.push(err130);
                }
                errors++;
              }
            }
            if (data61.value !== void 0) {
              let data68 = data61.value;
              if (Array.isArray(data68)) {
                const len12 = data68.length;
                for (let i12 = 0; i12 < len12; i12++) {
                  if (typeof data68[i12] !== "string") {
                    const err131 = { instancePath: instancePath + "/gates/dont_build_definitive/value/" + i12, schemaPath: "#/properties/gates/properties/dont_build_definitive/properties/value/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err131];
                    } else {
                      vErrors.push(err131);
                    }
                    errors++;
                  }
                }
              } else {
                const err132 = { instancePath: instancePath + "/gates/dont_build_definitive/value", schemaPath: "#/properties/gates/properties/dont_build_definitive/properties/value/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err132];
                } else {
                  vErrors.push(err132);
                }
                errors++;
              }
            }
            if (data61.superseded_by_go_item !== void 0) {
              if (typeof data61.superseded_by_go_item !== "boolean") {
                const err133 = { instancePath: instancePath + "/gates/dont_build_definitive/superseded_by_go_item", schemaPath: "#/properties/gates/properties/dont_build_definitive/properties/superseded_by_go_item/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err133];
                } else {
                  vErrors.push(err133);
                }
                errors++;
              }
            }
          } else {
            const err134 = { instancePath: instancePath + "/gates/dont_build_definitive", schemaPath: "#/properties/gates/properties/dont_build_definitive/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err134];
            } else {
              vErrors.push(err134);
            }
            errors++;
          }
        }
        if (data50.gather_more !== void 0) {
          let data71 = data50.gather_more;
          if (data71 && typeof data71 == "object" && !Array.isArray(data71)) {
            if (data71.critical_unknown === void 0) {
              const err135 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/required", keyword: "required", params: { missingProperty: "critical_unknown" }, message: "must have required property 'critical_unknown'" };
              if (vErrors === null) {
                vErrors = [err135];
              } else {
                vErrors.push(err135);
              }
              errors++;
            }
            if (data71.stability === void 0) {
              const err136 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/required", keyword: "required", params: { missingProperty: "stability" }, message: "must have required property 'stability'" };
              if (vErrors === null) {
                vErrors = [err136];
              } else {
                vErrors.push(err136);
              }
              errors++;
            }
            if (data71.review_without_mitigation === void 0) {
              const err137 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/required", keyword: "required", params: { missingProperty: "review_without_mitigation" }, message: "must have required property 'review_without_mitigation'" };
              if (vErrors === null) {
                vErrors = [err137];
              } else {
                vErrors.push(err137);
              }
              errors++;
            }
            if (data71.modifiers === void 0) {
              const err138 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/required", keyword: "required", params: { missingProperty: "modifiers" }, message: "must have required property 'modifiers'" };
              if (vErrors === null) {
                vErrors = [err138];
              } else {
                vErrors.push(err138);
              }
              errors++;
            }
            if (data71.defer_with_critical_unknown === void 0) {
              const err139 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/required", keyword: "required", params: { missingProperty: "defer_with_critical_unknown" }, message: "must have required property 'defer_with_critical_unknown'" };
              if (vErrors === null) {
                vErrors = [err139];
              } else {
                vErrors.push(err139);
              }
              errors++;
            }
            if (data71.composite_null === void 0) {
              const err140 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/required", keyword: "required", params: { missingProperty: "composite_null" }, message: "must have required property 'composite_null'" };
              if (vErrors === null) {
                vErrors = [err140];
              } else {
                vErrors.push(err140);
              }
              errors++;
            }
            if (data71.ai_overlay_unresolved === void 0) {
              const err141 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/required", keyword: "required", params: { missingProperty: "ai_overlay_unresolved" }, message: "must have required property 'ai_overlay_unresolved'" };
              if (vErrors === null) {
                vErrors = [err141];
              } else {
                vErrors.push(err141);
              }
              errors++;
            }
            for (const key21 in data71) {
              if (!(key21 === "critical_unknown" || key21 === "stability" || key21 === "review_without_mitigation" || key21 === "modifiers" || key21 === "defer_with_critical_unknown" || key21 === "composite_null" || key21 === "ai_overlay_unresolved" || key21 === "decision_depends")) {
                const err142 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key21 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err142];
                } else {
                  vErrors.push(err142);
                }
                errors++;
              }
            }
            if (data71.critical_unknown !== void 0) {
              if (typeof data71.critical_unknown !== "boolean") {
                const err143 = { instancePath: instancePath + "/gates/gather_more/critical_unknown", schemaPath: "#/properties/gates/properties/gather_more/properties/critical_unknown/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err143];
                } else {
                  vErrors.push(err143);
                }
                errors++;
              }
            }
            if (data71.stability !== void 0) {
              let data73 = data71.stability;
              if (Array.isArray(data73)) {
                const len13 = data73.length;
                for (let i13 = 0; i13 < len13; i13++) {
                  if (typeof data73[i13] !== "string") {
                    const err144 = { instancePath: instancePath + "/gates/gather_more/stability/" + i13, schemaPath: "#/properties/gates/properties/gather_more/properties/stability/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err144];
                    } else {
                      vErrors.push(err144);
                    }
                    errors++;
                  }
                }
              } else {
                const err145 = { instancePath: instancePath + "/gates/gather_more/stability", schemaPath: "#/properties/gates/properties/gather_more/properties/stability/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err145];
                } else {
                  vErrors.push(err145);
                }
                errors++;
              }
            }
            if (data71.review_without_mitigation !== void 0) {
              if (typeof data71.review_without_mitigation !== "boolean") {
                const err146 = { instancePath: instancePath + "/gates/gather_more/review_without_mitigation", schemaPath: "#/properties/gates/properties/gather_more/properties/review_without_mitigation/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err146];
                } else {
                  vErrors.push(err146);
                }
                errors++;
              }
            }
            if (data71.modifiers !== void 0) {
              let data76 = data71.modifiers;
              if (Array.isArray(data76)) {
                const len14 = data76.length;
                for (let i14 = 0; i14 < len14; i14++) {
                  if (!validate60(data76[i14], { instancePath: instancePath + "/gates/gather_more/modifiers/" + i14, parentData: data76, parentDataProperty: i14, rootData, dynamicAnchors })) {
                    vErrors = vErrors === null ? validate60.errors : vErrors.concat(validate60.errors);
                    errors = vErrors.length;
                  }
                }
              } else {
                const err147 = { instancePath: instancePath + "/gates/gather_more/modifiers", schemaPath: "#/properties/gates/properties/gather_more/properties/modifiers/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err147];
                } else {
                  vErrors.push(err147);
                }
                errors++;
              }
            }
            if (data71.defer_with_critical_unknown !== void 0) {
              if (typeof data71.defer_with_critical_unknown !== "boolean") {
                const err148 = { instancePath: instancePath + "/gates/gather_more/defer_with_critical_unknown", schemaPath: "#/properties/gates/properties/gather_more/properties/defer_with_critical_unknown/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err148];
                } else {
                  vErrors.push(err148);
                }
                errors++;
              }
            }
            if (data71.composite_null !== void 0) {
              if (typeof data71.composite_null !== "boolean") {
                const err149 = { instancePath: instancePath + "/gates/gather_more/composite_null", schemaPath: "#/properties/gates/properties/gather_more/properties/composite_null/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err149];
                } else {
                  vErrors.push(err149);
                }
                errors++;
              }
            }
            if (data71.ai_overlay_unresolved !== void 0) {
              if (typeof data71.ai_overlay_unresolved !== "boolean") {
                const err150 = { instancePath: instancePath + "/gates/gather_more/ai_overlay_unresolved", schemaPath: "#/properties/gates/properties/gather_more/properties/ai_overlay_unresolved/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err150];
                } else {
                  vErrors.push(err150);
                }
                errors++;
              }
            }
            if (data71.decision_depends !== void 0) {
              let data81 = data71.decision_depends;
              if (Array.isArray(data81)) {
                const len15 = data81.length;
                for (let i15 = 0; i15 < len15; i15++) {
                  if (typeof data81[i15] !== "string") {
                    const err151 = { instancePath: instancePath + "/gates/gather_more/decision_depends/" + i15, schemaPath: "#/properties/gates/properties/gather_more/properties/decision_depends/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err151];
                    } else {
                      vErrors.push(err151);
                    }
                    errors++;
                  }
                }
              } else {
                const err152 = { instancePath: instancePath + "/gates/gather_more/decision_depends", schemaPath: "#/properties/gates/properties/gather_more/properties/decision_depends/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err152];
                } else {
                  vErrors.push(err152);
                }
                errors++;
              }
            }
          } else {
            const err153 = { instancePath: instancePath + "/gates/gather_more", schemaPath: "#/properties/gates/properties/gather_more/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err153];
            } else {
              vErrors.push(err153);
            }
            errors++;
          }
        }
        if (data50.dont_build_quadrant !== void 0) {
          let data83 = data50.dont_build_quadrant;
          if (data83 && typeof data83 == "object" && !Array.isArray(data83)) {
            if (data83.quadrant === void 0) {
              const err154 = { instancePath: instancePath + "/gates/dont_build_quadrant", schemaPath: "#/properties/gates/properties/dont_build_quadrant/required", keyword: "required", params: { missingProperty: "quadrant" }, message: "must have required property 'quadrant'" };
              if (vErrors === null) {
                vErrors = [err154];
              } else {
                vErrors.push(err154);
              }
              errors++;
            }
            if (data83.defer_rescued_by_ai_overlay === void 0) {
              const err155 = { instancePath: instancePath + "/gates/dont_build_quadrant", schemaPath: "#/properties/gates/properties/dont_build_quadrant/required", keyword: "required", params: { missingProperty: "defer_rescued_by_ai_overlay" }, message: "must have required property 'defer_rescued_by_ai_overlay'" };
              if (vErrors === null) {
                vErrors = [err155];
              } else {
                vErrors.push(err155);
              }
              errors++;
            }
            if (data83.ai_overlay_fail === void 0) {
              const err156 = { instancePath: instancePath + "/gates/dont_build_quadrant", schemaPath: "#/properties/gates/properties/dont_build_quadrant/required", keyword: "required", params: { missingProperty: "ai_overlay_fail" }, message: "must have required property 'ai_overlay_fail'" };
              if (vErrors === null) {
                vErrors = [err156];
              } else {
                vErrors.push(err156);
              }
              errors++;
            }
            for (const key22 in data83) {
              if (!(key22 === "quadrant" || key22 === "defer_rescued_by_ai_overlay" || key22 === "ai_overlay_fail")) {
                const err157 = { instancePath: instancePath + "/gates/dont_build_quadrant", schemaPath: "#/properties/gates/properties/dont_build_quadrant/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key22 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err157];
                } else {
                  vErrors.push(err157);
                }
                errors++;
              }
            }
            if (data83.quadrant !== void 0) {
              let data84 = data83.quadrant;
              if (Array.isArray(data84)) {
                const len16 = data84.length;
                for (let i16 = 0; i16 < len16; i16++) {
                  let data85 = data84[i16];
                  if (!(data85 === "prioritize" || data85 === "review" || data85 === "defer")) {
                    const err158 = { instancePath: instancePath + "/gates/dont_build_quadrant/quadrant/" + i16, schemaPath: "#/properties/gates/properties/dont_build_quadrant/properties/quadrant/items/enum", keyword: "enum", params: { allowedValues: schema27.properties.gates.properties.dont_build_quadrant.properties.quadrant.items.enum }, message: "must be equal to one of the allowed values" };
                    if (vErrors === null) {
                      vErrors = [err158];
                    } else {
                      vErrors.push(err158);
                    }
                    errors++;
                  }
                }
              } else {
                const err159 = { instancePath: instancePath + "/gates/dont_build_quadrant/quadrant", schemaPath: "#/properties/gates/properties/dont_build_quadrant/properties/quadrant/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err159];
                } else {
                  vErrors.push(err159);
                }
                errors++;
              }
            }
            if (data83.defer_rescued_by_ai_overlay !== void 0) {
              if (typeof data83.defer_rescued_by_ai_overlay !== "boolean") {
                const err160 = { instancePath: instancePath + "/gates/dont_build_quadrant/defer_rescued_by_ai_overlay", schemaPath: "#/properties/gates/properties/dont_build_quadrant/properties/defer_rescued_by_ai_overlay/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err160];
                } else {
                  vErrors.push(err160);
                }
                errors++;
              }
            }
            if (data83.ai_overlay_fail !== void 0) {
              if (typeof data83.ai_overlay_fail !== "boolean") {
                const err161 = { instancePath: instancePath + "/gates/dont_build_quadrant/ai_overlay_fail", schemaPath: "#/properties/gates/properties/dont_build_quadrant/properties/ai_overlay_fail/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err161];
                } else {
                  vErrors.push(err161);
                }
                errors++;
              }
            }
          } else {
            const err162 = { instancePath: instancePath + "/gates/dont_build_quadrant", schemaPath: "#/properties/gates/properties/dont_build_quadrant/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err162];
            } else {
              vErrors.push(err162);
            }
            errors++;
          }
        }
        if (data50.go !== void 0) {
          let data88 = data50.go;
          if (data88 && typeof data88 == "object" && !Array.isArray(data88)) {
            if (data88.success_metric === void 0) {
              const err163 = { instancePath: instancePath + "/gates/go", schemaPath: "#/properties/gates/properties/go/required", keyword: "required", params: { missingProperty: "success_metric" }, message: "must have required property 'success_metric'" };
              if (vErrors === null) {
                vErrors = [err163];
              } else {
                vErrors.push(err163);
              }
              errors++;
            }
            if (data88.quadrants === void 0) {
              const err164 = { instancePath: instancePath + "/gates/go", schemaPath: "#/properties/gates/properties/go/required", keyword: "required", params: { missingProperty: "quadrants" }, message: "must have required property 'quadrants'" };
              if (vErrors === null) {
                vErrors = [err164];
              } else {
                vErrors.push(err164);
              }
              errors++;
            }
            if (data88.review_needs_mitigation === void 0) {
              const err165 = { instancePath: instancePath + "/gates/go", schemaPath: "#/properties/gates/properties/go/required", keyword: "required", params: { missingProperty: "review_needs_mitigation" }, message: "must have required property 'review_needs_mitigation'" };
              if (vErrors === null) {
                vErrors = [err165];
              } else {
                vErrors.push(err165);
              }
              errors++;
            }
            if (data88.ai_candidate_from_defer === void 0) {
              const err166 = { instancePath: instancePath + "/gates/go", schemaPath: "#/properties/gates/properties/go/required", keyword: "required", params: { missingProperty: "ai_candidate_from_defer" }, message: "must have required property 'ai_candidate_from_defer'" };
              if (vErrors === null) {
                vErrors = [err166];
              } else {
                vErrors.push(err166);
              }
              errors++;
            }
            if (data88.ai_overlay_must_pass === void 0) {
              const err167 = { instancePath: instancePath + "/gates/go", schemaPath: "#/properties/gates/properties/go/required", keyword: "required", params: { missingProperty: "ai_overlay_must_pass" }, message: "must have required property 'ai_overlay_must_pass'" };
              if (vErrors === null) {
                vErrors = [err167];
              } else {
                vErrors.push(err167);
              }
              errors++;
            }
            if (data88.reflect_back_confirmed === void 0) {
              const err168 = { instancePath: instancePath + "/gates/go", schemaPath: "#/properties/gates/properties/go/required", keyword: "required", params: { missingProperty: "reflect_back_confirmed" }, message: "must have required property 'reflect_back_confirmed'" };
              if (vErrors === null) {
                vErrors = [err168];
              } else {
                vErrors.push(err168);
              }
              errors++;
            }
            for (const key23 in data88) {
              if (!(key23 === "success_metric" || key23 === "quadrants" || key23 === "review_needs_mitigation" || key23 === "ai_candidate_from_defer" || key23 === "ai_overlay_must_pass" || key23 === "reflect_back_confirmed")) {
                const err169 = { instancePath: instancePath + "/gates/go", schemaPath: "#/properties/gates/properties/go/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key23 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err169];
                } else {
                  vErrors.push(err169);
                }
                errors++;
              }
            }
            if (data88.success_metric !== void 0) {
              let data89 = data88.success_metric;
              if (Array.isArray(data89)) {
                const len17 = data89.length;
                for (let i17 = 0; i17 < len17; i17++) {
                  if (typeof data89[i17] !== "string") {
                    const err170 = { instancePath: instancePath + "/gates/go/success_metric/" + i17, schemaPath: "#/properties/gates/properties/go/properties/success_metric/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err170];
                    } else {
                      vErrors.push(err170);
                    }
                    errors++;
                  }
                }
              } else {
                const err171 = { instancePath: instancePath + "/gates/go/success_metric", schemaPath: "#/properties/gates/properties/go/properties/success_metric/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err171];
                } else {
                  vErrors.push(err171);
                }
                errors++;
              }
            }
            if (data88.quadrants !== void 0) {
              let data91 = data88.quadrants;
              if (Array.isArray(data91)) {
                const len18 = data91.length;
                for (let i18 = 0; i18 < len18; i18++) {
                  let data92 = data91[i18];
                  if (!(data92 === "prioritize" || data92 === "review" || data92 === "defer")) {
                    const err172 = { instancePath: instancePath + "/gates/go/quadrants/" + i18, schemaPath: "#/properties/gates/properties/go/properties/quadrants/items/enum", keyword: "enum", params: { allowedValues: schema27.properties.gates.properties.go.properties.quadrants.items.enum }, message: "must be equal to one of the allowed values" };
                    if (vErrors === null) {
                      vErrors = [err172];
                    } else {
                      vErrors.push(err172);
                    }
                    errors++;
                  }
                }
              } else {
                const err173 = { instancePath: instancePath + "/gates/go/quadrants", schemaPath: "#/properties/gates/properties/go/properties/quadrants/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err173];
                } else {
                  vErrors.push(err173);
                }
                errors++;
              }
            }
            if (data88.review_needs_mitigation !== void 0) {
              if (typeof data88.review_needs_mitigation !== "boolean") {
                const err174 = { instancePath: instancePath + "/gates/go/review_needs_mitigation", schemaPath: "#/properties/gates/properties/go/properties/review_needs_mitigation/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err174];
                } else {
                  vErrors.push(err174);
                }
                errors++;
              }
            }
            if (data88.ai_candidate_from_defer !== void 0) {
              if (typeof data88.ai_candidate_from_defer !== "boolean") {
                const err175 = { instancePath: instancePath + "/gates/go/ai_candidate_from_defer", schemaPath: "#/properties/gates/properties/go/properties/ai_candidate_from_defer/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err175];
                } else {
                  vErrors.push(err175);
                }
                errors++;
              }
            }
            if (data88.ai_overlay_must_pass !== void 0) {
              if (typeof data88.ai_overlay_must_pass !== "boolean") {
                const err176 = { instancePath: instancePath + "/gates/go/ai_overlay_must_pass", schemaPath: "#/properties/gates/properties/go/properties/ai_overlay_must_pass/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err176];
                } else {
                  vErrors.push(err176);
                }
                errors++;
              }
            }
            if (data88.reflect_back_confirmed !== void 0) {
              if (typeof data88.reflect_back_confirmed !== "boolean") {
                const err177 = { instancePath: instancePath + "/gates/go/reflect_back_confirmed", schemaPath: "#/properties/gates/properties/go/properties/reflect_back_confirmed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err177];
                } else {
                  vErrors.push(err177);
                }
                errors++;
              }
            }
          } else {
            const err178 = { instancePath: instancePath + "/gates/go", schemaPath: "#/properties/gates/properties/go/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err178];
            } else {
              vErrors.push(err178);
            }
            errors++;
          }
        }
        if (data50.fallthrough !== void 0) {
          if ("gather_more" !== data50.fallthrough) {
            const err179 = { instancePath: instancePath + "/gates/fallthrough", schemaPath: "#/properties/gates/properties/fallthrough/const", keyword: "const", params: { allowedValue: "gather_more" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err179];
            } else {
              vErrors.push(err179);
            }
            errors++;
          }
        }
      } else {
        const err180 = { instancePath: instancePath + "/gates", schemaPath: "#/properties/gates/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err180];
        } else {
          vErrors.push(err180);
        }
        errors++;
      }
    }
  } else {
    const err181 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err181];
    } else {
      vErrors.push(err181);
    }
    errors++;
  }
  validate68.errors = vErrors;
  return errors === 0;
}
validate68.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var sections = validate82;
function validate82(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate82.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    for (const key0 in data) {
      const _errs1 = errors;
      if (typeof key0 === "string") {
        if (!pattern6.test(key0)) {
          const err0 = { instancePath, schemaPath: "#/propertyNames/pattern", keyword: "pattern", params: { pattern: "^[A-Z_]+\\.md$" }, message: 'must match pattern "^[A-Z_]+\\.md$"', propertyName: key0 };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
      }
      var valid0 = _errs1 === errors;
      if (!valid0) {
        const err1 = { instancePath, schemaPath: "#/propertyNames", keyword: "propertyNames", params: { propertyName: key0 }, message: "property name must be valid" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    for (const key1 in data) {
      let data0 = data[key1];
      if (Array.isArray(data0)) {
        if (data0.length < 1) {
          const err2 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        const len0 = data0.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data1 = data0[i0];
          if (typeof data1 === "string") {
            if (!pattern7.test(data1)) {
              const err3 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/" + i0, schemaPath: "#/additionalProperties/items/pattern", keyword: "pattern", params: { pattern: "^[a-z_]+$" }, message: 'must match pattern "^[a-z_]+$"' };
              if (vErrors === null) {
                vErrors = [err3];
              } else {
                vErrors.push(err3);
              }
              errors++;
            }
          } else {
            const err4 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/" + i0, schemaPath: "#/additionalProperties/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err4];
            } else {
              vErrors.push(err4);
            }
            errors++;
          }
        }
        let i1 = data0.length;
        let j0;
        if (i1 > 1) {
          const indices0 = {};
          for (; i1--; ) {
            let item0 = data0[i1];
            if (typeof item0 !== "string") {
              continue;
            }
            if (typeof indices0[item0] == "number") {
              j0 = indices0[item0];
              const err5 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
              break;
            }
            indices0[item0] = i1;
          }
        }
      } else {
        const err6 = { instancePath: instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/additionalProperties/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate82.errors = vErrors;
  return errors === 0;
}
validate82.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };

// src/lib/framework-fs.ts
var import_yaml = __toESM(require_dist(), 1);
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// src/lib/generated/schema-facts.js
var factNames = {
  "turn": [
    "rule_clarity",
    "input_digital",
    "input_structured",
    "ways_done",
    "stability",
    "documentation",
    "steps_apps",
    "access",
    "value",
    "ai_applies",
    "eval_ability",
    "error_cost",
    "human_review",
    "simpler_option",
    "fallback",
    "sensitive_data",
    "push",
    "pull",
    "anxiety",
    "habit",
    "existing_asset",
    "decision_depends",
    "broken_cause",
    "workaround_permanent",
    "success_metric"
  ],
  "session": [
    "rule_clarity",
    "input_digital",
    "input_structured",
    "ways_done",
    "stability",
    "documentation",
    "steps_apps",
    "access",
    "value",
    "ai_applies",
    "eval_ability",
    "error_cost",
    "human_review",
    "simpler_option",
    "fallback",
    "sensitive_data",
    "push",
    "pull",
    "anxiety",
    "habit",
    "existing_asset",
    "decision_depends",
    "broken_cause",
    "workaround_permanent",
    "success_metric"
  ]
};
var coreAreas = ["users", "outcome", "data", "systems", "constraints", "trust"];

// src/lib/framework.ts
var FrameworkError = class extends Error {
  issues;
  constructor(issues) {
    super(`intake-kit framework config is invalid:
  - ${issues.join("\n  - ")}`);
    this.issues = issues;
  }
};
function check(validators, kind, data, file, issues) {
  const fn = validators?.[kind];
  if (fn && !fn(data)) {
    for (const e of fn.errors ?? []) issues.push(`${file}: ${e.instancePath || "/"} ${e.message ?? e.keyword}`);
  }
}
function schemaFactNames() {
  return { turn: factNames.turn, session: factNames.session };
}
function buildFramework(sources, options = {}) {
  const { parseYaml: parseYaml4, schemas } = options;
  const issues = [];
  const parse = (text, file) => {
    if (typeof text !== "string") return structuredClone(text);
    if (!parseYaml4) {
      issues.push(`${file}: YAML text was given without a YAML parser (pass options.parseYaml)`);
      return null;
    }
    try {
      return parseYaml4(text);
    } catch (err) {
      issues.push(`${file}: not valid YAML: ${err.message}`);
      return null;
    }
  };
  const router2 = parse(sources.router, "router.yaml");
  check(schemas, "router", router2, "router.yaml", issues);
  const scoring2 = parse(sources.scoring, "scoring.yaml");
  check(schemas, "scoring", scoring2, "scoring.yaml", issues);
  const sections2 = parse(sources.sections, "templates/sections.yaml");
  check(schemas, "sections", sections2, "templates/sections.yaml", issues);
  const modules = {};
  for (const file of Object.keys(sources.modules).filter((f) => f.endsWith(".yaml")).sort()) {
    const mod = parse(sources.modules[file], `modules/${file}`);
    check(schemas, "module", mod, `modules/${file}`, issues);
    if (mod?.module) {
      if (`${mod.module}.yaml` !== file) issues.push(`modules/${file}: module "${mod.module}" doesn't match its file name`);
      modules[mod.module] = mod;
    }
  }
  if (issues.length) throw new FrameworkError(issues);
  if (!modules.core) issues.push("modules/core.yaml is missing");
  for (const [type, def] of Object.entries(router2.types)) {
    if (def.module !== type) issues.push(`router.yaml: type ${type} must use module "${type}", not "${def.module}"`);
    if (!modules[def.module]) issues.push(`router.yaml: type ${type} names missing module "${def.module}"`);
    else if (modules[def.module].applies_to !== type) issues.push(`modules/${def.module}.yaml: applies_to must be "${type}"`);
  }
  for (const [mod, def] of Object.entries(router2.modifiers)) {
    if (def.module !== `mod.${mod}`) issues.push(`router.yaml: modifier ${mod} must use module "mod.${mod}"`);
    if (!modules[def.module]) issues.push(`router.yaml: modifier ${mod} names missing module "${def.module}"`);
    else if (modules[def.module].applies_to !== "modifier") issues.push(`modules/${def.module}.yaml: applies_to must be "modifier"`);
    if (JSON.stringify(def.effects ?? {}) !== JSON.stringify(modules[def.module]?.effects ?? {})) {
      issues.push(`router.yaml and modules/${def.module}.yaml disagree on effects for ${mod}`);
    }
  }
  const routed = /* @__PURE__ */ new Set(["core", ...Object.values(router2.types).map((t) => t.module), ...Object.values(router2.modifiers).map((m) => m.module)]);
  for (const name of Object.keys(modules)) if (!routed.has(name)) issues.push(`modules/${name}.yaml isn't referenced by router.yaml`);
  const areas = /* @__PURE__ */ new Map();
  for (const mod of Object.values(modules)) {
    for (const area of mod.areas) {
      if (areas.has(area.id)) issues.push(`duplicate coverage ID ${area.id}`);
      areas.set(area.id, area);
      if (!area.id.startsWith(`${mod.module}.`) || !/^[a-z][a-z0-9_]*$/.test(area.id.slice(mod.module.length + 1))) {
        issues.push(`modules/${mod.module}.yaml: area ${area.id} must be "${mod.module}.<snake_case>"`);
      }
      for (const feed of area.feeds) {
        if (!sections2[feed.file]) issues.push(`${area.id}: feeds unknown file ${feed.file}`);
        else if (!sections2[feed.file].includes(feed.section)) issues.push(`${area.id}: feeds unknown section ${feed.file}#${feed.section}`);
      }
    }
  }
  const coreIds = coreAreas.map((a) => `core.${a}`);
  const moduleCore = modules.core?.areas.map((a) => a.id) ?? [];
  if (JSON.stringify([...moduleCore].sort()) !== JSON.stringify([...coreIds].sort())) {
    issues.push(`modules/core.yaml areas (${moduleCore.join(", ")}) must match the session schema's core (${coreIds.join(", ")})`);
  }
  for (const id of scoring2.gates.go_requires_core) if (!areas.has(id)) issues.push(`scoring.yaml: go_requires_core names unknown area ${id}`);
  for (const mod of Object.values(modules)) {
    for (const id of mod.asks_core ?? []) if (!coreIds.includes(id)) issues.push(`modules/${mod.module}.yaml: asks_core names unknown core area ${id}`);
  }
  const factBands = /* @__PURE__ */ new Map();
  for (const [name, def] of Object.entries(scoring2.criteria)) factBands.set(name, Object.keys(def.bands));
  factBands.set(scoring2.ai_overlay.applies_fact, Object.keys(scoring2.ai_overlay.applies_bands));
  for (const name of Object.keys(scoring2.ai_overlay.checks)) factBands.set(name, [...scoring2.ai_overlay.check_bands]);
  for (const name of scoring2.adoption.forces) factBands.set(name, [...scoring2.adoption.bands]);
  for (const [name, bands] of Object.entries(scoring2.gate_facts)) {
    if (factBands.has(name)) issues.push(`scoring.yaml: fact ${name} is defined twice`);
    factBands.set(name, bands);
  }
  for (const name of Object.keys(scoring2.gate_fact_notes ?? {})) {
    if (!scoring2.gate_facts[name]) issues.push(`scoring.yaml: gate_fact_notes names unknown gate fact ${name}`);
  }
  const fromScoring = [...factBands.keys()].sort();
  const { turn, session } = schemaFactNames();
  if (JSON.stringify(fromScoring) !== JSON.stringify([...turn].sort())) {
    issues.push(`facts in scoring.yaml (${fromScoring.join(", ")}) don't match the turn schema (${[...turn].sort().join(", ")})`);
  }
  if (JSON.stringify([...turn].sort()) !== JSON.stringify([...session].sort())) {
    issues.push("fact names in the turn and session schemas don't match");
  }
  for (const [name, comp] of Object.entries(scoring2.composites)) {
    for (const c of Object.keys(comp.criteria)) if (!scoring2.criteria[c]) issues.push(`scoring.yaml: composite ${name} uses unknown criterion ${c}`);
    if (Object.keys(comp.criteria).length < scoring2.min_known_per_composite) {
      issues.push(`scoring.yaml: composite ${name} has fewer criteria than min_known_per_composite`);
    }
  }
  for (const [c, def] of Object.entries(scoring2.criteria)) {
    for (const id of def.usually_from) if (!areas.has(id)) issues.push(`scoring.yaml: ${c}.usually_from names unknown area ${id}`);
    for (const b of Object.keys(def.describe)) if (!(b in def.bands)) issues.push(`scoring.yaml: ${c}.describe names unknown band ${b}`);
    for (const b of Object.keys(def.bands)) if (b !== "unknown" && !(b in def.describe)) issues.push(`scoring.yaml: ${c} band ${b} has no description`);
  }
  if (scoring2.thresholds.low_below_pct >= scoring2.thresholds.high_min_pct) issues.push("scoring.yaml: low_below_pct must be below high_min_pct");
  for (const c of scoring2.ai_overlay.dont_build_on_fail) if (!scoring2.ai_overlay.checks[c]) issues.push(`scoring.yaml: dont_build_on_fail names unknown check ${c}`);
  for (const force of Object.keys(scoring2.adoption.risk_when)) if (!scoring2.adoption.forces.includes(force)) issues.push(`scoring.yaml: adoption.risk_when names unknown force ${force}`);
  for (const [force, ids] of Object.entries(scoring2.adoption.usually_from ?? {})) {
    if (!scoring2.adoption.forces.includes(force)) issues.push(`scoring.yaml: adoption.usually_from names unknown force ${force}`);
    for (const id of ids) if (!areas.has(id)) issues.push(`scoring.yaml: adoption.usually_from.${force} names unknown area ${id}`);
  }
  const bandRefs = [
    ["broken_cause", "gates.fix_not_build.when_cause", scoring2.gates.fix_not_build.when_cause],
    ["workaround_permanent", "gates.fix_not_build.when_workaround_permanent", scoring2.gates.fix_not_build.when_workaround_permanent],
    ["existing_asset", "gates.dont_build_definitive.existing_asset", scoring2.gates.dont_build_definitive.existing_asset],
    ["decision_depends", "gates.dont_build_definitive.decision_depends", scoring2.gates.dont_build_definitive.decision_depends],
    ["value", "gates.dont_build_definitive.value", scoring2.gates.dont_build_definitive.value],
    ["stability", "gates.gather_more.stability", scoring2.gates.gather_more.stability],
    ["decision_depends", "gates.gather_more.decision_depends", scoring2.gates.gather_more.decision_depends ?? []],
    ["success_metric", "gates.go.success_metric", scoring2.gates.go.success_metric]
  ];
  for (const [fact, path, bands] of bandRefs) {
    const allowed = factBands.get(fact);
    if (!allowed) {
      issues.push(`scoring.yaml: ${path} refers to undefined fact ${fact}`);
      continue;
    }
    for (const b of bands) if (!allowed.includes(b)) issues.push(`scoring.yaml: ${path} names band "${b}", which ${fact} doesn't define`);
  }
  for (const [force, bands] of Object.entries(scoring2.adoption.risk_when)) {
    for (const b of bands) if (!scoring2.adoption.bands.includes(b)) issues.push(`scoring.yaml: adoption.risk_when.${force} names unknown band ${b}`);
  }
  if (issues.length) throw new FrameworkError(issues);
  return { router: router2, modules, scoring: scoring2, sections: sections2, areas, factBands };
}

// src/lib/framework-fs.ts
function frameworkDir(root) {
  return existsSync(join(root, "framework")) ? join(root, "framework") : join(root, "skills", "intake");
}
function readFrameworkSources(root) {
  const dir = frameworkDir(root);
  const modules = {};
  for (const file of readdirSync(join(dir, "modules")).filter((f) => f.endsWith(".yaml"))) {
    modules[file] = readFileSync(join(dir, "modules", file), "utf8");
  }
  return {
    router: readFileSync(join(dir, "router.yaml"), "utf8"),
    scoring: readFileSync(join(dir, "scoring.yaml"), "utf8"),
    sections: readFileSync(join(root, "templates", "sections.yaml"), "utf8"),
    modules
  };
}
function loadFramework(root) {
  return buildFramework(readFrameworkSources(root), { parseYaml: import_yaml.parse, schemas: framework_validators_exports });
}
function readTemplates(root) {
  const dir = join(root, "templates");
  return Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => [f, readFileSync(join(dir, f), "utf8")]));
}

// src/lib/grounding.ts
function normalize(text) {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/\s+/g, " ").trim().toLowerCase();
}
function findQuote(quote, transcript) {
  const q = normalize(quote);
  if (!q) return null;
  return transcript.find((entry) => entry.role === "user" && normalize(entry.text).includes(q)) ?? null;
}

// src/lib/session.ts
var isCaptured = (e) => e?.source === "captured";
var askedKey = (item, area) => area.startsWith("core.") ? area : item ? `${item}:${area}` : null;
function wasAsked(session, item, area) {
  const entry = area.startsWith("core.") ? item?.core_overrides[area.slice(5)] ?? session.core[area.slice(5)] : item?.coverage[area];
  const asked = session.session.asked;
  if (!asked) return !!entry?.updated_at;
  const key = askedKey(item?.id ?? null, area);
  if (key && asked[key]) return true;
  return !!entry?.updated_at && !isCaptured(entry) && (entry.status === "covered" || entry.status === "not_applicable");
}
function coverageFor(session, item, areaId) {
  if (areaId.startsWith("core.")) {
    const area = areaId.slice(5);
    return item.core_overrides[area] ?? session.core[area];
  }
  return item.coverage[areaId];
}

// src/lib/score.ts
var ScoringError = class extends Error {
};
function bandOf(item, fact, fw) {
  const band = item.facts[fact]?.band ?? "unknown";
  const allowed = fw.factBands.get(fact);
  if (!allowed) throw new ScoringError(`${item.id}: fact "${fact}" isn't defined in scoring.yaml`);
  if (!allowed.includes(band)) throw new ScoringError(`${item.id}: "${band}" isn't a band of ${fact} (allowed: ${allowed.join(", ")})`);
  return band;
}
function usableBand(session, item, fact) {
  const f = item.facts[fact];
  if (!f) return "unknown";
  const answered = f.evidence.map((id) => coverageFor(session, item, id)).filter((e) => e?.updated_at);
  return answered.length > 0 && answered.every(isCaptured) ? "unknown" : f.band;
}
function scoringView(session, item) {
  const facts = Object.fromEntries(Object.entries(item.facts).filter(([fact]) => usableBand(session, item, fact) === item.facts[fact].band));
  return Object.keys(facts).length === Object.keys(item.facts).length ? item : { ...item, facts };
}
function levelOf(mean, fw) {
  const pct = Math.round((mean - 1) / 4 * 1e6) / 1e6;
  if (pct >= fw.scoring.thresholds.high_min_pct) return "high";
  if (pct < fw.scoring.thresholds.low_below_pct) return "low";
  return "medium";
}
function quadrantOf(automation, ease) {
  if (automation === "high" && ease === "high") return "prioritize";
  if (automation === "low" && ease !== "high" || ease === "low" && automation !== "high") return "defer";
  return "review";
}
var round2 = (n) => Math.round(n * 100) / 100;
function scoreItem(item, fw) {
  const s = fw.scoring;
  const criteria = {};
  for (const [name, def] of Object.entries(s.criteria)) {
    const band = bandOf(item, name, fw);
    criteria[name] = { score: def.bands[band] ?? null, band, evidence: item.facts[name]?.evidence ?? [] };
  }
  const composite = (name) => {
    let total = 0;
    let weight = 0;
    let known = 0;
    for (const [c, w] of Object.entries(s.composites[name].criteria)) {
      const score = criteria[c]?.score;
      if (score == null) continue;
      total += score * w;
      weight += w;
      known += 1;
    }
    return known >= s.min_known_per_composite ? round2(total / weight) : null;
  };
  const automation_potential = composite("automation_potential");
  const ease = composite("ease");
  const quadrant = automation_potential == null || ease == null ? null : quadrantOf(levelOf(automation_potential, fw), levelOf(ease, fw));
  const applies = s.ai_overlay.applies_bands[bandOf(item, s.ai_overlay.applies_fact, fw)] ?? false;
  const checks = {};
  if (applies) for (const check2 of Object.keys(s.ai_overlay.checks)) checks[check2] = bandOf(item, check2, fw);
  let adoption = null;
  if (s.adoption.applies_to.includes(item.type)) {
    adoption = { push: "", pull: "", anxiety: "", habit: "" };
    for (const force of s.adoption.forces) adoption[force] = bandOf(item, force, fw);
  }
  return { criteria, automation_potential, ease, quadrant, ai_overlay: { applies, checks }, adoption, rules_version: s.rules_version };
}
function aiOverlayPasses(scoring2) {
  return scoring2.ai_overlay.applies && Object.values(scoring2.ai_overlay.checks).every((c) => c === "pass");
}
function adoptionRisks(scoring2, fw) {
  if (!scoring2.adoption) return [];
  return Object.entries(fw.scoring.adoption.risk_when).filter(([force, bands]) => bands.includes(scoring2.adoption[force])).map(([force]) => force);
}

// src/lib/gates.ts
var DECISION = {
  fix_not_build: "fix_not_build",
  dont_build_definitive: "dont_build",
  gather_more: "gather_more",
  dont_build_quadrant: "dont_build",
  go: "go"
};
var GateError = class extends Error {
};
function criticalAreas(item, fw) {
  const ids = new Set(fw.scoring.gates.go_requires_core);
  const modules = [item.type, ...item.modifiers.map((m) => `mod.${m}`)];
  for (const name of modules) for (const area of fw.modules[name]?.areas ?? []) if (area.critical) ids.add(area.id);
  return [...ids];
}
function areaSettled(session, item, id) {
  const entry = coverageFor(session, item, id);
  if (!entry || isCaptured(entry)) return false;
  if (entry.status === "covered" || entry.status === "not_applicable") return true;
  return entry.status === "assumed" && session.session.reflect_back?.confirmed === true;
}
function evaluate(session, item, fw, gateOf) {
  const g = fw.scoring.gates;
  const scoring2 = item.scoring;
  const band = (fact) => bandOf(scoringView(session, item), fact, fw);
  const m = {
    fix_not_build: { reasons: [], revisit_trigger: null },
    dont_build_definitive: { reasons: [], revisit_trigger: null },
    gather_more: { reasons: [], revisit_trigger: null },
    dont_build_quadrant: { reasons: [], revisit_trigger: null },
    go: { reasons: [], revisit_trigger: null }
  };
  const triggers = { dont_build_definitive: [], dont_build_quadrant: [] };
  if (g.fix_not_build.applies_to.includes(item.type)) {
    const cause = band("broken_cause");
    if (g.fix_not_build.when_cause.includes(cause)) m.fix_not_build.reasons.push(`Broken item with a ${cause} cause`);
    if (g.fix_not_build.when_workaround_permanent.includes(band("workaround_permanent"))) {
      m.fix_not_build.reasons.push("The workaround is acceptable as permanent");
    }
  }
  const d = g.dont_build_definitive;
  if (d.existing_asset.includes(band("existing_asset"))) {
    m.dont_build_definitive.reasons.push("An existing report or feature already covers it");
    triggers.dont_build_definitive.push("the existing report or feature stops covering this need");
  }
  const decisive = d.decision_depends_applies_to.includes(item.type);
  if (decisive && d.decision_depends.includes(band("decision_depends"))) {
    m.dont_build_definitive.reasons.push("No decision depends on it");
    triggers.dont_build_definitive.push("a decision comes to depend on it");
  }
  if (d.value.includes(band("value"))) {
    m.dont_build_definitive.reasons.push("The user describes its value as trivial");
    triggers.dont_build_definitive.push("the cost of the current way grows enough to matter");
  }
  if (d.superseded_by_go_item && item.superseded_by && gateOf(item.superseded_by)?.decision === "go") {
    m.dont_build_definitive.reasons.push(`Superseded by ${item.superseded_by}, which reaches Go`);
    triggers.dont_build_definitive.push(`${item.superseded_by} isn't built, or doesn't replace this`);
  }
  const gm = g.gather_more;
  const unsettled = criticalAreas(item, fw).filter((id) => !areaSettled(session, item, id));
  if (gm.critical_unknown) for (const id of unsettled) m.gather_more.reasons.push(`Critical area ${id} isn't covered`);
  if (gm.stability.includes(band("stability"))) m.gather_more.reasons.push("A major change is expected within six months");
  const depends = band("decision_depends");
  if ((gm.decision_depends ?? []).includes(depends) && !(decisive && d.decision_depends.includes(depends))) {
    m.gather_more.reasons.push(depends === "unknown" ? "Nobody has said what decision or outcome depends on it" : "No decision or outcome depends on it yet");
  }
  if (gm.review_without_mitigation && scoring2.quadrant === "review" && !item.prose.mitigation) {
    m.gather_more.reasons.push("Review quadrant with no written mitigation");
  }
  for (const mod of gm.modifiers) if (item.modifiers.includes(mod)) m.gather_more.reasons.push(`${mod} modifier routes to more discovery`);
  if (gm.defer_with_critical_unknown && scoring2.quadrant === "defer" && unsettled.length) {
    m.gather_more.reasons.push("Scored Defer while a critical area is still unknown");
  }
  if (gm.composite_null) {
    if (scoring2.automation_potential == null) m.gather_more.reasons.push("Too few known criteria to score automation potential");
    if (scoring2.ease == null) m.gather_more.reasons.push("Too few known criteria to score ease");
  }
  if (gm.ai_overlay_unresolved && scoring2.ai_overlay.applies) {
    const decisive2 = new Set(fw.scoring.ai_overlay.dont_build_on_fail);
    for (const [check2, result] of Object.entries(scoring2.ai_overlay.checks)) {
      if (result === "unknown") m.gather_more.reasons.push(`AI overlay check ${check2} is unknown`);
      else if (result === "fail" && !decisive2.has(check2)) m.gather_more.reasons.push(`AI overlay check ${check2} failed`);
    }
  }
  const q = g.dont_build_quadrant;
  const rescued = q.defer_rescued_by_ai_overlay && aiOverlayPasses(scoring2);
  if (scoring2.quadrant && q.quadrant.includes(scoring2.quadrant) && !rescued) {
    m.dont_build_quadrant.reasons.push(`${scoring2.quadrant[0].toUpperCase()}${scoring2.quadrant.slice(1)} quadrant`);
    triggers.dont_build_quadrant.push("rule clarity, data structure, stability or access improve enough to leave Defer");
  }
  if (q.ai_overlay_fail && scoring2.ai_overlay.applies) {
    for (const check2 of fw.scoring.ai_overlay.dont_build_on_fail) {
      if (scoring2.ai_overlay.checks[check2] === "fail") {
        m.dont_build_quadrant.reasons.push(`AI overlay check ${check2} failed`);
        triggers.dont_build_quadrant.push(`${check2.replace("_", " ")} can be shown to pass`);
      }
    }
  }
  const go = g.go;
  const unmet = [];
  if (go.reflect_back_confirmed && session.session.reflect_back?.confirmed !== true) unmet.push("Reflect-back not confirmed");
  for (const id of unsettled) unmet.push(`Critical area ${id} isn't covered`);
  if (!go.success_metric.includes(band("success_metric"))) unmet.push("No measurable success metric with a baseline");
  const quadrantOk = scoring2.quadrant != null && go.quadrants.includes(scoring2.quadrant) && (scoring2.quadrant !== "review" || !go.review_needs_mitigation || !!item.prose.mitigation) || go.ai_candidate_from_defer && scoring2.quadrant === "defer" && aiOverlayPasses(scoring2);
  if (!quadrantOk) unmet.push(scoring2.quadrant ? `${scoring2.quadrant} quadrant doesn't qualify for Go` : "Not enough known criteria to place in a quadrant");
  if (go.ai_overlay_must_pass && scoring2.ai_overlay.applies && !aiOverlayPasses(scoring2)) unmet.push("AI overlay doesn't pass every check");
  if (unmet.length === 0) {
    m.go.reasons.push(
      scoring2.quadrant === "defer" ? "AI candidate: Defer for rule-based automation, but every AI overlay check passes" : `${scoring2.quadrant[0].toUpperCase()}${scoring2.quadrant.slice(1)} quadrant`,
      "Critical areas covered or confirmed-assumed",
      "Measurable success metric with a baseline",
      "Reflect-back confirmed"
    );
  }
  m.dont_build_definitive.revisit_trigger = triggers.dont_build_definitive.length ? `Revisit if ${triggers.dont_build_definitive.join("; or ")}` : null;
  m.dont_build_quadrant.revisit_trigger = triggers.dont_build_quadrant.length ? `Revisit if ${triggers.dont_build_quadrant.join("; or ")}` : null;
  return { matches: m, unmetForGo: unmet };
}
function gateItem(session, item, fw, gateOf = () => null) {
  if (!item.scoring) throw new GateError(`${item.id} has no scoring; score it before gating`);
  if (item.dropped) return { decision: "dont_build", reasons: [`Dropped during the interview: ${item.dropped.reason}`], revisit_trigger: null, rules_version: fw.scoring.rules_version };
  const { matches, unmetForGo } = evaluate(session, item, fw, gateOf);
  const order = fw.scoring.gates.precedence;
  const winner = order.find((stage) => matches[stage].reasons.length > 0);
  if (!winner) {
    return { decision: "gather_more", reasons: unmetForGo, revisit_trigger: null, rules_version: fw.scoring.rules_version };
  }
  const also = order.filter((stage) => stage !== winner && stage !== "go" && matches[stage].reasons.length > 0).flatMap((stage) => matches[stage].reasons.map((r) => `(also matched ${DECISION[stage]}) ${r}`));
  return {
    decision: DECISION[winner],
    reasons: [...matches[winner].reasons, ...also],
    revisit_trigger: matches[winner].revisit_trigger,
    rules_version: fw.scoring.rules_version
  };
}
function scoreAndGate(session, fw) {
  if (session.session.reflect_back?.confirmed !== true) {
    return { session, scored: false, reason: "The reflect-back hasn't been confirmed, so nothing is scored yet." };
  }
  const out2 = structuredClone(session);
  const byId = new Map(out2.items.map((i) => [i.id, i]));
  for (const item of out2.items) {
    if (item.superseded_by && !byId.has(item.superseded_by)) throw new GateError(`${item.id} is superseded by unknown item ${item.superseded_by}`);
    item.scoring = scoreItem(scoringView(out2, item), fw);
    item.gate = null;
  }
  const inCycle = /* @__PURE__ */ new Set();
  for (const item of out2.items) {
    let cur = item.superseded_by;
    for (let steps = 0; cur && steps < out2.items.length; steps++) {
      if (cur === item.id) {
        inCycle.add(item.id);
        break;
      }
      cur = byId.get(cur).superseded_by;
    }
  }
  const gates = /* @__PURE__ */ new Map();
  const gateOf = (id) => {
    const done = gates.get(id);
    if (done) return done;
    const gate = gateItem(out2, byId.get(id), fw, inCycle.has(id) ? () => null : gateOf);
    gates.set(id, gate);
    return gate;
  };
  for (const item of out2.items) item.gate = gateOf(item.id);
  return { session: out2, scored: true };
}

// src/lib/generated/session-validator.js
var validateSession = validate52;
var schema19 = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://github.com/tjpinder/intake-kit/schema/session.schema.json", "title": "Intake session file, intake-answers.yaml (schema_version 1)", "description": "The source of truth every output is rendered from. Only apply-turn writes coverage, facts, router and prose fields; only code writes scoring and gate. Never written by the model directly.", "type": "object", "additionalProperties": false, "required": ["schema_version", "framework_version", "session", "core", "items"], "properties": { "schema_version": { "const": 1 }, "framework_version": { "$ref": "#/$defs/semver", "description": "Version of the router, module and scoring YAML used." }, "session": { "type": "object", "additionalProperties": false, "required": ["id", "started_at", "mode", "provider", "grounding", "reflect_back"], "properties": { "id": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}-[0-9a-f]{4,}$" }, "started_at": { "type": "string", "format": "date-time" }, "mode": { "enum": ["stakeholder", "builder"] }, "provider": { "enum": ["claude", "azure-openai", "openai", "codex"] }, "grounding": { "enum": ["transcript", "unverified"], "description": "transcript: every quote was checked against the user's recorded words. unverified: no transcript was available (e.g. Codex without the hook), so quotes weren't checked." }, "reflect_back": { "oneOf": [{ "type": "null" }, { "type": "object", "additionalProperties": false, "required": ["text", "confirmed", "corrections"], "properties": { "text": { "type": "string", "minLength": 1 }, "confirmed": { "type": "boolean" }, "corrections": { "type": "array", "items": { "type": "string", "minLength": 1 } }, "proposed_at": { "type": "string", "format": "date-time" } } }] }, "last_target": { "description": "The area the last applied turn asked about, and the reply that asked it. If the next turn doesn't record the area, the user's reply is captured as an assumed answer, but only when that reply is the one the user saw.", "oneOf": [{ "type": "null" }, { "type": "object", "additionalProperties": false, "required": ["item", "area"], "properties": { "item": { "type": ["string", "null"] }, "area": { "type": "string" }, "reply": { "type": "string" } } }] }, "asked": { "description": "When each area was first asked about, stamped by code from each applied turn's next_target: core areas by ID, an item's own areas as <item>:<area>. Readiness counts an area as asked only if it's here or was answered in full.", "type": "object", "propertyNames": { "pattern": "^(core\\.[a-z_]+|item-\\d+:[a-z_.]+)$" }, "additionalProperties": { "type": "string", "format": "date-time" } } } }, "core": { "type": "object", "additionalProperties": false, "required": ["users", "outcome", "data", "systems", "constraints", "trust"], "properties": { "users": { "$ref": "#/$defs/coverage_entry" }, "outcome": { "$ref": "#/$defs/coverage_entry" }, "data": { "$ref": "#/$defs/coverage_entry" }, "systems": { "$ref": "#/$defs/coverage_entry" }, "constraints": { "$ref": "#/$defs/coverage_entry" }, "trust": { "$ref": "#/$defs/coverage_entry" } } }, "items": { "type": "array", "items": { "$ref": "#/$defs/item" } } }, "$defs": { "semver": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" }, "item_id": { "type": "string", "pattern": "^item-\\d+$" }, "core_area": { "enum": ["users", "outcome", "data", "systems", "constraints", "trust"] }, "coverage_id": { "type": "string", "pattern": "^(core|broken|manual_process|known_idea|exploratory|data_report)\\.[a-z][a-z0-9_]*$|^mod\\.(integration|compliance|migration)\\.[a-z][a-z0-9_]*$" }, "item_type": { "enum": ["broken", "manual_process", "known_idea", "exploratory", "data_report"] }, "quote": { "type": "string", "minLength": 1 }, "coverage_entry": { "description": "Status rules: covered needs a value and at least one quote; assumed needs a quote; unknown has a null value; probe_count is at most 1.", "type": "object", "additionalProperties": false, "required": ["status", "value", "quotes", "probe_count"], "properties": { "status": { "enum": ["covered", "assumed", "unknown", "not_applicable"] }, "value": { "type": ["string", "null"] }, "quotes": { "type": "array", "items": { "$ref": "#/$defs/quote" } }, "probe_count": { "type": "integer", "minimum": 0, "maximum": 1 }, "updated_at": { "type": "string", "format": "date-time" }, "source": { "enum": ["captured"], "description": "captured: the user's reply stored word for word because the interviewer didn't record the answer to its own question. Shown for confirmation, never used as scoring evidence." } }, "allOf": [{ "if": { "properties": { "status": { "const": "covered" } } }, "then": { "properties": { "value": { "type": "string", "minLength": 1 }, "quotes": { "type": "array", "minItems": 1 } } } }, { "if": { "properties": { "status": { "const": "assumed" } } }, "then": { "properties": { "quotes": { "type": "array", "minItems": 1 } } } }, { "if": { "properties": { "status": { "const": "unknown" } } }, "then": { "properties": { "value": { "type": "null" } } } }] }, "fact_entry": { "description": "A band the model picked, with its evidence. scoring.yaml maps bands to scores; the band name itself is checked against scoring.yaml by code.", "type": "object", "additionalProperties": false, "required": ["band", "evidence", "quotes"], "properties": { "band": { "type": "string", "pattern": "^[a-z0-9][a-z0-9_+-]*$" }, "evidence": { "type": "array", "items": { "$ref": "#/$defs/coverage_id" } }, "quotes": { "type": "array", "items": { "$ref": "#/$defs/quote" } } } }, "item": { "type": "object", "additionalProperties": false, "required": ["id", "title", "type", "confidence", "trigger_quote", "modifiers", "spawned_from", "superseded_by", "type_history", "core_overrides", "coverage", "facts", "prose", "acceptance", "guardrails", "scoring", "gate", "open_questions"], "properties": { "id": { "$ref": "#/$defs/item_id" }, "title": { "type": "string", "minLength": 1 }, "type": { "$ref": "#/$defs/item_type" }, "confidence": { "enum": ["high", "med", "low"] }, "trigger_quote": { "$ref": "#/$defs/quote" }, "modifiers": { "type": "array", "uniqueItems": true, "items": { "enum": ["integration", "compliance", "migration"] } }, "spawned_from": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/item_id" }] }, "superseded_by": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/item_id" }] }, "modifiers_removed": { "description": "Modifiers taken back during the interview, so they aren't suggested again.", "type": "array", "items": { "enum": ["integration", "compliance", "migration"] } }, "dropped": { "description": "Set when the item turned out not to apply (the user said so). Gated Don't build with the reason; never confused with being replaced by another item.", "type": "object", "additionalProperties": false, "required": ["reason", "quote", "at"], "properties": { "reason": { "type": "string", "minLength": 1 }, "quote": { "$ref": "#/$defs/quote" }, "at": { "type": "string", "format": "date-time" } } }, "type_history": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["from", "to", "reason", "quote", "at"], "properties": { "from": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/item_type" }] }, "to": { "$ref": "#/$defs/item_type" }, "reason": { "type": "string", "minLength": 1 }, "quote": { "$ref": "#/$defs/quote" }, "at": { "type": "string", "format": "date-time" } } } }, "core_overrides": { "type": "object", "propertyNames": { "$ref": "#/$defs/core_area" }, "additionalProperties": { "$ref": "#/$defs/coverage_entry" } }, "coverage": { "type": "object", "propertyNames": { "$ref": "#/$defs/coverage_id", "not": { "pattern": "^core\\." } }, "additionalProperties": { "$ref": "#/$defs/coverage_entry" } }, "facts": { "type": "object", "propertyNames": { "enum": ["rule_clarity", "input_digital", "input_structured", "ways_done", "stability", "documentation", "steps_apps", "access", "value", "ai_applies", "eval_ability", "error_cost", "human_review", "simpler_option", "fallback", "sensitive_data", "push", "pull", "anxiety", "habit", "existing_asset", "decision_depends", "broken_cause", "workaround_permanent", "success_metric"] }, "additionalProperties": { "$ref": "#/$defs/fact_entry" } }, "prose": { "type": "object", "additionalProperties": false, "properties": { "problem_statement": { "type": "string", "minLength": 1 }, "current_state": { "type": "string", "minLength": 1 }, "mvp": { "type": "string", "minLength": 1 }, "out_of_scope": { "type": "string", "minLength": 1 }, "mitigation": { "type": "string", "minLength": 1 } } }, "acceptance": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["kind", "given", "when", "then", "evidence"], "properties": { "kind": { "enum": ["criterion", "error_case"] }, "given": { "type": "string", "minLength": 1 }, "when": { "type": "string", "minLength": 1 }, "then": { "type": "string", "minLength": 1 }, "evidence": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/coverage_id" } } } } }, "guardrails": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["kind", "text", "evidence"], "properties": { "kind": { "enum": ["kill_criterion", "fallback", "review_point", "data_rule"] }, "text": { "type": "string", "minLength": 1 }, "evidence": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/coverage_id" } } } } }, "scoring": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/scoring" }], "description": "Written by code only. Null until the reflect-back is confirmed." }, "gate": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/gate" }], "description": "Written by code only. Null until scored." }, "open_questions": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["area", "question", "who_can_answer", "artifact_needed"], "properties": { "area": { "$ref": "#/$defs/coverage_id" }, "question": { "type": "string", "minLength": 1 }, "who_can_answer": { "type": ["string", "null"] }, "artifact_needed": { "type": ["string", "null"] } } } } }, "allOf": [{ "description": "A gate needs scoring first.", "if": { "properties": { "gate": { "type": "object" } }, "required": ["gate"] }, "then": { "properties": { "scoring": { "type": "object" } } } }] }, "scoring": { "type": "object", "additionalProperties": false, "required": ["criteria", "automation_potential", "ease", "quadrant", "ai_overlay", "adoption", "rules_version"], "properties": { "criteria": { "type": "object", "propertyNames": { "enum": ["rule_clarity", "input_digital", "input_structured", "ways_done", "stability", "documentation", "steps_apps", "access", "value"] }, "additionalProperties": { "type": "object", "additionalProperties": false, "required": ["score", "band", "evidence"], "properties": { "score": { "type": ["integer", "null"], "minimum": 1, "maximum": 5 }, "band": { "type": "string" }, "evidence": { "type": "array", "items": { "$ref": "#/$defs/coverage_id" } } } } }, "automation_potential": { "type": ["number", "null"], "minimum": 1, "maximum": 5 }, "ease": { "type": ["number", "null"], "minimum": 1, "maximum": 5 }, "quadrant": { "enum": ["prioritize", "review", "defer", null] }, "ai_overlay": { "type": "object", "additionalProperties": false, "required": ["applies", "checks"], "properties": { "applies": { "type": "boolean" }, "checks": { "type": "object", "propertyNames": { "enum": ["eval_ability", "error_cost", "human_review", "simpler_option", "fallback", "sensitive_data"] }, "additionalProperties": { "enum": ["pass", "fail", "unknown"] } } } }, "adoption": { "oneOf": [{ "type": "null" }, { "type": "object", "additionalProperties": false, "required": ["push", "pull", "anxiety", "habit"], "properties": { "push": { "enum": ["low", "med", "high", "unknown"] }, "pull": { "enum": ["low", "med", "high", "unknown"] }, "anxiety": { "enum": ["low", "med", "high", "unknown"] }, "habit": { "enum": ["low", "med", "high", "unknown"] } } }] }, "rules_version": { "$ref": "#/$defs/semver" } } }, "gate": { "type": "object", "additionalProperties": false, "required": ["decision", "reasons", "revisit_trigger", "rules_version"], "properties": { "decision": { "enum": ["go", "gather_more", "dont_build", "fix_not_build"] }, "reasons": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }, "revisit_trigger": { "type": ["string", "null"] }, "rules_version": { "$ref": "#/$defs/semver" } }, "allOf": [{ "description": "Don't build always records what would make it worth revisiting.", "if": { "properties": { "decision": { "const": "dont_build" } } }, "then": { "properties": { "revisit_trigger": { "type": "string", "minLength": 1 } } } }] } } };
var pattern32 = new RegExp("^\\d+\\.\\d+\\.\\d+$", "u");
function validate532(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate532.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data === "string") {
    if (!pattern32.test(data)) {
      const err0 = { instancePath, schemaPath: "#/pattern", keyword: "pattern", params: { pattern: "^\\d+\\.\\d+\\.\\d+$" }, message: 'must match pattern "^\\d+\\.\\d+\\.\\d+$"' };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate532.errors = vErrors;
  return errors === 0;
}
validate532.evaluated = { "dynamicProps": false, "dynamicItems": false };
var schema21 = { "description": "Status rules: covered needs a value and at least one quote; assumed needs a quote; unknown has a null value; probe_count is at most 1.", "type": "object", "additionalProperties": false, "required": ["status", "value", "quotes", "probe_count"], "properties": { "status": { "enum": ["covered", "assumed", "unknown", "not_applicable"] }, "value": { "type": ["string", "null"] }, "quotes": { "type": "array", "items": { "$ref": "#/$defs/quote" } }, "probe_count": { "type": "integer", "minimum": 0, "maximum": 1 }, "updated_at": { "type": "string", "format": "date-time" }, "source": { "enum": ["captured"], "description": "captured: the user's reply stored word for word because the interviewer didn't record the answer to its own question. Shown for confirmation, never used as scoring evidence." } }, "allOf": [{ "if": { "properties": { "status": { "const": "covered" } } }, "then": { "properties": { "value": { "type": "string", "minLength": 1 }, "quotes": { "type": "array", "minItems": 1 } } } }, { "if": { "properties": { "status": { "const": "assumed" } } }, "then": { "properties": { "quotes": { "type": "array", "minItems": 1 } } } }, { "if": { "properties": { "status": { "const": "unknown" } } }, "then": { "properties": { "value": { "type": "null" } } } }] };
var func12 = ucs2.default;
function validate562(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate562.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data === "string") {
    if (func12(data) < 1) {
      const err0 = { instancePath, schemaPath: "#/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate562.errors = vErrors;
  return errors === 0;
}
validate562.evaluated = { "dynamicProps": false, "dynamicItems": false };
var formats0 = formats.fullFormats["date-time"];
function validate55(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate55.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.status !== void 0) {
      if ("covered" !== data.status) {
        const err0 = {};
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.value !== void 0) {
        let data1 = data.value;
        if (typeof data1 === "string") {
          if (func12(data1) < 1) {
            const err1 = { instancePath: instancePath + "/value", schemaPath: "#/allOf/0/then/properties/value/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
            if (vErrors === null) {
              vErrors = [err1];
            } else {
              vErrors.push(err1);
            }
            errors++;
          }
        } else {
          const err2 = { instancePath: instancePath + "/value", schemaPath: "#/allOf/0/then/properties/value/type", keyword: "type", params: { type: "string" }, message: "must be string" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      }
      if (data.quotes !== void 0) {
        let data2 = data.quotes;
        if (Array.isArray(data2)) {
          if (data2.length < 1) {
            const err3 = { instancePath: instancePath + "/quotes", schemaPath: "#/allOf/0/then/properties/quotes/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
            if (vErrors === null) {
              vErrors = [err3];
            } else {
              vErrors.push(err3);
            }
            errors++;
          }
        } else {
          const err4 = { instancePath: instancePath + "/quotes", schemaPath: "#/allOf/0/then/properties/quotes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
    if (valid1) {
      var props0 = {};
      props0.value = true;
      props0.quotes = true;
      props0.status = true;
    }
  }
  if (!valid1) {
    const err5 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err5];
    } else {
      vErrors.push(err5);
    }
    errors++;
  }
  const _errs11 = errors;
  let valid4 = true;
  const _errs12 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.status !== void 0) {
      if ("assumed" !== data.status) {
        const err6 = {};
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
  }
  var _valid1 = _errs12 === errors;
  errors = _errs11;
  if (vErrors !== null) {
    if (_errs11) {
      vErrors.length = _errs11;
    } else {
      vErrors = null;
    }
  }
  if (_valid1) {
    const _errs14 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.quotes !== void 0) {
        let data4 = data.quotes;
        if (Array.isArray(data4)) {
          if (data4.length < 1) {
            const err7 = { instancePath: instancePath + "/quotes", schemaPath: "#/allOf/1/then/properties/quotes/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        } else {
          const err8 = { instancePath: instancePath + "/quotes", schemaPath: "#/allOf/1/then/properties/quotes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      }
    }
    var _valid1 = _errs14 === errors;
    valid4 = _valid1;
    if (valid4) {
      var props1 = {};
      props1.quotes = true;
      props1.status = true;
    }
  }
  if (!valid4) {
    const err9 = { instancePath, schemaPath: "#/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err9];
    } else {
      vErrors.push(err9);
    }
    errors++;
  }
  if (props0 !== true && props1 !== void 0) {
    if (props1 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props1);
    }
  }
  const _errs18 = errors;
  let valid7 = true;
  const _errs19 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.status !== void 0) {
      if ("unknown" !== data.status) {
        const err10 = {};
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
  }
  var _valid2 = _errs19 === errors;
  errors = _errs18;
  if (vErrors !== null) {
    if (_errs18) {
      vErrors.length = _errs18;
    } else {
      vErrors = null;
    }
  }
  if (_valid2) {
    const _errs21 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.value !== void 0) {
        if (data.value !== null) {
          const err11 = { instancePath: instancePath + "/value", schemaPath: "#/allOf/2/then/properties/value/type", keyword: "type", params: { type: "null" }, message: "must be null" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
      }
    }
    var _valid2 = _errs21 === errors;
    valid7 = _valid2;
    if (valid7) {
      var props2 = {};
      props2.value = true;
      props2.status = true;
    }
  }
  if (!valid7) {
    const err12 = { instancePath, schemaPath: "#/allOf/2/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  }
  if (props0 !== true && props2 !== void 0) {
    if (props2 === true) {
      props0 = true;
    } else {
      props0 = props0 || {};
      Object.assign(props0, props2);
    }
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.status === void 0) {
      const err13 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
      if (vErrors === null) {
        vErrors = [err13];
      } else {
        vErrors.push(err13);
      }
      errors++;
    }
    if (data.value === void 0) {
      const err14 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "value" }, message: "must have required property 'value'" };
      if (vErrors === null) {
        vErrors = [err14];
      } else {
        vErrors.push(err14);
      }
      errors++;
    }
    if (data.quotes === void 0) {
      const err15 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quotes" }, message: "must have required property 'quotes'" };
      if (vErrors === null) {
        vErrors = [err15];
      } else {
        vErrors.push(err15);
      }
      errors++;
    }
    if (data.probe_count === void 0) {
      const err16 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "probe_count" }, message: "must have required property 'probe_count'" };
      if (vErrors === null) {
        vErrors = [err16];
      } else {
        vErrors.push(err16);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "status" || key0 === "value" || key0 === "quotes" || key0 === "probe_count" || key0 === "updated_at" || key0 === "source")) {
        const err17 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.status !== void 0) {
      let data7 = data.status;
      if (!(data7 === "covered" || data7 === "assumed" || data7 === "unknown" || data7 === "not_applicable")) {
        const err18 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/enum", keyword: "enum", params: { allowedValues: schema21.properties.status.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.value !== void 0) {
      let data8 = data.value;
      if (typeof data8 !== "string" && data8 !== null) {
        const err19 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/type", keyword: "type", params: { type: schema21.properties.value.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
    if (data.quotes !== void 0) {
      let data9 = data.quotes;
      if (Array.isArray(data9)) {
        const len0 = data9.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate562(data9[i0], { instancePath: instancePath + "/quotes/" + i0, parentData: data9, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate562.errors : vErrors.concat(validate562.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err20 = { instancePath: instancePath + "/quotes", schemaPath: "#/properties/quotes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
    }
    if (data.probe_count !== void 0) {
      let data11 = data.probe_count;
      if (!(typeof data11 == "number" && (!(data11 % 1) && !isNaN(data11)) && isFinite(data11))) {
        const err21 = { instancePath: instancePath + "/probe_count", schemaPath: "#/properties/probe_count/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
      if (typeof data11 == "number" && isFinite(data11)) {
        if (data11 > 1 || isNaN(data11)) {
          const err22 = { instancePath: instancePath + "/probe_count", schemaPath: "#/properties/probe_count/maximum", keyword: "maximum", params: { comparison: "<=", limit: 1 }, message: "must be <= 1" };
          if (vErrors === null) {
            vErrors = [err22];
          } else {
            vErrors.push(err22);
          }
          errors++;
        }
        if (data11 < 0 || isNaN(data11)) {
          const err23 = { instancePath: instancePath + "/probe_count", schemaPath: "#/properties/probe_count/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
          if (vErrors === null) {
            vErrors = [err23];
          } else {
            vErrors.push(err23);
          }
          errors++;
        }
      }
    }
    if (data.updated_at !== void 0) {
      let data12 = data.updated_at;
      if (typeof data12 === "string") {
        if (!formats0.validate(data12)) {
          const err24 = { instancePath: instancePath + "/updated_at", schemaPath: "#/properties/updated_at/format", keyword: "format", params: { format: "date-time" }, message: 'must match format "date-time"' };
          if (vErrors === null) {
            vErrors = [err24];
          } else {
            vErrors.push(err24);
          }
          errors++;
        }
      } else {
        const err25 = { instancePath: instancePath + "/updated_at", schemaPath: "#/properties/updated_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
    if (data.source !== void 0) {
      if (!(data.source === "captured")) {
        const err26 = { instancePath: instancePath + "/source", schemaPath: "#/properties/source/enum", keyword: "enum", params: { allowedValues: schema21.properties.source.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err26];
        } else {
          vErrors.push(err26);
        }
        errors++;
      }
    }
  } else {
    const err27 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err27];
    } else {
      vErrors.push(err27);
    }
    errors++;
  }
  validate55.errors = vErrors;
  return errors === 0;
}
validate55.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema23 = { "type": "object", "additionalProperties": false, "required": ["id", "title", "type", "confidence", "trigger_quote", "modifiers", "spawned_from", "superseded_by", "type_history", "core_overrides", "coverage", "facts", "prose", "acceptance", "guardrails", "scoring", "gate", "open_questions"], "properties": { "id": { "$ref": "#/$defs/item_id" }, "title": { "type": "string", "minLength": 1 }, "type": { "$ref": "#/$defs/item_type" }, "confidence": { "enum": ["high", "med", "low"] }, "trigger_quote": { "$ref": "#/$defs/quote" }, "modifiers": { "type": "array", "uniqueItems": true, "items": { "enum": ["integration", "compliance", "migration"] } }, "spawned_from": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/item_id" }] }, "superseded_by": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/item_id" }] }, "modifiers_removed": { "description": "Modifiers taken back during the interview, so they aren't suggested again.", "type": "array", "items": { "enum": ["integration", "compliance", "migration"] } }, "dropped": { "description": "Set when the item turned out not to apply (the user said so). Gated Don't build with the reason; never confused with being replaced by another item.", "type": "object", "additionalProperties": false, "required": ["reason", "quote", "at"], "properties": { "reason": { "type": "string", "minLength": 1 }, "quote": { "$ref": "#/$defs/quote" }, "at": { "type": "string", "format": "date-time" } } }, "type_history": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["from", "to", "reason", "quote", "at"], "properties": { "from": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/item_type" }] }, "to": { "$ref": "#/$defs/item_type" }, "reason": { "type": "string", "minLength": 1 }, "quote": { "$ref": "#/$defs/quote" }, "at": { "type": "string", "format": "date-time" } } } }, "core_overrides": { "type": "object", "propertyNames": { "$ref": "#/$defs/core_area" }, "additionalProperties": { "$ref": "#/$defs/coverage_entry" } }, "coverage": { "type": "object", "propertyNames": { "$ref": "#/$defs/coverage_id", "not": { "pattern": "^core\\." } }, "additionalProperties": { "$ref": "#/$defs/coverage_entry" } }, "facts": { "type": "object", "propertyNames": { "enum": ["rule_clarity", "input_digital", "input_structured", "ways_done", "stability", "documentation", "steps_apps", "access", "value", "ai_applies", "eval_ability", "error_cost", "human_review", "simpler_option", "fallback", "sensitive_data", "push", "pull", "anxiety", "habit", "existing_asset", "decision_depends", "broken_cause", "workaround_permanent", "success_metric"] }, "additionalProperties": { "$ref": "#/$defs/fact_entry" } }, "prose": { "type": "object", "additionalProperties": false, "properties": { "problem_statement": { "type": "string", "minLength": 1 }, "current_state": { "type": "string", "minLength": 1 }, "mvp": { "type": "string", "minLength": 1 }, "out_of_scope": { "type": "string", "minLength": 1 }, "mitigation": { "type": "string", "minLength": 1 } } }, "acceptance": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["kind", "given", "when", "then", "evidence"], "properties": { "kind": { "enum": ["criterion", "error_case"] }, "given": { "type": "string", "minLength": 1 }, "when": { "type": "string", "minLength": 1 }, "then": { "type": "string", "minLength": 1 }, "evidence": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/coverage_id" } } } } }, "guardrails": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["kind", "text", "evidence"], "properties": { "kind": { "enum": ["kill_criterion", "fallback", "review_point", "data_rule"] }, "text": { "type": "string", "minLength": 1 }, "evidence": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/coverage_id" } } } } }, "scoring": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/scoring" }], "description": "Written by code only. Null until the reflect-back is confirmed." }, "gate": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/gate" }], "description": "Written by code only. Null until scored." }, "open_questions": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["area", "question", "who_can_answer", "artifact_needed"], "properties": { "area": { "$ref": "#/$defs/coverage_id" }, "question": { "type": "string", "minLength": 1 }, "who_can_answer": { "type": ["string", "null"] }, "artifact_needed": { "type": ["string", "null"] } } } } }, "allOf": [{ "description": "A gate needs scoring first.", "if": { "properties": { "gate": { "type": "object" } }, "required": ["gate"] }, "then": { "properties": { "scoring": { "type": "object" } } } }] };
var func5 = Object.prototype.hasOwnProperty;
var func02 = equal.default;
var pattern62 = new RegExp("^item-\\d+$", "u");
function validate652(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate652.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data === "string") {
    if (!pattern62.test(data)) {
      const err0 = { instancePath, schemaPath: "#/pattern", keyword: "pattern", params: { pattern: "^item-\\d+$" }, message: 'must match pattern "^item-\\d+$"' };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate652.errors = vErrors;
  return errors === 0;
}
validate652.evaluated = { "dynamicProps": false, "dynamicItems": false };
var schema252 = { "enum": ["broken", "manual_process", "known_idea", "exploratory", "data_report"] };
function validate67(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate67.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data === "broken" || data === "manual_process" || data === "known_idea" || data === "exploratory" || data === "data_report")) {
    const err0 = { instancePath, schemaPath: "#/enum", keyword: "enum", params: { allowedValues: schema252.enum }, message: "must be equal to one of the allowed values" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate67.errors = vErrors;
  return errors === 0;
}
validate67.evaluated = { "dynamicProps": false, "dynamicItems": false };
var schema262 = { "enum": ["users", "outcome", "data", "systems", "constraints", "trust"] };
function validate762(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate762.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (!(data === "users" || data === "outcome" || data === "data" || data === "systems" || data === "constraints" || data === "trust")) {
    const err0 = { instancePath, schemaPath: "#/enum", keyword: "enum", params: { allowedValues: schema262.enum }, message: "must be equal to one of the allowed values" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  validate762.errors = vErrors;
  return errors === 0;
}
validate762.evaluated = { "dynamicProps": false, "dynamicItems": false };
var pattern72 = new RegExp("^(core|broken|manual_process|known_idea|exploratory|data_report)\\.[a-z][a-z0-9_]*$|^mod\\.(integration|compliance|migration)\\.[a-z][a-z0-9_]*$", "u");
function validate79(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate79.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (typeof data === "string") {
    if (!pattern72.test(data)) {
      const err0 = { instancePath, schemaPath: "#/pattern", keyword: "pattern", params: { pattern: "^(core|broken|manual_process|known_idea|exploratory|data_report)\\.[a-z][a-z0-9_]*$|^mod\\.(integration|compliance|migration)\\.[a-z][a-z0-9_]*$" }, message: 'must match pattern "^(core|broken|manual_process|known_idea|exploratory|data_report)\\.[a-z][a-z0-9_]*$|^mod\\.(integration|compliance|migration)\\.[a-z][a-z0-9_]*$"' };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
  } else {
    const err1 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate79.errors = vErrors;
  return errors === 0;
}
validate79.evaluated = { "dynamicProps": false, "dynamicItems": false };
var pattern9 = new RegExp("^[a-z0-9][a-z0-9_+-]*$", "u");
function validate822(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate822.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.band === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "band" }, message: "must have required property 'band'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.evidence === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.quotes === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quotes" }, message: "must have required property 'quotes'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "band" || key0 === "evidence" || key0 === "quotes")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.band !== void 0) {
      let data0 = data.band;
      if (typeof data0 === "string") {
        if (!pattern9.test(data0)) {
          const err4 = { instancePath: instancePath + "/band", schemaPath: "#/properties/band/pattern", keyword: "pattern", params: { pattern: "^[a-z0-9][a-z0-9_+-]*$" }, message: 'must match pattern "^[a-z0-9][a-z0-9_+-]*$"' };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = { instancePath: instancePath + "/band", schemaPath: "#/properties/band/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.evidence !== void 0) {
      let data1 = data.evidence;
      if (Array.isArray(data1)) {
        const len0 = data1.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate79(data1[i0], { instancePath: instancePath + "/evidence/" + i0, parentData: data1, parentDataProperty: i0, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err6 = { instancePath: instancePath + "/evidence", schemaPath: "#/properties/evidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.quotes !== void 0) {
      let data3 = data.quotes;
      if (Array.isArray(data3)) {
        const len1 = data3.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate562(data3[i1], { instancePath: instancePath + "/quotes/" + i1, parentData: data3, parentDataProperty: i1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate562.errors : vErrors.concat(validate562.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err7 = { instancePath: instancePath + "/quotes", schemaPath: "#/properties/quotes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
  } else {
    const err8 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err8];
    } else {
      vErrors.push(err8);
    }
    errors++;
  }
  validate822.errors = vErrors;
  return errors === 0;
}
validate822.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema29 = { "type": "object", "additionalProperties": false, "required": ["criteria", "automation_potential", "ease", "quadrant", "ai_overlay", "adoption", "rules_version"], "properties": { "criteria": { "type": "object", "propertyNames": { "enum": ["rule_clarity", "input_digital", "input_structured", "ways_done", "stability", "documentation", "steps_apps", "access", "value"] }, "additionalProperties": { "type": "object", "additionalProperties": false, "required": ["score", "band", "evidence"], "properties": { "score": { "type": ["integer", "null"], "minimum": 1, "maximum": 5 }, "band": { "type": "string" }, "evidence": { "type": "array", "items": { "$ref": "#/$defs/coverage_id" } } } } }, "automation_potential": { "type": ["number", "null"], "minimum": 1, "maximum": 5 }, "ease": { "type": ["number", "null"], "minimum": 1, "maximum": 5 }, "quadrant": { "enum": ["prioritize", "review", "defer", null] }, "ai_overlay": { "type": "object", "additionalProperties": false, "required": ["applies", "checks"], "properties": { "applies": { "type": "boolean" }, "checks": { "type": "object", "propertyNames": { "enum": ["eval_ability", "error_cost", "human_review", "simpler_option", "fallback", "sensitive_data"] }, "additionalProperties": { "enum": ["pass", "fail", "unknown"] } } } }, "adoption": { "oneOf": [{ "type": "null" }, { "type": "object", "additionalProperties": false, "required": ["push", "pull", "anxiety", "habit"], "properties": { "push": { "enum": ["low", "med", "high", "unknown"] }, "pull": { "enum": ["low", "med", "high", "unknown"] }, "anxiety": { "enum": ["low", "med", "high", "unknown"] }, "habit": { "enum": ["low", "med", "high", "unknown"] } } }] }, "rules_version": { "$ref": "#/$defs/semver" } } };
function validate88(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate88.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.criteria === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "criteria" }, message: "must have required property 'criteria'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.automation_potential === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "automation_potential" }, message: "must have required property 'automation_potential'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.ease === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "ease" }, message: "must have required property 'ease'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.quadrant === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quadrant" }, message: "must have required property 'quadrant'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.ai_overlay === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "ai_overlay" }, message: "must have required property 'ai_overlay'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.adoption === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "adoption" }, message: "must have required property 'adoption'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.rules_version === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "rules_version" }, message: "must have required property 'rules_version'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "criteria" || key0 === "automation_potential" || key0 === "ease" || key0 === "quadrant" || key0 === "ai_overlay" || key0 === "adoption" || key0 === "rules_version")) {
        const err7 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.criteria !== void 0) {
      let data0 = data.criteria;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        for (const key1 in data0) {
          const _errs4 = errors;
          if (!(key1 === "rule_clarity" || key1 === "input_digital" || key1 === "input_structured" || key1 === "ways_done" || key1 === "stability" || key1 === "documentation" || key1 === "steps_apps" || key1 === "access" || key1 === "value")) {
            const err8 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/propertyNames/enum", keyword: "enum", params: { allowedValues: schema29.properties.criteria.propertyNames.enum }, message: "must be equal to one of the allowed values", propertyName: key1 };
            if (vErrors === null) {
              vErrors = [err8];
            } else {
              vErrors.push(err8);
            }
            errors++;
          }
          var valid1 = _errs4 === errors;
          if (!valid1) {
            const err9 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/propertyNames", keyword: "propertyNames", params: { propertyName: key1 }, message: "property name must be valid" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
        for (const key2 in data0) {
          let data1 = data0[key2];
          if (data1 && typeof data1 == "object" && !Array.isArray(data1)) {
            if (data1.score === void 0) {
              const err10 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/required", keyword: "required", params: { missingProperty: "score" }, message: "must have required property 'score'" };
              if (vErrors === null) {
                vErrors = [err10];
              } else {
                vErrors.push(err10);
              }
              errors++;
            }
            if (data1.band === void 0) {
              const err11 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/required", keyword: "required", params: { missingProperty: "band" }, message: "must have required property 'band'" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
            if (data1.evidence === void 0) {
              const err12 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
            for (const key3 in data1) {
              if (!(key3 === "score" || key3 === "band" || key3 === "evidence")) {
                const err13 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
              }
            }
            if (data1.score !== void 0) {
              let data2 = data1.score;
              if (!(typeof data2 == "number" && (!(data2 % 1) && !isNaN(data2)) && isFinite(data2)) && data2 !== null) {
                const err14 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/score", schemaPath: "#/properties/criteria/additionalProperties/properties/score/type", keyword: "type", params: { type: schema29.properties.criteria.additionalProperties.properties.score.type }, message: "must be integer,null" };
                if (vErrors === null) {
                  vErrors = [err14];
                } else {
                  vErrors.push(err14);
                }
                errors++;
              }
              if (typeof data2 == "number" && isFinite(data2)) {
                if (data2 > 5 || isNaN(data2)) {
                  const err15 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/score", schemaPath: "#/properties/criteria/additionalProperties/properties/score/maximum", keyword: "maximum", params: { comparison: "<=", limit: 5 }, message: "must be <= 5" };
                  if (vErrors === null) {
                    vErrors = [err15];
                  } else {
                    vErrors.push(err15);
                  }
                  errors++;
                }
                if (data2 < 1 || isNaN(data2)) {
                  const err16 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/score", schemaPath: "#/properties/criteria/additionalProperties/properties/score/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
                  if (vErrors === null) {
                    vErrors = [err16];
                  } else {
                    vErrors.push(err16);
                  }
                  errors++;
                }
              }
            }
            if (data1.band !== void 0) {
              if (typeof data1.band !== "string") {
                const err17 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/band", schemaPath: "#/properties/criteria/additionalProperties/properties/band/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data1.evidence !== void 0) {
              let data4 = data1.evidence;
              if (Array.isArray(data4)) {
                const len0 = data4.length;
                for (let i0 = 0; i0 < len0; i0++) {
                  if (!validate79(data4[i0], { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/evidence/" + i0, parentData: data4, parentDataProperty: i0, rootData, dynamicAnchors })) {
                    vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
                    errors = vErrors.length;
                  }
                }
              } else {
                const err18 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1") + "/evidence", schemaPath: "#/properties/criteria/additionalProperties/properties/evidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
          } else {
            const err19 = { instancePath: instancePath + "/criteria/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/criteria/additionalProperties/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
        }
      } else {
        const err20 = { instancePath: instancePath + "/criteria", schemaPath: "#/properties/criteria/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
    }
    if (data.automation_potential !== void 0) {
      let data6 = data.automation_potential;
      if (!(typeof data6 == "number" && isFinite(data6)) && data6 !== null) {
        const err21 = { instancePath: instancePath + "/automation_potential", schemaPath: "#/properties/automation_potential/type", keyword: "type", params: { type: schema29.properties.automation_potential.type }, message: "must be number,null" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
      if (typeof data6 == "number" && isFinite(data6)) {
        if (data6 > 5 || isNaN(data6)) {
          const err22 = { instancePath: instancePath + "/automation_potential", schemaPath: "#/properties/automation_potential/maximum", keyword: "maximum", params: { comparison: "<=", limit: 5 }, message: "must be <= 5" };
          if (vErrors === null) {
            vErrors = [err22];
          } else {
            vErrors.push(err22);
          }
          errors++;
        }
        if (data6 < 1 || isNaN(data6)) {
          const err23 = { instancePath: instancePath + "/automation_potential", schemaPath: "#/properties/automation_potential/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
          if (vErrors === null) {
            vErrors = [err23];
          } else {
            vErrors.push(err23);
          }
          errors++;
        }
      }
    }
    if (data.ease !== void 0) {
      let data7 = data.ease;
      if (!(typeof data7 == "number" && isFinite(data7)) && data7 !== null) {
        const err24 = { instancePath: instancePath + "/ease", schemaPath: "#/properties/ease/type", keyword: "type", params: { type: schema29.properties.ease.type }, message: "must be number,null" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
      if (typeof data7 == "number" && isFinite(data7)) {
        if (data7 > 5 || isNaN(data7)) {
          const err25 = { instancePath: instancePath + "/ease", schemaPath: "#/properties/ease/maximum", keyword: "maximum", params: { comparison: "<=", limit: 5 }, message: "must be <= 5" };
          if (vErrors === null) {
            vErrors = [err25];
          } else {
            vErrors.push(err25);
          }
          errors++;
        }
        if (data7 < 1 || isNaN(data7)) {
          const err26 = { instancePath: instancePath + "/ease", schemaPath: "#/properties/ease/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
          if (vErrors === null) {
            vErrors = [err26];
          } else {
            vErrors.push(err26);
          }
          errors++;
        }
      }
    }
    if (data.quadrant !== void 0) {
      let data8 = data.quadrant;
      if (!(data8 === "prioritize" || data8 === "review" || data8 === "defer" || data8 === null)) {
        const err27 = { instancePath: instancePath + "/quadrant", schemaPath: "#/properties/quadrant/enum", keyword: "enum", params: { allowedValues: schema29.properties.quadrant.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err27];
        } else {
          vErrors.push(err27);
        }
        errors++;
      }
    }
    if (data.ai_overlay !== void 0) {
      let data9 = data.ai_overlay;
      if (data9 && typeof data9 == "object" && !Array.isArray(data9)) {
        if (data9.applies === void 0) {
          const err28 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/required", keyword: "required", params: { missingProperty: "applies" }, message: "must have required property 'applies'" };
          if (vErrors === null) {
            vErrors = [err28];
          } else {
            vErrors.push(err28);
          }
          errors++;
        }
        if (data9.checks === void 0) {
          const err29 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/required", keyword: "required", params: { missingProperty: "checks" }, message: "must have required property 'checks'" };
          if (vErrors === null) {
            vErrors = [err29];
          } else {
            vErrors.push(err29);
          }
          errors++;
        }
        for (const key4 in data9) {
          if (!(key4 === "applies" || key4 === "checks")) {
            const err30 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key4 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
        if (data9.applies !== void 0) {
          if (typeof data9.applies !== "boolean") {
            const err31 = { instancePath: instancePath + "/ai_overlay/applies", schemaPath: "#/properties/ai_overlay/properties/applies/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
        if (data9.checks !== void 0) {
          let data11 = data9.checks;
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            for (const key5 in data11) {
              const _errs28 = errors;
              if (!(key5 === "eval_ability" || key5 === "error_cost" || key5 === "human_review" || key5 === "simpler_option" || key5 === "fallback" || key5 === "sensitive_data")) {
                const err32 = { instancePath: instancePath + "/ai_overlay/checks", schemaPath: "#/properties/ai_overlay/properties/checks/propertyNames/enum", keyword: "enum", params: { allowedValues: schema29.properties.ai_overlay.properties.checks.propertyNames.enum }, message: "must be equal to one of the allowed values", propertyName: key5 };
                if (vErrors === null) {
                  vErrors = [err32];
                } else {
                  vErrors.push(err32);
                }
                errors++;
              }
              var valid7 = _errs28 === errors;
              if (!valid7) {
                const err33 = { instancePath: instancePath + "/ai_overlay/checks", schemaPath: "#/properties/ai_overlay/properties/checks/propertyNames", keyword: "propertyNames", params: { propertyName: key5 }, message: "property name must be valid" };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
            for (const key6 in data11) {
              let data12 = data11[key6];
              if (!(data12 === "pass" || data12 === "fail" || data12 === "unknown")) {
                const err34 = { instancePath: instancePath + "/ai_overlay/checks/" + key6.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/ai_overlay/properties/checks/additionalProperties/enum", keyword: "enum", params: { allowedValues: schema29.properties.ai_overlay.properties.checks.additionalProperties.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err34];
                } else {
                  vErrors.push(err34);
                }
                errors++;
              }
            }
          } else {
            const err35 = { instancePath: instancePath + "/ai_overlay/checks", schemaPath: "#/properties/ai_overlay/properties/checks/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err35];
            } else {
              vErrors.push(err35);
            }
            errors++;
          }
        }
      } else {
        const err36 = { instancePath: instancePath + "/ai_overlay", schemaPath: "#/properties/ai_overlay/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err36];
        } else {
          vErrors.push(err36);
        }
        errors++;
      }
    }
    if (data.adoption !== void 0) {
      let data13 = data.adoption;
      const _errs32 = errors;
      let valid9 = false;
      let passing0 = null;
      const _errs33 = errors;
      if (data13 !== null) {
        const err37 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err37];
        } else {
          vErrors.push(err37);
        }
        errors++;
      }
      var _valid0 = _errs33 === errors;
      if (_valid0) {
        valid9 = true;
        passing0 = 0;
      }
      const _errs35 = errors;
      if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
        if (data13.push === void 0) {
          const err38 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/oneOf/1/required", keyword: "required", params: { missingProperty: "push" }, message: "must have required property 'push'" };
          if (vErrors === null) {
            vErrors = [err38];
          } else {
            vErrors.push(err38);
          }
          errors++;
        }
        if (data13.pull === void 0) {
          const err39 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/oneOf/1/required", keyword: "required", params: { missingProperty: "pull" }, message: "must have required property 'pull'" };
          if (vErrors === null) {
            vErrors = [err39];
          } else {
            vErrors.push(err39);
          }
          errors++;
        }
        if (data13.anxiety === void 0) {
          const err40 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/oneOf/1/required", keyword: "required", params: { missingProperty: "anxiety" }, message: "must have required property 'anxiety'" };
          if (vErrors === null) {
            vErrors = [err40];
          } else {
            vErrors.push(err40);
          }
          errors++;
        }
        if (data13.habit === void 0) {
          const err41 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/oneOf/1/required", keyword: "required", params: { missingProperty: "habit" }, message: "must have required property 'habit'" };
          if (vErrors === null) {
            vErrors = [err41];
          } else {
            vErrors.push(err41);
          }
          errors++;
        }
        for (const key7 in data13) {
          if (!(key7 === "push" || key7 === "pull" || key7 === "anxiety" || key7 === "habit")) {
            const err42 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/oneOf/1/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key7 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err42];
            } else {
              vErrors.push(err42);
            }
            errors++;
          }
        }
        if (data13.push !== void 0) {
          let data14 = data13.push;
          if (!(data14 === "low" || data14 === "med" || data14 === "high" || data14 === "unknown")) {
            const err43 = { instancePath: instancePath + "/adoption/push", schemaPath: "#/properties/adoption/oneOf/1/properties/push/enum", keyword: "enum", params: { allowedValues: schema29.properties.adoption.oneOf[1].properties.push.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err43];
            } else {
              vErrors.push(err43);
            }
            errors++;
          }
        }
        if (data13.pull !== void 0) {
          let data15 = data13.pull;
          if (!(data15 === "low" || data15 === "med" || data15 === "high" || data15 === "unknown")) {
            const err44 = { instancePath: instancePath + "/adoption/pull", schemaPath: "#/properties/adoption/oneOf/1/properties/pull/enum", keyword: "enum", params: { allowedValues: schema29.properties.adoption.oneOf[1].properties.pull.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          }
        }
        if (data13.anxiety !== void 0) {
          let data16 = data13.anxiety;
          if (!(data16 === "low" || data16 === "med" || data16 === "high" || data16 === "unknown")) {
            const err45 = { instancePath: instancePath + "/adoption/anxiety", schemaPath: "#/properties/adoption/oneOf/1/properties/anxiety/enum", keyword: "enum", params: { allowedValues: schema29.properties.adoption.oneOf[1].properties.anxiety.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err45];
            } else {
              vErrors.push(err45);
            }
            errors++;
          }
        }
        if (data13.habit !== void 0) {
          let data17 = data13.habit;
          if (!(data17 === "low" || data17 === "med" || data17 === "high" || data17 === "unknown")) {
            const err46 = { instancePath: instancePath + "/adoption/habit", schemaPath: "#/properties/adoption/oneOf/1/properties/habit/enum", keyword: "enum", params: { allowedValues: schema29.properties.adoption.oneOf[1].properties.habit.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err46];
            } else {
              vErrors.push(err46);
            }
            errors++;
          }
        }
      } else {
        const err47 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/oneOf/1/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err47];
        } else {
          vErrors.push(err47);
        }
        errors++;
      }
      var _valid0 = _errs35 === errors;
      if (_valid0 && valid9) {
        valid9 = false;
        passing0 = [passing0, 1];
      } else {
        if (_valid0) {
          valid9 = true;
          passing0 = 1;
        }
      }
      if (!valid9) {
        const err48 = { instancePath: instancePath + "/adoption", schemaPath: "#/properties/adoption/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err48];
        } else {
          vErrors.push(err48);
        }
        errors++;
      } else {
        errors = _errs32;
        if (vErrors !== null) {
          if (_errs32) {
            vErrors.length = _errs32;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.rules_version !== void 0) {
      if (!validate532(data.rules_version, { instancePath: instancePath + "/rules_version", parentData: data, parentDataProperty: "rules_version", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate532.errors : vErrors.concat(validate532.errors);
        errors = vErrors.length;
      }
    }
  } else {
    const err49 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err49];
    } else {
      vErrors.push(err49);
    }
    errors++;
  }
  validate88.errors = vErrors;
  return errors === 0;
}
validate88.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var schema30 = { "type": "object", "additionalProperties": false, "required": ["decision", "reasons", "revisit_trigger", "rules_version"], "properties": { "decision": { "enum": ["go", "gather_more", "dont_build", "fix_not_build"] }, "reasons": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }, "revisit_trigger": { "type": ["string", "null"] }, "rules_version": { "$ref": "#/$defs/semver" } }, "allOf": [{ "description": "Don't build always records what would make it worth revisiting.", "if": { "properties": { "decision": { "const": "dont_build" } } }, "then": { "properties": { "revisit_trigger": { "type": "string", "minLength": 1 } } } }] };
function validate92(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate92.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.decision !== void 0) {
      if ("dont_build" !== data.decision) {
        const err0 = {};
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs5 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.revisit_trigger !== void 0) {
        let data1 = data.revisit_trigger;
        if (typeof data1 === "string") {
          if (func12(data1) < 1) {
            const err1 = { instancePath: instancePath + "/revisit_trigger", schemaPath: "#/allOf/0/then/properties/revisit_trigger/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
            if (vErrors === null) {
              vErrors = [err1];
            } else {
              vErrors.push(err1);
            }
            errors++;
          }
        } else {
          const err2 = { instancePath: instancePath + "/revisit_trigger", schemaPath: "#/allOf/0/then/properties/revisit_trigger/type", keyword: "type", params: { type: "string" }, message: "must be string" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      }
    }
    var _valid0 = _errs5 === errors;
    valid1 = _valid0;
    if (valid1) {
      var props0 = {};
      props0.revisit_trigger = true;
      props0.decision = true;
    }
  }
  if (!valid1) {
    const err3 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.decision === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "decision" }, message: "must have required property 'decision'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.reasons === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reasons" }, message: "must have required property 'reasons'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.revisit_trigger === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "revisit_trigger" }, message: "must have required property 'revisit_trigger'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.rules_version === void 0) {
      const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "rules_version" }, message: "must have required property 'rules_version'" };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "decision" || key0 === "reasons" || key0 === "revisit_trigger" || key0 === "rules_version")) {
        const err8 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.decision !== void 0) {
      let data2 = data.decision;
      if (!(data2 === "go" || data2 === "gather_more" || data2 === "dont_build" || data2 === "fix_not_build")) {
        const err9 = { instancePath: instancePath + "/decision", schemaPath: "#/properties/decision/enum", keyword: "enum", params: { allowedValues: schema30.properties.decision.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.reasons !== void 0) {
      let data3 = data.reasons;
      if (Array.isArray(data3)) {
        if (data3.length < 1) {
          const err10 = { instancePath: instancePath + "/reasons", schemaPath: "#/properties/reasons/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        const len0 = data3.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data4 = data3[i0];
          if (typeof data4 === "string") {
            if (func12(data4) < 1) {
              const err11 = { instancePath: instancePath + "/reasons/" + i0, schemaPath: "#/properties/reasons/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
          } else {
            const err12 = { instancePath: instancePath + "/reasons/" + i0, schemaPath: "#/properties/reasons/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/reasons", schemaPath: "#/properties/reasons/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.revisit_trigger !== void 0) {
      let data5 = data.revisit_trigger;
      if (typeof data5 !== "string" && data5 !== null) {
        const err14 = { instancePath: instancePath + "/revisit_trigger", schemaPath: "#/properties/revisit_trigger/type", keyword: "type", params: { type: schema30.properties.revisit_trigger.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.rules_version !== void 0) {
      if (!validate532(data.rules_version, { instancePath: instancePath + "/rules_version", parentData: data, parentDataProperty: "rules_version", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate532.errors : vErrors.concat(validate532.errors);
        errors = vErrors.length;
      }
    }
  } else {
    const err15 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err15];
    } else {
      vErrors.push(err15);
    }
    errors++;
  }
  validate92.errors = vErrors;
  return errors === 0;
}
validate92.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var pattern82 = new RegExp("^core\\.", "u");
function validate64(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate64.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  const _errs2 = errors;
  let valid1 = true;
  const _errs3 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    let missing0;
    if (data.gate === void 0 && (missing0 = "gate")) {
      const err0 = {};
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    } else {
      if (data.gate !== void 0) {
        let data0 = data.gate;
        if (!(data0 && typeof data0 == "object" && !Array.isArray(data0))) {
          const err1 = {};
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
      }
    }
  }
  var _valid0 = _errs3 === errors;
  errors = _errs2;
  if (vErrors !== null) {
    if (_errs2) {
      vErrors.length = _errs2;
    } else {
      vErrors = null;
    }
  }
  if (_valid0) {
    const _errs6 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.scoring !== void 0) {
        let data1 = data.scoring;
        if (!(data1 && typeof data1 == "object" && !Array.isArray(data1))) {
          const err2 = { instancePath: instancePath + "/scoring", schemaPath: "#/allOf/0/then/properties/scoring/type", keyword: "type", params: { type: "object" }, message: "must be object" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      }
    }
    var _valid0 = _errs6 === errors;
    valid1 = _valid0;
    if (valid1) {
      var props0 = {};
      props0.scoring = true;
      props0.gate = true;
    }
  }
  if (!valid1) {
    const err3 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.title === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "title" }, message: "must have required property 'title'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.type === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.confidence === void 0) {
      const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "confidence" }, message: "must have required property 'confidence'" };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data.trigger_quote === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "trigger_quote" }, message: "must have required property 'trigger_quote'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.modifiers === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "modifiers" }, message: "must have required property 'modifiers'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (data.spawned_from === void 0) {
      const err10 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "spawned_from" }, message: "must have required property 'spawned_from'" };
      if (vErrors === null) {
        vErrors = [err10];
      } else {
        vErrors.push(err10);
      }
      errors++;
    }
    if (data.superseded_by === void 0) {
      const err11 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "superseded_by" }, message: "must have required property 'superseded_by'" };
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
    if (data.type_history === void 0) {
      const err12 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type_history" }, message: "must have required property 'type_history'" };
      if (vErrors === null) {
        vErrors = [err12];
      } else {
        vErrors.push(err12);
      }
      errors++;
    }
    if (data.core_overrides === void 0) {
      const err13 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "core_overrides" }, message: "must have required property 'core_overrides'" };
      if (vErrors === null) {
        vErrors = [err13];
      } else {
        vErrors.push(err13);
      }
      errors++;
    }
    if (data.coverage === void 0) {
      const err14 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "coverage" }, message: "must have required property 'coverage'" };
      if (vErrors === null) {
        vErrors = [err14];
      } else {
        vErrors.push(err14);
      }
      errors++;
    }
    if (data.facts === void 0) {
      const err15 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "facts" }, message: "must have required property 'facts'" };
      if (vErrors === null) {
        vErrors = [err15];
      } else {
        vErrors.push(err15);
      }
      errors++;
    }
    if (data.prose === void 0) {
      const err16 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "prose" }, message: "must have required property 'prose'" };
      if (vErrors === null) {
        vErrors = [err16];
      } else {
        vErrors.push(err16);
      }
      errors++;
    }
    if (data.acceptance === void 0) {
      const err17 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "acceptance" }, message: "must have required property 'acceptance'" };
      if (vErrors === null) {
        vErrors = [err17];
      } else {
        vErrors.push(err17);
      }
      errors++;
    }
    if (data.guardrails === void 0) {
      const err18 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "guardrails" }, message: "must have required property 'guardrails'" };
      if (vErrors === null) {
        vErrors = [err18];
      } else {
        vErrors.push(err18);
      }
      errors++;
    }
    if (data.scoring === void 0) {
      const err19 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "scoring" }, message: "must have required property 'scoring'" };
      if (vErrors === null) {
        vErrors = [err19];
      } else {
        vErrors.push(err19);
      }
      errors++;
    }
    if (data.gate === void 0) {
      const err20 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "gate" }, message: "must have required property 'gate'" };
      if (vErrors === null) {
        vErrors = [err20];
      } else {
        vErrors.push(err20);
      }
      errors++;
    }
    if (data.open_questions === void 0) {
      const err21 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "open_questions" }, message: "must have required property 'open_questions'" };
      if (vErrors === null) {
        vErrors = [err21];
      } else {
        vErrors.push(err21);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func5.call(schema23.properties, key0)) {
        const err22 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (!validate652(data.id, { instancePath: instancePath + "/id", parentData: data, parentDataProperty: "id", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate652.errors : vErrors.concat(validate652.errors);
        errors = vErrors.length;
      }
    }
    if (data.title !== void 0) {
      let data3 = data.title;
      if (typeof data3 === "string") {
        if (func12(data3) < 1) {
          const err23 = { instancePath: instancePath + "/title", schemaPath: "#/properties/title/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
          if (vErrors === null) {
            vErrors = [err23];
          } else {
            vErrors.push(err23);
          }
          errors++;
        }
      } else {
        const err24 = { instancePath: instancePath + "/title", schemaPath: "#/properties/title/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      if (!validate67(data.type, { instancePath: instancePath + "/type", parentData: data, parentDataProperty: "type", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate67.errors : vErrors.concat(validate67.errors);
        errors = vErrors.length;
      }
    }
    if (data.confidence !== void 0) {
      let data5 = data.confidence;
      if (!(data5 === "high" || data5 === "med" || data5 === "low")) {
        const err25 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/enum", keyword: "enum", params: { allowedValues: schema23.properties.confidence.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
    if (data.trigger_quote !== void 0) {
      if (!validate562(data.trigger_quote, { instancePath: instancePath + "/trigger_quote", parentData: data, parentDataProperty: "trigger_quote", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate562.errors : vErrors.concat(validate562.errors);
        errors = vErrors.length;
      }
    }
    if (data.modifiers !== void 0) {
      let data7 = data.modifiers;
      if (Array.isArray(data7)) {
        const len0 = data7.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data8 = data7[i0];
          if (!(data8 === "integration" || data8 === "compliance" || data8 === "migration")) {
            const err26 = { instancePath: instancePath + "/modifiers/" + i0, schemaPath: "#/properties/modifiers/items/enum", keyword: "enum", params: { allowedValues: schema23.properties.modifiers.items.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err26];
            } else {
              vErrors.push(err26);
            }
            errors++;
          }
        }
        let i1 = data7.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func02(data7[i1], data7[j0])) {
                const err27 = { instancePath: instancePath + "/modifiers", schemaPath: "#/properties/modifiers/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err28 = { instancePath: instancePath + "/modifiers", schemaPath: "#/properties/modifiers/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
    }
    if (data.spawned_from !== void 0) {
      let data9 = data.spawned_from;
      const _errs20 = errors;
      let valid8 = false;
      let passing0 = null;
      const _errs21 = errors;
      if (data9 !== null) {
        const err29 = { instancePath: instancePath + "/spawned_from", schemaPath: "#/properties/spawned_from/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err29];
        } else {
          vErrors.push(err29);
        }
        errors++;
      }
      var _valid1 = _errs21 === errors;
      if (_valid1) {
        valid8 = true;
        passing0 = 0;
      }
      const _errs23 = errors;
      if (!validate652(data9, { instancePath: instancePath + "/spawned_from", parentData: data, parentDataProperty: "spawned_from", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate652.errors : vErrors.concat(validate652.errors);
        errors = vErrors.length;
      }
      var _valid1 = _errs23 === errors;
      if (_valid1 && valid8) {
        valid8 = false;
        passing0 = [passing0, 1];
      } else {
        if (_valid1) {
          valid8 = true;
          passing0 = 1;
        }
      }
      if (!valid8) {
        const err30 = { instancePath: instancePath + "/spawned_from", schemaPath: "#/properties/spawned_from/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err30];
        } else {
          vErrors.push(err30);
        }
        errors++;
      } else {
        errors = _errs20;
        if (vErrors !== null) {
          if (_errs20) {
            vErrors.length = _errs20;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.superseded_by !== void 0) {
      let data10 = data.superseded_by;
      const _errs25 = errors;
      let valid9 = false;
      let passing1 = null;
      const _errs26 = errors;
      if (data10 !== null) {
        const err31 = { instancePath: instancePath + "/superseded_by", schemaPath: "#/properties/superseded_by/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err31];
        } else {
          vErrors.push(err31);
        }
        errors++;
      }
      var _valid2 = _errs26 === errors;
      if (_valid2) {
        valid9 = true;
        passing1 = 0;
      }
      const _errs28 = errors;
      if (!validate652(data10, { instancePath: instancePath + "/superseded_by", parentData: data, parentDataProperty: "superseded_by", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate652.errors : vErrors.concat(validate652.errors);
        errors = vErrors.length;
      }
      var _valid2 = _errs28 === errors;
      if (_valid2 && valid9) {
        valid9 = false;
        passing1 = [passing1, 1];
      } else {
        if (_valid2) {
          valid9 = true;
          passing1 = 1;
        }
      }
      if (!valid9) {
        const err32 = { instancePath: instancePath + "/superseded_by", schemaPath: "#/properties/superseded_by/oneOf", keyword: "oneOf", params: { passingSchemas: passing1 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      } else {
        errors = _errs25;
        if (vErrors !== null) {
          if (_errs25) {
            vErrors.length = _errs25;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.modifiers_removed !== void 0) {
      let data11 = data.modifiers_removed;
      if (Array.isArray(data11)) {
        const len1 = data11.length;
        for (let i2 = 0; i2 < len1; i2++) {
          let data12 = data11[i2];
          if (!(data12 === "integration" || data12 === "compliance" || data12 === "migration")) {
            const err33 = { instancePath: instancePath + "/modifiers_removed/" + i2, schemaPath: "#/properties/modifiers_removed/items/enum", keyword: "enum", params: { allowedValues: schema23.properties.modifiers_removed.items.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err33];
            } else {
              vErrors.push(err33);
            }
            errors++;
          }
        }
      } else {
        const err34 = { instancePath: instancePath + "/modifiers_removed", schemaPath: "#/properties/modifiers_removed/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err34];
        } else {
          vErrors.push(err34);
        }
        errors++;
      }
    }
    if (data.dropped !== void 0) {
      let data13 = data.dropped;
      if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
        if (data13.reason === void 0) {
          const err35 = { instancePath: instancePath + "/dropped", schemaPath: "#/properties/dropped/required", keyword: "required", params: { missingProperty: "reason" }, message: "must have required property 'reason'" };
          if (vErrors === null) {
            vErrors = [err35];
          } else {
            vErrors.push(err35);
          }
          errors++;
        }
        if (data13.quote === void 0) {
          const err36 = { instancePath: instancePath + "/dropped", schemaPath: "#/properties/dropped/required", keyword: "required", params: { missingProperty: "quote" }, message: "must have required property 'quote'" };
          if (vErrors === null) {
            vErrors = [err36];
          } else {
            vErrors.push(err36);
          }
          errors++;
        }
        if (data13.at === void 0) {
          const err37 = { instancePath: instancePath + "/dropped", schemaPath: "#/properties/dropped/required", keyword: "required", params: { missingProperty: "at" }, message: "must have required property 'at'" };
          if (vErrors === null) {
            vErrors = [err37];
          } else {
            vErrors.push(err37);
          }
          errors++;
        }
        for (const key1 in data13) {
          if (!(key1 === "reason" || key1 === "quote" || key1 === "at")) {
            const err38 = { instancePath: instancePath + "/dropped", schemaPath: "#/properties/dropped/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err38];
            } else {
              vErrors.push(err38);
            }
            errors++;
          }
        }
        if (data13.reason !== void 0) {
          let data14 = data13.reason;
          if (typeof data14 === "string") {
            if (func12(data14) < 1) {
              const err39 = { instancePath: instancePath + "/dropped/reason", schemaPath: "#/properties/dropped/properties/reason/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err39];
              } else {
                vErrors.push(err39);
              }
              errors++;
            }
          } else {
            const err40 = { instancePath: instancePath + "/dropped/reason", schemaPath: "#/properties/dropped/properties/reason/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err40];
            } else {
              vErrors.push(err40);
            }
            errors++;
          }
        }
        if (data13.quote !== void 0) {
          if (!validate562(data13.quote, { instancePath: instancePath + "/dropped/quote", parentData: data13, parentDataProperty: "quote", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate562.errors : vErrors.concat(validate562.errors);
            errors = vErrors.length;
          }
        }
        if (data13.at !== void 0) {
          let data16 = data13.at;
          if (typeof data16 === "string") {
            if (!formats0.validate(data16)) {
              const err41 = { instancePath: instancePath + "/dropped/at", schemaPath: "#/properties/dropped/properties/at/format", keyword: "format", params: { format: "date-time" }, message: 'must match format "date-time"' };
              if (vErrors === null) {
                vErrors = [err41];
              } else {
                vErrors.push(err41);
              }
              errors++;
            }
          } else {
            const err42 = { instancePath: instancePath + "/dropped/at", schemaPath: "#/properties/dropped/properties/at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err42];
            } else {
              vErrors.push(err42);
            }
            errors++;
          }
        }
      } else {
        const err43 = { instancePath: instancePath + "/dropped", schemaPath: "#/properties/dropped/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err43];
        } else {
          vErrors.push(err43);
        }
        errors++;
      }
    }
    if (data.type_history !== void 0) {
      let data17 = data.type_history;
      if (Array.isArray(data17)) {
        if (data17.length < 1) {
          const err44 = { instancePath: instancePath + "/type_history", schemaPath: "#/properties/type_history/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err44];
          } else {
            vErrors.push(err44);
          }
          errors++;
        }
        const len2 = data17.length;
        for (let i3 = 0; i3 < len2; i3++) {
          let data18 = data17[i3];
          if (data18 && typeof data18 == "object" && !Array.isArray(data18)) {
            if (data18.from === void 0) {
              const err45 = { instancePath: instancePath + "/type_history/" + i3, schemaPath: "#/properties/type_history/items/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
              if (vErrors === null) {
                vErrors = [err45];
              } else {
                vErrors.push(err45);
              }
              errors++;
            }
            if (data18.to === void 0) {
              const err46 = { instancePath: instancePath + "/type_history/" + i3, schemaPath: "#/properties/type_history/items/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
              if (vErrors === null) {
                vErrors = [err46];
              } else {
                vErrors.push(err46);
              }
              errors++;
            }
            if (data18.reason === void 0) {
              const err47 = { instancePath: instancePath + "/type_history/" + i3, schemaPath: "#/properties/type_history/items/required", keyword: "required", params: { missingProperty: "reason" }, message: "must have required property 'reason'" };
              if (vErrors === null) {
                vErrors = [err47];
              } else {
                vErrors.push(err47);
              }
              errors++;
            }
            if (data18.quote === void 0) {
              const err48 = { instancePath: instancePath + "/type_history/" + i3, schemaPath: "#/properties/type_history/items/required", keyword: "required", params: { missingProperty: "quote" }, message: "must have required property 'quote'" };
              if (vErrors === null) {
                vErrors = [err48];
              } else {
                vErrors.push(err48);
              }
              errors++;
            }
            if (data18.at === void 0) {
              const err49 = { instancePath: instancePath + "/type_history/" + i3, schemaPath: "#/properties/type_history/items/required", keyword: "required", params: { missingProperty: "at" }, message: "must have required property 'at'" };
              if (vErrors === null) {
                vErrors = [err49];
              } else {
                vErrors.push(err49);
              }
              errors++;
            }
            for (const key2 in data18) {
              if (!(key2 === "from" || key2 === "to" || key2 === "reason" || key2 === "quote" || key2 === "at")) {
                const err50 = { instancePath: instancePath + "/type_history/" + i3, schemaPath: "#/properties/type_history/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err50];
                } else {
                  vErrors.push(err50);
                }
                errors++;
              }
            }
            if (data18.from !== void 0) {
              let data19 = data18.from;
              const _errs46 = errors;
              let valid16 = false;
              let passing2 = null;
              const _errs47 = errors;
              if (data19 !== null) {
                const err51 = { instancePath: instancePath + "/type_history/" + i3 + "/from", schemaPath: "#/properties/type_history/items/properties/from/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
                if (vErrors === null) {
                  vErrors = [err51];
                } else {
                  vErrors.push(err51);
                }
                errors++;
              }
              var _valid3 = _errs47 === errors;
              if (_valid3) {
                valid16 = true;
                passing2 = 0;
              }
              const _errs49 = errors;
              if (!validate67(data19, { instancePath: instancePath + "/type_history/" + i3 + "/from", parentData: data18, parentDataProperty: "from", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate67.errors : vErrors.concat(validate67.errors);
                errors = vErrors.length;
              }
              var _valid3 = _errs49 === errors;
              if (_valid3 && valid16) {
                valid16 = false;
                passing2 = [passing2, 1];
              } else {
                if (_valid3) {
                  valid16 = true;
                  passing2 = 1;
                }
              }
              if (!valid16) {
                const err52 = { instancePath: instancePath + "/type_history/" + i3 + "/from", schemaPath: "#/properties/type_history/items/properties/from/oneOf", keyword: "oneOf", params: { passingSchemas: passing2 }, message: "must match exactly one schema in oneOf" };
                if (vErrors === null) {
                  vErrors = [err52];
                } else {
                  vErrors.push(err52);
                }
                errors++;
              } else {
                errors = _errs46;
                if (vErrors !== null) {
                  if (_errs46) {
                    vErrors.length = _errs46;
                  } else {
                    vErrors = null;
                  }
                }
              }
            }
            if (data18.to !== void 0) {
              if (!validate67(data18.to, { instancePath: instancePath + "/type_history/" + i3 + "/to", parentData: data18, parentDataProperty: "to", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate67.errors : vErrors.concat(validate67.errors);
                errors = vErrors.length;
              }
            }
            if (data18.reason !== void 0) {
              let data21 = data18.reason;
              if (typeof data21 === "string") {
                if (func12(data21) < 1) {
                  const err53 = { instancePath: instancePath + "/type_history/" + i3 + "/reason", schemaPath: "#/properties/type_history/items/properties/reason/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err53];
                  } else {
                    vErrors.push(err53);
                  }
                  errors++;
                }
              } else {
                const err54 = { instancePath: instancePath + "/type_history/" + i3 + "/reason", schemaPath: "#/properties/type_history/items/properties/reason/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err54];
                } else {
                  vErrors.push(err54);
                }
                errors++;
              }
            }
            if (data18.quote !== void 0) {
              if (!validate562(data18.quote, { instancePath: instancePath + "/type_history/" + i3 + "/quote", parentData: data18, parentDataProperty: "quote", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate562.errors : vErrors.concat(validate562.errors);
                errors = vErrors.length;
              }
            }
            if (data18.at !== void 0) {
              let data23 = data18.at;
              if (typeof data23 === "string") {
                if (!formats0.validate(data23)) {
                  const err55 = { instancePath: instancePath + "/type_history/" + i3 + "/at", schemaPath: "#/properties/type_history/items/properties/at/format", keyword: "format", params: { format: "date-time" }, message: 'must match format "date-time"' };
                  if (vErrors === null) {
                    vErrors = [err55];
                  } else {
                    vErrors.push(err55);
                  }
                  errors++;
                }
              } else {
                const err56 = { instancePath: instancePath + "/type_history/" + i3 + "/at", schemaPath: "#/properties/type_history/items/properties/at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err56];
                } else {
                  vErrors.push(err56);
                }
                errors++;
              }
            }
          } else {
            const err57 = { instancePath: instancePath + "/type_history/" + i3, schemaPath: "#/properties/type_history/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err57];
            } else {
              vErrors.push(err57);
            }
            errors++;
          }
        }
      } else {
        const err58 = { instancePath: instancePath + "/type_history", schemaPath: "#/properties/type_history/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err58];
        } else {
          vErrors.push(err58);
        }
        errors++;
      }
    }
    if (data.core_overrides !== void 0) {
      let data24 = data.core_overrides;
      if (data24 && typeof data24 == "object" && !Array.isArray(data24)) {
        for (const key3 in data24) {
          const _errs58 = errors;
          if (!validate762(key3, { instancePath: instancePath + "/core_overrides", parentData: data24, parentDataProperty: "core_overrides", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate762.errors : vErrors.concat(validate762.errors);
            errors = vErrors.length;
          }
          var valid17 = _errs58 === errors;
          if (!valid17) {
            const err59 = { instancePath: instancePath + "/core_overrides", schemaPath: "#/properties/core_overrides/propertyNames", keyword: "propertyNames", params: { propertyName: key3 }, message: "property name must be valid" };
            if (vErrors === null) {
              vErrors = [err59];
            } else {
              vErrors.push(err59);
            }
            errors++;
          }
        }
        for (const key4 in data24) {
          if (!validate55(data24[key4], { instancePath: instancePath + "/core_overrides/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data24, parentDataProperty: key4, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err60 = { instancePath: instancePath + "/core_overrides", schemaPath: "#/properties/core_overrides/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err60];
        } else {
          vErrors.push(err60);
        }
        errors++;
      }
    }
    if (data.coverage !== void 0) {
      let data26 = data.coverage;
      if (data26 && typeof data26 == "object" && !Array.isArray(data26)) {
        for (const key5 in data26) {
          const _errs63 = errors;
          if (!validate79(key5, { instancePath: instancePath + "/coverage", parentData: data26, parentDataProperty: "coverage", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
            errors = vErrors.length;
          }
          const _errs64 = errors;
          const _errs65 = errors;
          if (typeof key5 === "string") {
            if (!pattern82.test(key5)) {
              const err61 = {};
              if (vErrors === null) {
                vErrors = [err61];
              } else {
                vErrors.push(err61);
              }
              errors++;
            }
          }
          var valid20 = _errs65 === errors;
          if (valid20) {
            const err62 = { instancePath: instancePath + "/coverage", schemaPath: "#/properties/coverage/propertyNames/not", keyword: "not", params: {}, message: "must NOT be valid", propertyName: key5 };
            if (vErrors === null) {
              vErrors = [err62];
            } else {
              vErrors.push(err62);
            }
            errors++;
          } else {
            errors = _errs64;
            if (vErrors !== null) {
              if (_errs64) {
                vErrors.length = _errs64;
              } else {
                vErrors = null;
              }
            }
          }
          var valid19 = _errs63 === errors;
          if (!valid19) {
            const err63 = { instancePath: instancePath + "/coverage", schemaPath: "#/properties/coverage/propertyNames", keyword: "propertyNames", params: { propertyName: key5 }, message: "property name must be valid" };
            if (vErrors === null) {
              vErrors = [err63];
            } else {
              vErrors.push(err63);
            }
            errors++;
          }
        }
        for (const key6 in data26) {
          if (!validate55(data26[key6], { instancePath: instancePath + "/coverage/" + key6.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data26, parentDataProperty: key6, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err64 = { instancePath: instancePath + "/coverage", schemaPath: "#/properties/coverage/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err64];
        } else {
          vErrors.push(err64);
        }
        errors++;
      }
    }
    if (data.facts !== void 0) {
      let data28 = data.facts;
      if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
        for (const key7 in data28) {
          const _errs70 = errors;
          if (!(key7 === "rule_clarity" || key7 === "input_digital" || key7 === "input_structured" || key7 === "ways_done" || key7 === "stability" || key7 === "documentation" || key7 === "steps_apps" || key7 === "access" || key7 === "value" || key7 === "ai_applies" || key7 === "eval_ability" || key7 === "error_cost" || key7 === "human_review" || key7 === "simpler_option" || key7 === "fallback" || key7 === "sensitive_data" || key7 === "push" || key7 === "pull" || key7 === "anxiety" || key7 === "habit" || key7 === "existing_asset" || key7 === "decision_depends" || key7 === "broken_cause" || key7 === "workaround_permanent" || key7 === "success_metric")) {
            const err65 = { instancePath: instancePath + "/facts", schemaPath: "#/properties/facts/propertyNames/enum", keyword: "enum", params: { allowedValues: schema23.properties.facts.propertyNames.enum }, message: "must be equal to one of the allowed values", propertyName: key7 };
            if (vErrors === null) {
              vErrors = [err65];
            } else {
              vErrors.push(err65);
            }
            errors++;
          }
          var valid22 = _errs70 === errors;
          if (!valid22) {
            const err66 = { instancePath: instancePath + "/facts", schemaPath: "#/properties/facts/propertyNames", keyword: "propertyNames", params: { propertyName: key7 }, message: "property name must be valid" };
            if (vErrors === null) {
              vErrors = [err66];
            } else {
              vErrors.push(err66);
            }
            errors++;
          }
        }
        for (const key8 in data28) {
          if (!validate822(data28[key8], { instancePath: instancePath + "/facts/" + key8.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data28, parentDataProperty: key8, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate822.errors : vErrors.concat(validate822.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err67 = { instancePath: instancePath + "/facts", schemaPath: "#/properties/facts/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err67];
        } else {
          vErrors.push(err67);
        }
        errors++;
      }
    }
    if (data.prose !== void 0) {
      let data30 = data.prose;
      if (data30 && typeof data30 == "object" && !Array.isArray(data30)) {
        for (const key9 in data30) {
          if (!(key9 === "problem_statement" || key9 === "current_state" || key9 === "mvp" || key9 === "out_of_scope" || key9 === "mitigation")) {
            const err68 = { instancePath: instancePath + "/prose", schemaPath: "#/properties/prose/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key9 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err68];
            } else {
              vErrors.push(err68);
            }
            errors++;
          }
        }
        if (data30.problem_statement !== void 0) {
          let data31 = data30.problem_statement;
          if (typeof data31 === "string") {
            if (func12(data31) < 1) {
              const err69 = { instancePath: instancePath + "/prose/problem_statement", schemaPath: "#/properties/prose/properties/problem_statement/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err69];
              } else {
                vErrors.push(err69);
              }
              errors++;
            }
          } else {
            const err70 = { instancePath: instancePath + "/prose/problem_statement", schemaPath: "#/properties/prose/properties/problem_statement/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err70];
            } else {
              vErrors.push(err70);
            }
            errors++;
          }
        }
        if (data30.current_state !== void 0) {
          let data32 = data30.current_state;
          if (typeof data32 === "string") {
            if (func12(data32) < 1) {
              const err71 = { instancePath: instancePath + "/prose/current_state", schemaPath: "#/properties/prose/properties/current_state/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err71];
              } else {
                vErrors.push(err71);
              }
              errors++;
            }
          } else {
            const err72 = { instancePath: instancePath + "/prose/current_state", schemaPath: "#/properties/prose/properties/current_state/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err72];
            } else {
              vErrors.push(err72);
            }
            errors++;
          }
        }
        if (data30.mvp !== void 0) {
          let data33 = data30.mvp;
          if (typeof data33 === "string") {
            if (func12(data33) < 1) {
              const err73 = { instancePath: instancePath + "/prose/mvp", schemaPath: "#/properties/prose/properties/mvp/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err73];
              } else {
                vErrors.push(err73);
              }
              errors++;
            }
          } else {
            const err74 = { instancePath: instancePath + "/prose/mvp", schemaPath: "#/properties/prose/properties/mvp/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err74];
            } else {
              vErrors.push(err74);
            }
            errors++;
          }
        }
        if (data30.out_of_scope !== void 0) {
          let data34 = data30.out_of_scope;
          if (typeof data34 === "string") {
            if (func12(data34) < 1) {
              const err75 = { instancePath: instancePath + "/prose/out_of_scope", schemaPath: "#/properties/prose/properties/out_of_scope/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err75];
              } else {
                vErrors.push(err75);
              }
              errors++;
            }
          } else {
            const err76 = { instancePath: instancePath + "/prose/out_of_scope", schemaPath: "#/properties/prose/properties/out_of_scope/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err76];
            } else {
              vErrors.push(err76);
            }
            errors++;
          }
        }
        if (data30.mitigation !== void 0) {
          let data35 = data30.mitigation;
          if (typeof data35 === "string") {
            if (func12(data35) < 1) {
              const err77 = { instancePath: instancePath + "/prose/mitigation", schemaPath: "#/properties/prose/properties/mitigation/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err77];
              } else {
                vErrors.push(err77);
              }
              errors++;
            }
          } else {
            const err78 = { instancePath: instancePath + "/prose/mitigation", schemaPath: "#/properties/prose/properties/mitigation/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err78];
            } else {
              vErrors.push(err78);
            }
            errors++;
          }
        }
      } else {
        const err79 = { instancePath: instancePath + "/prose", schemaPath: "#/properties/prose/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err79];
        } else {
          vErrors.push(err79);
        }
        errors++;
      }
    }
    if (data.acceptance !== void 0) {
      let data36 = data.acceptance;
      if (Array.isArray(data36)) {
        const len3 = data36.length;
        for (let i4 = 0; i4 < len3; i4++) {
          let data37 = data36[i4];
          if (data37 && typeof data37 == "object" && !Array.isArray(data37)) {
            if (data37.kind === void 0) {
              const err80 = { instancePath: instancePath + "/acceptance/" + i4, schemaPath: "#/properties/acceptance/items/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
              if (vErrors === null) {
                vErrors = [err80];
              } else {
                vErrors.push(err80);
              }
              errors++;
            }
            if (data37.given === void 0) {
              const err81 = { instancePath: instancePath + "/acceptance/" + i4, schemaPath: "#/properties/acceptance/items/required", keyword: "required", params: { missingProperty: "given" }, message: "must have required property 'given'" };
              if (vErrors === null) {
                vErrors = [err81];
              } else {
                vErrors.push(err81);
              }
              errors++;
            }
            if (data37.when === void 0) {
              const err82 = { instancePath: instancePath + "/acceptance/" + i4, schemaPath: "#/properties/acceptance/items/required", keyword: "required", params: { missingProperty: "when" }, message: "must have required property 'when'" };
              if (vErrors === null) {
                vErrors = [err82];
              } else {
                vErrors.push(err82);
              }
              errors++;
            }
            if (data37.then === void 0) {
              const err83 = { instancePath: instancePath + "/acceptance/" + i4, schemaPath: "#/properties/acceptance/items/required", keyword: "required", params: { missingProperty: "then" }, message: "must have required property 'then'" };
              if (vErrors === null) {
                vErrors = [err83];
              } else {
                vErrors.push(err83);
              }
              errors++;
            }
            if (data37.evidence === void 0) {
              const err84 = { instancePath: instancePath + "/acceptance/" + i4, schemaPath: "#/properties/acceptance/items/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
              if (vErrors === null) {
                vErrors = [err84];
              } else {
                vErrors.push(err84);
              }
              errors++;
            }
            for (const key10 in data37) {
              if (!(key10 === "kind" || key10 === "given" || key10 === "when" || key10 === "then" || key10 === "evidence")) {
                const err85 = { instancePath: instancePath + "/acceptance/" + i4, schemaPath: "#/properties/acceptance/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key10 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err85];
                } else {
                  vErrors.push(err85);
                }
                errors++;
              }
            }
            if (data37.kind !== void 0) {
              let data38 = data37.kind;
              if (!(data38 === "criterion" || data38 === "error_case")) {
                const err86 = { instancePath: instancePath + "/acceptance/" + i4 + "/kind", schemaPath: "#/properties/acceptance/items/properties/kind/enum", keyword: "enum", params: { allowedValues: schema23.properties.acceptance.items.properties.kind.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err86];
                } else {
                  vErrors.push(err86);
                }
                errors++;
              }
            }
            if (data37.given !== void 0) {
              let data39 = data37.given;
              if (typeof data39 === "string") {
                if (func12(data39) < 1) {
                  const err87 = { instancePath: instancePath + "/acceptance/" + i4 + "/given", schemaPath: "#/properties/acceptance/items/properties/given/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err87];
                  } else {
                    vErrors.push(err87);
                  }
                  errors++;
                }
              } else {
                const err88 = { instancePath: instancePath + "/acceptance/" + i4 + "/given", schemaPath: "#/properties/acceptance/items/properties/given/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err88];
                } else {
                  vErrors.push(err88);
                }
                errors++;
              }
            }
            if (data37.when !== void 0) {
              let data40 = data37.when;
              if (typeof data40 === "string") {
                if (func12(data40) < 1) {
                  const err89 = { instancePath: instancePath + "/acceptance/" + i4 + "/when", schemaPath: "#/properties/acceptance/items/properties/when/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err89];
                  } else {
                    vErrors.push(err89);
                  }
                  errors++;
                }
              } else {
                const err90 = { instancePath: instancePath + "/acceptance/" + i4 + "/when", schemaPath: "#/properties/acceptance/items/properties/when/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err90];
                } else {
                  vErrors.push(err90);
                }
                errors++;
              }
            }
            if (data37.then !== void 0) {
              let data41 = data37.then;
              if (typeof data41 === "string") {
                if (func12(data41) < 1) {
                  const err91 = { instancePath: instancePath + "/acceptance/" + i4 + "/then", schemaPath: "#/properties/acceptance/items/properties/then/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err91];
                  } else {
                    vErrors.push(err91);
                  }
                  errors++;
                }
              } else {
                const err92 = { instancePath: instancePath + "/acceptance/" + i4 + "/then", schemaPath: "#/properties/acceptance/items/properties/then/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err92];
                } else {
                  vErrors.push(err92);
                }
                errors++;
              }
            }
            if (data37.evidence !== void 0) {
              let data42 = data37.evidence;
              if (Array.isArray(data42)) {
                if (data42.length < 1) {
                  const err93 = { instancePath: instancePath + "/acceptance/" + i4 + "/evidence", schemaPath: "#/properties/acceptance/items/properties/evidence/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
                  if (vErrors === null) {
                    vErrors = [err93];
                  } else {
                    vErrors.push(err93);
                  }
                  errors++;
                }
                const len4 = data42.length;
                for (let i5 = 0; i5 < len4; i5++) {
                  if (!validate79(data42[i5], { instancePath: instancePath + "/acceptance/" + i4 + "/evidence/" + i5, parentData: data42, parentDataProperty: i5, rootData, dynamicAnchors })) {
                    vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
                    errors = vErrors.length;
                  }
                }
              } else {
                const err94 = { instancePath: instancePath + "/acceptance/" + i4 + "/evidence", schemaPath: "#/properties/acceptance/items/properties/evidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err94];
                } else {
                  vErrors.push(err94);
                }
                errors++;
              }
            }
          } else {
            const err95 = { instancePath: instancePath + "/acceptance/" + i4, schemaPath: "#/properties/acceptance/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err95];
            } else {
              vErrors.push(err95);
            }
            errors++;
          }
        }
      } else {
        const err96 = { instancePath: instancePath + "/acceptance", schemaPath: "#/properties/acceptance/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err96];
        } else {
          vErrors.push(err96);
        }
        errors++;
      }
    }
    if (data.guardrails !== void 0) {
      let data44 = data.guardrails;
      if (Array.isArray(data44)) {
        const len5 = data44.length;
        for (let i6 = 0; i6 < len5; i6++) {
          let data45 = data44[i6];
          if (data45 && typeof data45 == "object" && !Array.isArray(data45)) {
            if (data45.kind === void 0) {
              const err97 = { instancePath: instancePath + "/guardrails/" + i6, schemaPath: "#/properties/guardrails/items/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
              if (vErrors === null) {
                vErrors = [err97];
              } else {
                vErrors.push(err97);
              }
              errors++;
            }
            if (data45.text === void 0) {
              const err98 = { instancePath: instancePath + "/guardrails/" + i6, schemaPath: "#/properties/guardrails/items/required", keyword: "required", params: { missingProperty: "text" }, message: "must have required property 'text'" };
              if (vErrors === null) {
                vErrors = [err98];
              } else {
                vErrors.push(err98);
              }
              errors++;
            }
            if (data45.evidence === void 0) {
              const err99 = { instancePath: instancePath + "/guardrails/" + i6, schemaPath: "#/properties/guardrails/items/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
              if (vErrors === null) {
                vErrors = [err99];
              } else {
                vErrors.push(err99);
              }
              errors++;
            }
            for (const key11 in data45) {
              if (!(key11 === "kind" || key11 === "text" || key11 === "evidence")) {
                const err100 = { instancePath: instancePath + "/guardrails/" + i6, schemaPath: "#/properties/guardrails/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key11 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err100];
                } else {
                  vErrors.push(err100);
                }
                errors++;
              }
            }
            if (data45.kind !== void 0) {
              let data46 = data45.kind;
              if (!(data46 === "kill_criterion" || data46 === "fallback" || data46 === "review_point" || data46 === "data_rule")) {
                const err101 = { instancePath: instancePath + "/guardrails/" + i6 + "/kind", schemaPath: "#/properties/guardrails/items/properties/kind/enum", keyword: "enum", params: { allowedValues: schema23.properties.guardrails.items.properties.kind.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err101];
                } else {
                  vErrors.push(err101);
                }
                errors++;
              }
            }
            if (data45.text !== void 0) {
              let data47 = data45.text;
              if (typeof data47 === "string") {
                if (func12(data47) < 1) {
                  const err102 = { instancePath: instancePath + "/guardrails/" + i6 + "/text", schemaPath: "#/properties/guardrails/items/properties/text/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err102];
                  } else {
                    vErrors.push(err102);
                  }
                  errors++;
                }
              } else {
                const err103 = { instancePath: instancePath + "/guardrails/" + i6 + "/text", schemaPath: "#/properties/guardrails/items/properties/text/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err103];
                } else {
                  vErrors.push(err103);
                }
                errors++;
              }
            }
            if (data45.evidence !== void 0) {
              let data48 = data45.evidence;
              if (Array.isArray(data48)) {
                if (data48.length < 1) {
                  const err104 = { instancePath: instancePath + "/guardrails/" + i6 + "/evidence", schemaPath: "#/properties/guardrails/items/properties/evidence/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
                  if (vErrors === null) {
                    vErrors = [err104];
                  } else {
                    vErrors.push(err104);
                  }
                  errors++;
                }
                const len6 = data48.length;
                for (let i7 = 0; i7 < len6; i7++) {
                  if (!validate79(data48[i7], { instancePath: instancePath + "/guardrails/" + i6 + "/evidence/" + i7, parentData: data48, parentDataProperty: i7, rootData, dynamicAnchors })) {
                    vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
                    errors = vErrors.length;
                  }
                }
              } else {
                const err105 = { instancePath: instancePath + "/guardrails/" + i6 + "/evidence", schemaPath: "#/properties/guardrails/items/properties/evidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err105];
                } else {
                  vErrors.push(err105);
                }
                errors++;
              }
            }
          } else {
            const err106 = { instancePath: instancePath + "/guardrails/" + i6, schemaPath: "#/properties/guardrails/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err106];
            } else {
              vErrors.push(err106);
            }
            errors++;
          }
        }
      } else {
        const err107 = { instancePath: instancePath + "/guardrails", schemaPath: "#/properties/guardrails/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err107];
        } else {
          vErrors.push(err107);
        }
        errors++;
      }
    }
    if (data.scoring !== void 0) {
      let data50 = data.scoring;
      const _errs113 = errors;
      let valid35 = false;
      let passing3 = null;
      const _errs114 = errors;
      if (data50 !== null) {
        const err108 = { instancePath: instancePath + "/scoring", schemaPath: "#/properties/scoring/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err108];
        } else {
          vErrors.push(err108);
        }
        errors++;
      }
      var _valid4 = _errs114 === errors;
      if (_valid4) {
        valid35 = true;
        passing3 = 0;
      }
      const _errs116 = errors;
      if (!validate88(data50, { instancePath: instancePath + "/scoring", parentData: data, parentDataProperty: "scoring", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate88.errors : vErrors.concat(validate88.errors);
        errors = vErrors.length;
      }
      var _valid4 = _errs116 === errors;
      if (_valid4 && valid35) {
        valid35 = false;
        passing3 = [passing3, 1];
      } else {
        if (_valid4) {
          valid35 = true;
          passing3 = 1;
        }
      }
      if (!valid35) {
        const err109 = { instancePath: instancePath + "/scoring", schemaPath: "#/properties/scoring/oneOf", keyword: "oneOf", params: { passingSchemas: passing3 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err109];
        } else {
          vErrors.push(err109);
        }
        errors++;
      } else {
        errors = _errs113;
        if (vErrors !== null) {
          if (_errs113) {
            vErrors.length = _errs113;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.gate !== void 0) {
      let data51 = data.gate;
      const _errs118 = errors;
      let valid36 = false;
      let passing4 = null;
      const _errs119 = errors;
      if (data51 !== null) {
        const err110 = { instancePath: instancePath + "/gate", schemaPath: "#/properties/gate/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
        if (vErrors === null) {
          vErrors = [err110];
        } else {
          vErrors.push(err110);
        }
        errors++;
      }
      var _valid5 = _errs119 === errors;
      if (_valid5) {
        valid36 = true;
        passing4 = 0;
      }
      const _errs121 = errors;
      if (!validate92(data51, { instancePath: instancePath + "/gate", parentData: data, parentDataProperty: "gate", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate92.errors : vErrors.concat(validate92.errors);
        errors = vErrors.length;
      }
      var _valid5 = _errs121 === errors;
      if (_valid5 && valid36) {
        valid36 = false;
        passing4 = [passing4, 1];
      } else {
        if (_valid5) {
          valid36 = true;
          passing4 = 1;
        }
      }
      if (!valid36) {
        const err111 = { instancePath: instancePath + "/gate", schemaPath: "#/properties/gate/oneOf", keyword: "oneOf", params: { passingSchemas: passing4 }, message: "must match exactly one schema in oneOf" };
        if (vErrors === null) {
          vErrors = [err111];
        } else {
          vErrors.push(err111);
        }
        errors++;
      } else {
        errors = _errs118;
        if (vErrors !== null) {
          if (_errs118) {
            vErrors.length = _errs118;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.open_questions !== void 0) {
      let data52 = data.open_questions;
      if (Array.isArray(data52)) {
        const len7 = data52.length;
        for (let i8 = 0; i8 < len7; i8++) {
          let data53 = data52[i8];
          if (data53 && typeof data53 == "object" && !Array.isArray(data53)) {
            if (data53.area === void 0) {
              const err112 = { instancePath: instancePath + "/open_questions/" + i8, schemaPath: "#/properties/open_questions/items/required", keyword: "required", params: { missingProperty: "area" }, message: "must have required property 'area'" };
              if (vErrors === null) {
                vErrors = [err112];
              } else {
                vErrors.push(err112);
              }
              errors++;
            }
            if (data53.question === void 0) {
              const err113 = { instancePath: instancePath + "/open_questions/" + i8, schemaPath: "#/properties/open_questions/items/required", keyword: "required", params: { missingProperty: "question" }, message: "must have required property 'question'" };
              if (vErrors === null) {
                vErrors = [err113];
              } else {
                vErrors.push(err113);
              }
              errors++;
            }
            if (data53.who_can_answer === void 0) {
              const err114 = { instancePath: instancePath + "/open_questions/" + i8, schemaPath: "#/properties/open_questions/items/required", keyword: "required", params: { missingProperty: "who_can_answer" }, message: "must have required property 'who_can_answer'" };
              if (vErrors === null) {
                vErrors = [err114];
              } else {
                vErrors.push(err114);
              }
              errors++;
            }
            if (data53.artifact_needed === void 0) {
              const err115 = { instancePath: instancePath + "/open_questions/" + i8, schemaPath: "#/properties/open_questions/items/required", keyword: "required", params: { missingProperty: "artifact_needed" }, message: "must have required property 'artifact_needed'" };
              if (vErrors === null) {
                vErrors = [err115];
              } else {
                vErrors.push(err115);
              }
              errors++;
            }
            for (const key12 in data53) {
              if (!(key12 === "area" || key12 === "question" || key12 === "who_can_answer" || key12 === "artifact_needed")) {
                const err116 = { instancePath: instancePath + "/open_questions/" + i8, schemaPath: "#/properties/open_questions/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key12 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err116];
                } else {
                  vErrors.push(err116);
                }
                errors++;
              }
            }
            if (data53.area !== void 0) {
              if (!validate79(data53.area, { instancePath: instancePath + "/open_questions/" + i8 + "/area", parentData: data53, parentDataProperty: "area", rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
                errors = vErrors.length;
              }
            }
            if (data53.question !== void 0) {
              let data55 = data53.question;
              if (typeof data55 === "string") {
                if (func12(data55) < 1) {
                  const err117 = { instancePath: instancePath + "/open_questions/" + i8 + "/question", schemaPath: "#/properties/open_questions/items/properties/question/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err117];
                  } else {
                    vErrors.push(err117);
                  }
                  errors++;
                }
              } else {
                const err118 = { instancePath: instancePath + "/open_questions/" + i8 + "/question", schemaPath: "#/properties/open_questions/items/properties/question/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err118];
                } else {
                  vErrors.push(err118);
                }
                errors++;
              }
            }
            if (data53.who_can_answer !== void 0) {
              let data56 = data53.who_can_answer;
              if (typeof data56 !== "string" && data56 !== null) {
                const err119 = { instancePath: instancePath + "/open_questions/" + i8 + "/who_can_answer", schemaPath: "#/properties/open_questions/items/properties/who_can_answer/type", keyword: "type", params: { type: schema23.properties.open_questions.items.properties.who_can_answer.type }, message: "must be string,null" };
                if (vErrors === null) {
                  vErrors = [err119];
                } else {
                  vErrors.push(err119);
                }
                errors++;
              }
            }
            if (data53.artifact_needed !== void 0) {
              let data57 = data53.artifact_needed;
              if (typeof data57 !== "string" && data57 !== null) {
                const err120 = { instancePath: instancePath + "/open_questions/" + i8 + "/artifact_needed", schemaPath: "#/properties/open_questions/items/properties/artifact_needed/type", keyword: "type", params: { type: schema23.properties.open_questions.items.properties.artifact_needed.type }, message: "must be string,null" };
                if (vErrors === null) {
                  vErrors = [err120];
                } else {
                  vErrors.push(err120);
                }
                errors++;
              }
            }
          } else {
            const err121 = { instancePath: instancePath + "/open_questions/" + i8, schemaPath: "#/properties/open_questions/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err121];
            } else {
              vErrors.push(err121);
            }
            errors++;
          }
        }
      } else {
        const err122 = { instancePath: instancePath + "/open_questions", schemaPath: "#/properties/open_questions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err122];
        } else {
          vErrors.push(err122);
        }
        errors++;
      }
    }
  } else {
    const err123 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err123];
    } else {
      vErrors.push(err123);
    }
    errors++;
  }
  validate64.errors = vErrors;
  return errors === 0;
}
validate64.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
var pattern42 = new RegExp("^\\d{4}-\\d{2}-\\d{2}-[0-9a-f]{4,}$", "u");
var pattern52 = new RegExp("^(core\\.[a-z_]+|item-\\d+:[a-z_.]+)$", "u");
function validate52(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
  ;
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate52.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = void 0;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = void 0;
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.schema_version === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "schema_version" }, message: "must have required property 'schema_version'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.framework_version === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "framework_version" }, message: "must have required property 'framework_version'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.session === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "session" }, message: "must have required property 'session'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.core === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "core" }, message: "must have required property 'core'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.items === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "items" }, message: "must have required property 'items'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "schema_version" || key0 === "framework_version" || key0 === "session" || key0 === "core" || key0 === "items")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.schema_version !== void 0) {
      if (1 !== data.schema_version) {
        const err6 = { instancePath: instancePath + "/schema_version", schemaPath: "#/properties/schema_version/const", keyword: "const", params: { allowedValue: 1 }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.framework_version !== void 0) {
      if (!validate532(data.framework_version, { instancePath: instancePath + "/framework_version", parentData: data, parentDataProperty: "framework_version", rootData, dynamicAnchors })) {
        vErrors = vErrors === null ? validate532.errors : vErrors.concat(validate532.errors);
        errors = vErrors.length;
      }
    }
    if (data.session !== void 0) {
      let data2 = data.session;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.id === void 0) {
          const err7 = { instancePath: instancePath + "/session", schemaPath: "#/properties/session/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        if (data2.started_at === void 0) {
          const err8 = { instancePath: instancePath + "/session", schemaPath: "#/properties/session/required", keyword: "required", params: { missingProperty: "started_at" }, message: "must have required property 'started_at'" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        if (data2.mode === void 0) {
          const err9 = { instancePath: instancePath + "/session", schemaPath: "#/properties/session/required", keyword: "required", params: { missingProperty: "mode" }, message: "must have required property 'mode'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.provider === void 0) {
          const err10 = { instancePath: instancePath + "/session", schemaPath: "#/properties/session/required", keyword: "required", params: { missingProperty: "provider" }, message: "must have required property 'provider'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        if (data2.grounding === void 0) {
          const err11 = { instancePath: instancePath + "/session", schemaPath: "#/properties/session/required", keyword: "required", params: { missingProperty: "grounding" }, message: "must have required property 'grounding'" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        if (data2.reflect_back === void 0) {
          const err12 = { instancePath: instancePath + "/session", schemaPath: "#/properties/session/required", keyword: "required", params: { missingProperty: "reflect_back" }, message: "must have required property 'reflect_back'" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "id" || key1 === "started_at" || key1 === "mode" || key1 === "provider" || key1 === "grounding" || key1 === "reflect_back" || key1 === "last_target" || key1 === "asked")) {
            const err13 = { instancePath: instancePath + "/session", schemaPath: "#/properties/session/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data2.id !== void 0) {
          let data3 = data2.id;
          if (typeof data3 === "string") {
            if (!pattern42.test(data3)) {
              const err14 = { instancePath: instancePath + "/session/id", schemaPath: "#/properties/session/properties/id/pattern", keyword: "pattern", params: { pattern: "^\\d{4}-\\d{2}-\\d{2}-[0-9a-f]{4,}$" }, message: 'must match pattern "^\\d{4}-\\d{2}-\\d{2}-[0-9a-f]{4,}$"' };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
          } else {
            const err15 = { instancePath: instancePath + "/session/id", schemaPath: "#/properties/session/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
        if (data2.started_at !== void 0) {
          let data4 = data2.started_at;
          if (typeof data4 === "string") {
            if (!formats0.validate(data4)) {
              const err16 = { instancePath: instancePath + "/session/started_at", schemaPath: "#/properties/session/properties/started_at/format", keyword: "format", params: { format: "date-time" }, message: 'must match format "date-time"' };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
          } else {
            const err17 = { instancePath: instancePath + "/session/started_at", schemaPath: "#/properties/session/properties/started_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
        }
        if (data2.mode !== void 0) {
          let data5 = data2.mode;
          if (!(data5 === "stakeholder" || data5 === "builder")) {
            const err18 = { instancePath: instancePath + "/session/mode", schemaPath: "#/properties/session/properties/mode/enum", keyword: "enum", params: { allowedValues: schema19.properties.session.properties.mode.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err18];
            } else {
              vErrors.push(err18);
            }
            errors++;
          }
        }
        if (data2.provider !== void 0) {
          let data6 = data2.provider;
          if (!(data6 === "claude" || data6 === "azure-openai" || data6 === "openai" || data6 === "codex")) {
            const err19 = { instancePath: instancePath + "/session/provider", schemaPath: "#/properties/session/properties/provider/enum", keyword: "enum", params: { allowedValues: schema19.properties.session.properties.provider.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
        }
        if (data2.grounding !== void 0) {
          let data7 = data2.grounding;
          if (!(data7 === "transcript" || data7 === "unverified")) {
            const err20 = { instancePath: instancePath + "/session/grounding", schemaPath: "#/properties/session/properties/grounding/enum", keyword: "enum", params: { allowedValues: schema19.properties.session.properties.grounding.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
        if (data2.reflect_back !== void 0) {
          let data8 = data2.reflect_back;
          const _errs15 = errors;
          let valid2 = false;
          let passing0 = null;
          const _errs16 = errors;
          if (data8 !== null) {
            const err21 = { instancePath: instancePath + "/session/reflect_back", schemaPath: "#/properties/session/properties/reflect_back/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
            if (vErrors === null) {
              vErrors = [err21];
            } else {
              vErrors.push(err21);
            }
            errors++;
          }
          var _valid0 = _errs16 === errors;
          if (_valid0) {
            valid2 = true;
            passing0 = 0;
          }
          const _errs18 = errors;
          if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
            if (data8.text === void 0) {
              const err22 = { instancePath: instancePath + "/session/reflect_back", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/required", keyword: "required", params: { missingProperty: "text" }, message: "must have required property 'text'" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
            if (data8.confirmed === void 0) {
              const err23 = { instancePath: instancePath + "/session/reflect_back", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/required", keyword: "required", params: { missingProperty: "confirmed" }, message: "must have required property 'confirmed'" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
            if (data8.corrections === void 0) {
              const err24 = { instancePath: instancePath + "/session/reflect_back", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/required", keyword: "required", params: { missingProperty: "corrections" }, message: "must have required property 'corrections'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            for (const key2 in data8) {
              if (!(key2 === "text" || key2 === "confirmed" || key2 === "corrections" || key2 === "proposed_at")) {
                const err25 = { instancePath: instancePath + "/session/reflect_back", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err25];
                } else {
                  vErrors.push(err25);
                }
                errors++;
              }
            }
            if (data8.text !== void 0) {
              let data9 = data8.text;
              if (typeof data9 === "string") {
                if (func12(data9) < 1) {
                  const err26 = { instancePath: instancePath + "/session/reflect_back/text", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/properties/text/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err26];
                  } else {
                    vErrors.push(err26);
                  }
                  errors++;
                }
              } else {
                const err27 = { instancePath: instancePath + "/session/reflect_back/text", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/properties/text/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data8.confirmed !== void 0) {
              if (typeof data8.confirmed !== "boolean") {
                const err28 = { instancePath: instancePath + "/session/reflect_back/confirmed", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/properties/confirmed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
            if (data8.corrections !== void 0) {
              let data11 = data8.corrections;
              if (Array.isArray(data11)) {
                const len0 = data11.length;
                for (let i0 = 0; i0 < len0; i0++) {
                  let data12 = data11[i0];
                  if (typeof data12 === "string") {
                    if (func12(data12) < 1) {
                      const err29 = { instancePath: instancePath + "/session/reflect_back/corrections/" + i0, schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/properties/corrections/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                      if (vErrors === null) {
                        vErrors = [err29];
                      } else {
                        vErrors.push(err29);
                      }
                      errors++;
                    }
                  } else {
                    const err30 = { instancePath: instancePath + "/session/reflect_back/corrections/" + i0, schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/properties/corrections/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err30];
                    } else {
                      vErrors.push(err30);
                    }
                    errors++;
                  }
                }
              } else {
                const err31 = { instancePath: instancePath + "/session/reflect_back/corrections", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/properties/corrections/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
              }
            }
            if (data8.proposed_at !== void 0) {
              let data13 = data8.proposed_at;
              if (typeof data13 === "string") {
                if (!formats0.validate(data13)) {
                  const err32 = { instancePath: instancePath + "/session/reflect_back/proposed_at", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/properties/proposed_at/format", keyword: "format", params: { format: "date-time" }, message: 'must match format "date-time"' };
                  if (vErrors === null) {
                    vErrors = [err32];
                  } else {
                    vErrors.push(err32);
                  }
                  errors++;
                }
              } else {
                const err33 = { instancePath: instancePath + "/session/reflect_back/proposed_at", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/properties/proposed_at/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
          } else {
            const err34 = { instancePath: instancePath + "/session/reflect_back", schemaPath: "#/properties/session/properties/reflect_back/oneOf/1/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err34];
            } else {
              vErrors.push(err34);
            }
            errors++;
          }
          var _valid0 = _errs18 === errors;
          if (_valid0 && valid2) {
            valid2 = false;
            passing0 = [passing0, 1];
          } else {
            if (_valid0) {
              valid2 = true;
              passing0 = 1;
            }
          }
          if (!valid2) {
            const err35 = { instancePath: instancePath + "/session/reflect_back", schemaPath: "#/properties/session/properties/reflect_back/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
            if (vErrors === null) {
              vErrors = [err35];
            } else {
              vErrors.push(err35);
            }
            errors++;
          } else {
            errors = _errs15;
            if (vErrors !== null) {
              if (_errs15) {
                vErrors.length = _errs15;
              } else {
                vErrors = null;
              }
            }
          }
        }
        if (data2.last_target !== void 0) {
          let data14 = data2.last_target;
          const _errs32 = errors;
          let valid6 = false;
          let passing1 = null;
          const _errs33 = errors;
          if (data14 !== null) {
            const err36 = { instancePath: instancePath + "/session/last_target", schemaPath: "#/properties/session/properties/last_target/oneOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
            if (vErrors === null) {
              vErrors = [err36];
            } else {
              vErrors.push(err36);
            }
            errors++;
          }
          var _valid1 = _errs33 === errors;
          if (_valid1) {
            valid6 = true;
            passing1 = 0;
          }
          const _errs35 = errors;
          if (data14 && typeof data14 == "object" && !Array.isArray(data14)) {
            if (data14.item === void 0) {
              const err37 = { instancePath: instancePath + "/session/last_target", schemaPath: "#/properties/session/properties/last_target/oneOf/1/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
              if (vErrors === null) {
                vErrors = [err37];
              } else {
                vErrors.push(err37);
              }
              errors++;
            }
            if (data14.area === void 0) {
              const err38 = { instancePath: instancePath + "/session/last_target", schemaPath: "#/properties/session/properties/last_target/oneOf/1/required", keyword: "required", params: { missingProperty: "area" }, message: "must have required property 'area'" };
              if (vErrors === null) {
                vErrors = [err38];
              } else {
                vErrors.push(err38);
              }
              errors++;
            }
            for (const key3 in data14) {
              if (!(key3 === "item" || key3 === "area" || key3 === "reply")) {
                const err39 = { instancePath: instancePath + "/session/last_target", schemaPath: "#/properties/session/properties/last_target/oneOf/1/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err39];
                } else {
                  vErrors.push(err39);
                }
                errors++;
              }
            }
            if (data14.item !== void 0) {
              let data15 = data14.item;
              if (typeof data15 !== "string" && data15 !== null) {
                const err40 = { instancePath: instancePath + "/session/last_target/item", schemaPath: "#/properties/session/properties/last_target/oneOf/1/properties/item/type", keyword: "type", params: { type: schema19.properties.session.properties.last_target.oneOf[1].properties.item.type }, message: "must be string,null" };
                if (vErrors === null) {
                  vErrors = [err40];
                } else {
                  vErrors.push(err40);
                }
                errors++;
              }
            }
            if (data14.area !== void 0) {
              if (typeof data14.area !== "string") {
                const err41 = { instancePath: instancePath + "/session/last_target/area", schemaPath: "#/properties/session/properties/last_target/oneOf/1/properties/area/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err41];
                } else {
                  vErrors.push(err41);
                }
                errors++;
              }
            }
            if (data14.reply !== void 0) {
              if (typeof data14.reply !== "string") {
                const err42 = { instancePath: instancePath + "/session/last_target/reply", schemaPath: "#/properties/session/properties/last_target/oneOf/1/properties/reply/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err42];
                } else {
                  vErrors.push(err42);
                }
                errors++;
              }
            }
          } else {
            const err43 = { instancePath: instancePath + "/session/last_target", schemaPath: "#/properties/session/properties/last_target/oneOf/1/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err43];
            } else {
              vErrors.push(err43);
            }
            errors++;
          }
          var _valid1 = _errs35 === errors;
          if (_valid1 && valid6) {
            valid6 = false;
            passing1 = [passing1, 1];
          } else {
            if (_valid1) {
              valid6 = true;
              passing1 = 1;
            }
          }
          if (!valid6) {
            const err44 = { instancePath: instancePath + "/session/last_target", schemaPath: "#/properties/session/properties/last_target/oneOf", keyword: "oneOf", params: { passingSchemas: passing1 }, message: "must match exactly one schema in oneOf" };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          } else {
            errors = _errs32;
            if (vErrors !== null) {
              if (_errs32) {
                vErrors.length = _errs32;
              } else {
                vErrors = null;
              }
            }
          }
        }
        if (data2.asked !== void 0) {
          let data18 = data2.asked;
          if (data18 && typeof data18 == "object" && !Array.isArray(data18)) {
            for (const key4 in data18) {
              const _errs46 = errors;
              if (typeof key4 === "string") {
                if (!pattern52.test(key4)) {
                  const err45 = { instancePath: instancePath + "/session/asked", schemaPath: "#/properties/session/properties/asked/propertyNames/pattern", keyword: "pattern", params: { pattern: "^(core\\.[a-z_]+|item-\\d+:[a-z_.]+)$" }, message: 'must match pattern "^(core\\.[a-z_]+|item-\\d+:[a-z_.]+)$"', propertyName: key4 };
                  if (vErrors === null) {
                    vErrors = [err45];
                  } else {
                    vErrors.push(err45);
                  }
                  errors++;
                }
              }
              var valid8 = _errs46 === errors;
              if (!valid8) {
                const err46 = { instancePath: instancePath + "/session/asked", schemaPath: "#/properties/session/properties/asked/propertyNames", keyword: "propertyNames", params: { propertyName: key4 }, message: "property name must be valid" };
                if (vErrors === null) {
                  vErrors = [err46];
                } else {
                  vErrors.push(err46);
                }
                errors++;
              }
            }
            for (const key5 in data18) {
              let data19 = data18[key5];
              if (typeof data19 === "string") {
                if (!formats0.validate(data19)) {
                  const err47 = { instancePath: instancePath + "/session/asked/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/session/properties/asked/additionalProperties/format", keyword: "format", params: { format: "date-time" }, message: 'must match format "date-time"' };
                  if (vErrors === null) {
                    vErrors = [err47];
                  } else {
                    vErrors.push(err47);
                  }
                  errors++;
                }
              } else {
                const err48 = { instancePath: instancePath + "/session/asked/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/properties/session/properties/asked/additionalProperties/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err48];
                } else {
                  vErrors.push(err48);
                }
                errors++;
              }
            }
          } else {
            const err49 = { instancePath: instancePath + "/session/asked", schemaPath: "#/properties/session/properties/asked/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err49];
            } else {
              vErrors.push(err49);
            }
            errors++;
          }
        }
      } else {
        const err50 = { instancePath: instancePath + "/session", schemaPath: "#/properties/session/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err50];
        } else {
          vErrors.push(err50);
        }
        errors++;
      }
    }
    if (data.core !== void 0) {
      let data20 = data.core;
      if (data20 && typeof data20 == "object" && !Array.isArray(data20)) {
        if (data20.users === void 0) {
          const err51 = { instancePath: instancePath + "/core", schemaPath: "#/properties/core/required", keyword: "required", params: { missingProperty: "users" }, message: "must have required property 'users'" };
          if (vErrors === null) {
            vErrors = [err51];
          } else {
            vErrors.push(err51);
          }
          errors++;
        }
        if (data20.outcome === void 0) {
          const err52 = { instancePath: instancePath + "/core", schemaPath: "#/properties/core/required", keyword: "required", params: { missingProperty: "outcome" }, message: "must have required property 'outcome'" };
          if (vErrors === null) {
            vErrors = [err52];
          } else {
            vErrors.push(err52);
          }
          errors++;
        }
        if (data20.data === void 0) {
          const err53 = { instancePath: instancePath + "/core", schemaPath: "#/properties/core/required", keyword: "required", params: { missingProperty: "data" }, message: "must have required property 'data'" };
          if (vErrors === null) {
            vErrors = [err53];
          } else {
            vErrors.push(err53);
          }
          errors++;
        }
        if (data20.systems === void 0) {
          const err54 = { instancePath: instancePath + "/core", schemaPath: "#/properties/core/required", keyword: "required", params: { missingProperty: "systems" }, message: "must have required property 'systems'" };
          if (vErrors === null) {
            vErrors = [err54];
          } else {
            vErrors.push(err54);
          }
          errors++;
        }
        if (data20.constraints === void 0) {
          const err55 = { instancePath: instancePath + "/core", schemaPath: "#/properties/core/required", keyword: "required", params: { missingProperty: "constraints" }, message: "must have required property 'constraints'" };
          if (vErrors === null) {
            vErrors = [err55];
          } else {
            vErrors.push(err55);
          }
          errors++;
        }
        if (data20.trust === void 0) {
          const err56 = { instancePath: instancePath + "/core", schemaPath: "#/properties/core/required", keyword: "required", params: { missingProperty: "trust" }, message: "must have required property 'trust'" };
          if (vErrors === null) {
            vErrors = [err56];
          } else {
            vErrors.push(err56);
          }
          errors++;
        }
        for (const key6 in data20) {
          if (!(key6 === "users" || key6 === "outcome" || key6 === "data" || key6 === "systems" || key6 === "constraints" || key6 === "trust")) {
            const err57 = { instancePath: instancePath + "/core", schemaPath: "#/properties/core/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key6 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err57];
            } else {
              vErrors.push(err57);
            }
            errors++;
          }
        }
        if (data20.users !== void 0) {
          if (!validate55(data20.users, { instancePath: instancePath + "/core/users", parentData: data20, parentDataProperty: "users", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
            errors = vErrors.length;
          }
        }
        if (data20.outcome !== void 0) {
          if (!validate55(data20.outcome, { instancePath: instancePath + "/core/outcome", parentData: data20, parentDataProperty: "outcome", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
            errors = vErrors.length;
          }
        }
        if (data20.data !== void 0) {
          if (!validate55(data20.data, { instancePath: instancePath + "/core/data", parentData: data20, parentDataProperty: "data", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
            errors = vErrors.length;
          }
        }
        if (data20.systems !== void 0) {
          if (!validate55(data20.systems, { instancePath: instancePath + "/core/systems", parentData: data20, parentDataProperty: "systems", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
            errors = vErrors.length;
          }
        }
        if (data20.constraints !== void 0) {
          if (!validate55(data20.constraints, { instancePath: instancePath + "/core/constraints", parentData: data20, parentDataProperty: "constraints", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
            errors = vErrors.length;
          }
        }
        if (data20.trust !== void 0) {
          if (!validate55(data20.trust, { instancePath: instancePath + "/core/trust", parentData: data20, parentDataProperty: "trust", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err58 = { instancePath: instancePath + "/core", schemaPath: "#/properties/core/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err58];
        } else {
          vErrors.push(err58);
        }
        errors++;
      }
    }
    if (data.items !== void 0) {
      let data27 = data.items;
      if (Array.isArray(data27)) {
        const len1 = data27.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate64(data27[i1], { instancePath: instancePath + "/items/" + i1, parentData: data27, parentDataProperty: i1, rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err59 = { instancePath: instancePath + "/items", schemaPath: "#/properties/items/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err59];
        } else {
          vErrors.push(err59);
        }
        errors++;
      }
    }
  } else {
    const err60 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err60];
    } else {
      vErrors.push(err60);
    }
    errors++;
  }
  validate52.errors = vErrors;
  return errors === 0;
}
validate52.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };

// src/lib/generated/turn-validator.js
var validateTurn = validate21;
var schema6 = { "$schema": "http://json-schema.org/draft-07/schema#", "$id": "https://github.com/tjpinder/intake-kit/schema/turn.schema.json", "title": "Intake turn (schema_version 1)", "description": "What the model returns every turn. Written to the strict structured-output subset shared by Azure OpenAI and the Claude API: every property required, additionalProperties false, nullable fields as type unions, no dynamic keys, no pattern/length/count keywords. Rules this subset can't express (ID formats, band names, quote grounding, one probe per area) are enforced by apply-turn against scoring.yaml and the transcript. There is deliberately no field for scores, composites, quadrants or gates.", "type": "object", "additionalProperties": false, "required": ["reply", "updates", "facts", "router", "prose", "acceptance", "guardrails", "open_questions", "reflect_back", "next_target"], "properties": { "reply": { "type": "string", "description": "The next thing said to the user: one question, or the reflect-back." }, "updates": { "type": "array", "description": "Coverage changes heard this turn.", "items": { "$ref": "#/$defs/update" } }, "facts": { "type": "array", "description": "Band picks for scoring criteria, AI overlay checks, adoption and gate facts. The model picks a band name; code maps it to a score via scoring.yaml.", "items": { "$ref": "#/$defs/fact" } }, "router": { "$ref": "#/$defs/router" }, "prose": { "type": "array", "description": "Prose the spec pack needs that isn't a single coverage answer. Captured into the session file before rendering.", "items": { "$ref": "#/$defs/prose" } }, "acceptance": { "type": "array", "description": "Acceptance criteria and error cases in Given/When/Then form. Each cites the coverage IDs it rests on; code attaches the user's quote when rendering.", "items": { "$ref": "#/$defs/acceptance" } }, "guardrails": { "type": "array", "description": "Guardrail statements drawn from what the user said about trust, data and risk. Each cites the coverage IDs it rests on.", "items": { "$ref": "#/$defs/guardrail" } }, "open_questions": { "type": "array", "items": { "$ref": "#/$defs/open_question" } }, "reflect_back": { "description": "Null until the model is ready to reflect back. 'proposed' when presenting it; 'confirmed' or 'corrected' once the user has answered.", "anyOf": [{ "$ref": "#/$defs/reflect_back" }, { "type": "null" }] }, "next_target": { "$ref": "#/$defs/next_target" } }, "$defs": { "update": { "type": "object", "additionalProperties": false, "required": ["item", "area", "status", "value", "quote"], "properties": { "item": { "type": ["string", "null"], "description": "Item ID, or null for a shared-core area." }, "area": { "type": "string", "description": "Namespaced coverage ID, e.g. core.users, data_report.grain, mod.integration.payload." }, "status": { "type": "string", "enum": ["covered", "assumed", "unknown", "not_applicable"] }, "value": { "type": ["string", "null"], "description": "Summary in plain words. Null when status is unknown." }, "quote": { "type": ["string", "null"], "description": "The user's exact words supporting this update. Required for covered and assumed." } } }, "fact": { "type": "object", "additionalProperties": false, "required": ["item", "fact", "band", "evidence", "quote"], "properties": { "item": { "type": "string" }, "fact": { "type": "string", "enum": ["rule_clarity", "input_digital", "input_structured", "ways_done", "stability", "documentation", "steps_apps", "access", "value", "ai_applies", "eval_ability", "error_cost", "human_review", "simpler_option", "fallback", "sensitive_data", "push", "pull", "anxiety", "habit", "existing_asset", "decision_depends", "broken_cause", "workaround_permanent", "success_metric"] }, "band": { "type": "string", "description": "One of the band names scoring.yaml defines for this fact." }, "evidence": { "type": "array", "items": { "type": "string" }, "description": "Coverage IDs the band was derived from." }, "quote": { "type": ["string", "null"], "description": "The user's words behind the band, when there is one." } } }, "router": { "type": "object", "additionalProperties": false, "required": ["new_items", "reclassify", "add_modifiers", "remove_modifiers", "supersede", "drop"], "properties": { "new_items": { "type": "array", "items": { "$ref": "#/$defs/new_item" } }, "reclassify": { "anyOf": [{ "$ref": "#/$defs/reclassify" }, { "type": "null" }] }, "add_modifiers": { "type": "array", "items": { "$ref": "#/$defs/add_modifier" } }, "remove_modifiers": { "type": "array", "items": { "$ref": "#/$defs/remove_modifier" } }, "supersede": { "anyOf": [{ "$ref": "#/$defs/supersede" }, { "type": "null" }] }, "drop": { "anyOf": [{ "$ref": "#/$defs/drop" }, { "type": "null" }] } } }, "new_item": { "type": "object", "additionalProperties": false, "required": ["id", "type", "confidence", "title", "trigger_quote", "spawned_from"], "properties": { "id": { "type": "string" }, "type": { "$ref": "#/$defs/item_type" }, "confidence": { "type": "string", "enum": ["high", "med", "low"] }, "title": { "type": "string" }, "trigger_quote": { "type": "string" }, "spawned_from": { "type": ["string", "null"] } } }, "reclassify": { "type": "object", "additionalProperties": false, "required": ["item", "to", "reason", "quote"], "properties": { "item": { "type": "string" }, "to": { "$ref": "#/$defs/item_type" }, "reason": { "type": "string" }, "quote": { "type": "string" } } }, "add_modifier": { "type": "object", "additionalProperties": false, "required": ["item", "modifier", "quote"], "properties": { "item": { "type": "string" }, "modifier": { "type": "string", "enum": ["integration", "compliance", "migration"] }, "quote": { "type": "string" } } }, "remove_modifier": { "type": "object", "additionalProperties": false, "required": ["item", "modifier", "reason"], "properties": { "item": { "type": "string" }, "modifier": { "type": "string", "enum": ["integration", "compliance", "migration"] }, "reason": { "type": "string", "description": "Why it doesn't apply, e.g. the user said there's no API." } } }, "drop": { "type": "object", "additionalProperties": false, "required": ["item", "reason", "quote"], "properties": { "item": { "type": "string", "description": "An item that turned out not to apply. Not for an item the new one replaces: that's supersede." }, "reason": { "type": "string" }, "quote": { "type": "string", "description": "The user's words saying it doesn't apply." } } }, "supersede": { "type": "object", "additionalProperties": false, "required": ["item", "by", "quote"], "properties": { "item": { "type": "string", "description": "The item that would be replaced." }, "by": { "type": "string", "description": "The item that replaces it if it reaches Go." }, "quote": { "type": "string" } } }, "prose": { "type": "object", "additionalProperties": false, "required": ["item", "field", "text"], "properties": { "item": { "type": ["string", "null"] }, "field": { "type": "string", "enum": ["problem_statement", "current_state", "mvp", "out_of_scope", "mitigation"] }, "text": { "type": "string" } } }, "acceptance": { "type": "object", "additionalProperties": false, "required": ["item", "kind", "given", "when", "then", "evidence"], "properties": { "item": { "type": "string" }, "kind": { "type": "string", "enum": ["criterion", "error_case"] }, "given": { "type": "string" }, "when": { "type": "string" }, "then": { "type": "string" }, "evidence": { "type": "array", "items": { "type": "string" }, "description": "Coverage IDs with a recorded answer and quote." } } }, "guardrail": { "type": "object", "additionalProperties": false, "required": ["item", "kind", "text", "evidence"], "properties": { "item": { "type": "string" }, "kind": { "type": "string", "enum": ["kill_criterion", "fallback", "review_point", "data_rule"] }, "text": { "type": "string" }, "evidence": { "type": "array", "items": { "type": "string" } } } }, "open_question": { "type": "object", "additionalProperties": false, "required": ["item", "area", "question", "who_can_answer", "artifact_needed"], "properties": { "item": { "type": ["string", "null"] }, "area": { "type": "string" }, "question": { "type": "string" }, "who_can_answer": { "type": ["string", "null"] }, "artifact_needed": { "type": ["string", "null"] } } }, "reflect_back": { "type": "object", "additionalProperties": false, "required": ["text", "status", "corrections"], "properties": { "text": { "type": "string" }, "status": { "type": "string", "enum": ["proposed", "confirmed", "corrected"] }, "corrections": { "type": "array", "items": { "type": "string" } } } }, "next_target": { "type": "object", "additionalProperties": false, "required": ["item", "area", "is_probe"], "properties": { "item": { "type": ["string", "null"] }, "area": { "type": ["string", "null"], "description": "The coverage ID the reply asks about, or null for the reflect-back." }, "is_probe": { "type": "boolean", "description": "True when the reply re-asks an area the user already answered vaguely. apply-turn allows one probe per area." } } }, "item_type": { "type": "string", "enum": ["broken", "manual_process", "known_idea", "exploratory", "data_report"] } } };
var func2 = Object.prototype.hasOwnProperty;
var schema7 = { "type": "object", "additionalProperties": false, "required": ["item", "area", "status", "value", "quote"], "properties": { "item": { "type": ["string", "null"], "description": "Item ID, or null for a shared-core area." }, "area": { "type": "string", "description": "Namespaced coverage ID, e.g. core.users, data_report.grain, mod.integration.payload." }, "status": { "type": "string", "enum": ["covered", "assumed", "unknown", "not_applicable"] }, "value": { "type": ["string", "null"], "description": "Summary in plain words. Null when status is unknown." }, "quote": { "type": ["string", "null"], "description": "The user's exact words supporting this update. Required for covered and assumed." } } };
function validate22(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.area === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "area" }, message: "must have required property 'area'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.status === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.value === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "value" }, message: "must have required property 'value'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.quote === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quote" }, message: "must have required property 'quote'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "area" || key0 === "status" || key0 === "value" || key0 === "quote")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      let data0 = data.item;
      if (typeof data0 !== "string" && data0 !== null) {
        const err6 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: schema7.properties.item.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.area !== void 0) {
      if (typeof data.area !== "string") {
        const err7 = { instancePath: instancePath + "/area", schemaPath: "#/properties/area/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.status !== void 0) {
      let data2 = data.status;
      if (typeof data2 !== "string") {
        const err8 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (!(data2 === "covered" || data2 === "assumed" || data2 === "unknown" || data2 === "not_applicable")) {
        const err9 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/enum", keyword: "enum", params: { allowedValues: schema7.properties.status.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.value !== void 0) {
      let data3 = data.value;
      if (typeof data3 !== "string" && data3 !== null) {
        const err10 = { instancePath: instancePath + "/value", schemaPath: "#/properties/value/type", keyword: "type", params: { type: schema7.properties.value.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.quote !== void 0) {
      let data4 = data.quote;
      if (typeof data4 !== "string" && data4 !== null) {
        const err11 = { instancePath: instancePath + "/quote", schemaPath: "#/properties/quote/type", keyword: "type", params: { type: schema7.properties.quote.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
  } else {
    const err12 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  }
  validate22.errors = vErrors;
  return errors === 0;
}
var schema8 = { "type": "object", "additionalProperties": false, "required": ["item", "fact", "band", "evidence", "quote"], "properties": { "item": { "type": "string" }, "fact": { "type": "string", "enum": ["rule_clarity", "input_digital", "input_structured", "ways_done", "stability", "documentation", "steps_apps", "access", "value", "ai_applies", "eval_ability", "error_cost", "human_review", "simpler_option", "fallback", "sensitive_data", "push", "pull", "anxiety", "habit", "existing_asset", "decision_depends", "broken_cause", "workaround_permanent", "success_metric"] }, "band": { "type": "string", "description": "One of the band names scoring.yaml defines for this fact." }, "evidence": { "type": "array", "items": { "type": "string" }, "description": "Coverage IDs the band was derived from." }, "quote": { "type": ["string", "null"], "description": "The user's words behind the band, when there is one." } } };
function validate24(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.fact === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "fact" }, message: "must have required property 'fact'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.band === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "band" }, message: "must have required property 'band'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.evidence === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.quote === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quote" }, message: "must have required property 'quote'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "fact" || key0 === "band" || key0 === "evidence" || key0 === "quote")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      if (typeof data.item !== "string") {
        const err6 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.fact !== void 0) {
      let data1 = data.fact;
      if (typeof data1 !== "string") {
        const err7 = { instancePath: instancePath + "/fact", schemaPath: "#/properties/fact/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data1 === "rule_clarity" || data1 === "input_digital" || data1 === "input_structured" || data1 === "ways_done" || data1 === "stability" || data1 === "documentation" || data1 === "steps_apps" || data1 === "access" || data1 === "value" || data1 === "ai_applies" || data1 === "eval_ability" || data1 === "error_cost" || data1 === "human_review" || data1 === "simpler_option" || data1 === "fallback" || data1 === "sensitive_data" || data1 === "push" || data1 === "pull" || data1 === "anxiety" || data1 === "habit" || data1 === "existing_asset" || data1 === "decision_depends" || data1 === "broken_cause" || data1 === "workaround_permanent" || data1 === "success_metric")) {
        const err8 = { instancePath: instancePath + "/fact", schemaPath: "#/properties/fact/enum", keyword: "enum", params: { allowedValues: schema8.properties.fact.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.band !== void 0) {
      if (typeof data.band !== "string") {
        const err9 = { instancePath: instancePath + "/band", schemaPath: "#/properties/band/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.evidence !== void 0) {
      let data3 = data.evidence;
      if (Array.isArray(data3)) {
        const len0 = data3.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data3[i0] !== "string") {
            const err10 = { instancePath: instancePath + "/evidence/" + i0, schemaPath: "#/properties/evidence/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
      } else {
        const err11 = { instancePath: instancePath + "/evidence", schemaPath: "#/properties/evidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.quote !== void 0) {
      let data5 = data.quote;
      if (typeof data5 !== "string" && data5 !== null) {
        const err12 = { instancePath: instancePath + "/quote", schemaPath: "#/properties/quote/type", keyword: "type", params: { type: schema8.properties.quote.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
  } else {
    const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate24.errors = vErrors;
  return errors === 0;
}
var schema10 = { "type": "object", "additionalProperties": false, "required": ["id", "type", "confidence", "title", "trigger_quote", "spawned_from"], "properties": { "id": { "type": "string" }, "type": { "$ref": "#/$defs/item_type" }, "confidence": { "type": "string", "enum": ["high", "med", "low"] }, "title": { "type": "string" }, "trigger_quote": { "type": "string" }, "spawned_from": { "type": ["string", "null"] } } };
var schema11 = { "type": "string", "enum": ["broken", "manual_process", "known_idea", "exploratory", "data_report"] };
function validate28(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (typeof data !== "string") {
    const err0 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!(data === "broken" || data === "manual_process" || data === "known_idea" || data === "exploratory" || data === "data_report")) {
    const err1 = { instancePath, schemaPath: "#/enum", keyword: "enum", params: { allowedValues: schema11.enum }, message: "must be equal to one of the allowed values" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  validate28.errors = vErrors;
  return errors === 0;
}
function validate27(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.type === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.confidence === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "confidence" }, message: "must have required property 'confidence'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.title === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "title" }, message: "must have required property 'title'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.trigger_quote === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "trigger_quote" }, message: "must have required property 'trigger_quote'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.spawned_from === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "spawned_from" }, message: "must have required property 'spawned_from'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "type" || key0 === "confidence" || key0 === "title" || key0 === "trigger_quote" || key0 === "spawned_from")) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err7 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      if (!validate28(data.type, { instancePath: instancePath + "/type", parentData: data, parentDataProperty: "type", rootData })) {
        vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
        errors = vErrors.length;
      }
    }
    if (data.confidence !== void 0) {
      let data2 = data.confidence;
      if (typeof data2 !== "string") {
        const err8 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (!(data2 === "high" || data2 === "med" || data2 === "low")) {
        const err9 = { instancePath: instancePath + "/confidence", schemaPath: "#/properties/confidence/enum", keyword: "enum", params: { allowedValues: schema10.properties.confidence.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.title !== void 0) {
      if (typeof data.title !== "string") {
        const err10 = { instancePath: instancePath + "/title", schemaPath: "#/properties/title/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.trigger_quote !== void 0) {
      if (typeof data.trigger_quote !== "string") {
        const err11 = { instancePath: instancePath + "/trigger_quote", schemaPath: "#/properties/trigger_quote/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.spawned_from !== void 0) {
      let data5 = data.spawned_from;
      if (typeof data5 !== "string" && data5 !== null) {
        const err12 = { instancePath: instancePath + "/spawned_from", schemaPath: "#/properties/spawned_from/type", keyword: "type", params: { type: schema10.properties.spawned_from.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
  } else {
    const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate27.errors = vErrors;
  return errors === 0;
}
function validate31(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.reason === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reason" }, message: "must have required property 'reason'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.quote === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quote" }, message: "must have required property 'quote'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "to" || key0 === "reason" || key0 === "quote")) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      if (typeof data.item !== "string") {
        const err5 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (!validate28(data.to, { instancePath: instancePath + "/to", parentData: data, parentDataProperty: "to", rootData })) {
        vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
        errors = vErrors.length;
      }
    }
    if (data.reason !== void 0) {
      if (typeof data.reason !== "string") {
        const err6 = { instancePath: instancePath + "/reason", schemaPath: "#/properties/reason/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.quote !== void 0) {
      if (typeof data.quote !== "string") {
        const err7 = { instancePath: instancePath + "/quote", schemaPath: "#/properties/quote/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
  } else {
    const err8 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err8];
    } else {
      vErrors.push(err8);
    }
    errors++;
  }
  validate31.errors = vErrors;
  return errors === 0;
}
var schema13 = { "type": "object", "additionalProperties": false, "required": ["item", "modifier", "quote"], "properties": { "item": { "type": "string" }, "modifier": { "type": "string", "enum": ["integration", "compliance", "migration"] }, "quote": { "type": "string" } } };
function validate34(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.modifier === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "modifier" }, message: "must have required property 'modifier'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.quote === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quote" }, message: "must have required property 'quote'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "modifier" || key0 === "quote")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      if (typeof data.item !== "string") {
        const err4 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.modifier !== void 0) {
      let data1 = data.modifier;
      if (typeof data1 !== "string") {
        const err5 = { instancePath: instancePath + "/modifier", schemaPath: "#/properties/modifier/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      if (!(data1 === "integration" || data1 === "compliance" || data1 === "migration")) {
        const err6 = { instancePath: instancePath + "/modifier", schemaPath: "#/properties/modifier/enum", keyword: "enum", params: { allowedValues: schema13.properties.modifier.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.quote !== void 0) {
      if (typeof data.quote !== "string") {
        const err7 = { instancePath: instancePath + "/quote", schemaPath: "#/properties/quote/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
  } else {
    const err8 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err8];
    } else {
      vErrors.push(err8);
    }
    errors++;
  }
  validate34.errors = vErrors;
  return errors === 0;
}
var schema14 = { "type": "object", "additionalProperties": false, "required": ["item", "modifier", "reason"], "properties": { "item": { "type": "string" }, "modifier": { "type": "string", "enum": ["integration", "compliance", "migration"] }, "reason": { "type": "string", "description": "Why it doesn't apply, e.g. the user said there's no API." } } };
function validate36(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.modifier === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "modifier" }, message: "must have required property 'modifier'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.reason === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reason" }, message: "must have required property 'reason'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "modifier" || key0 === "reason")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      if (typeof data.item !== "string") {
        const err4 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.modifier !== void 0) {
      let data1 = data.modifier;
      if (typeof data1 !== "string") {
        const err5 = { instancePath: instancePath + "/modifier", schemaPath: "#/properties/modifier/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      if (!(data1 === "integration" || data1 === "compliance" || data1 === "migration")) {
        const err6 = { instancePath: instancePath + "/modifier", schemaPath: "#/properties/modifier/enum", keyword: "enum", params: { allowedValues: schema14.properties.modifier.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.reason !== void 0) {
      if (typeof data.reason !== "string") {
        const err7 = { instancePath: instancePath + "/reason", schemaPath: "#/properties/reason/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
  } else {
    const err8 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err8];
    } else {
      vErrors.push(err8);
    }
    errors++;
  }
  validate36.errors = vErrors;
  return errors === 0;
}
function validate38(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.by === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "by" }, message: "must have required property 'by'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.quote === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quote" }, message: "must have required property 'quote'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "by" || key0 === "quote")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      if (typeof data.item !== "string") {
        const err4 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.by !== void 0) {
      if (typeof data.by !== "string") {
        const err5 = { instancePath: instancePath + "/by", schemaPath: "#/properties/by/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.quote !== void 0) {
      if (typeof data.quote !== "string") {
        const err6 = { instancePath: instancePath + "/quote", schemaPath: "#/properties/quote/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate38.errors = vErrors;
  return errors === 0;
}
function validate40(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.reason === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reason" }, message: "must have required property 'reason'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.quote === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "quote" }, message: "must have required property 'quote'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "reason" || key0 === "quote")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      if (typeof data.item !== "string") {
        const err4 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.reason !== void 0) {
      if (typeof data.reason !== "string") {
        const err5 = { instancePath: instancePath + "/reason", schemaPath: "#/properties/reason/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.quote !== void 0) {
      if (typeof data.quote !== "string") {
        const err6 = { instancePath: instancePath + "/quote", schemaPath: "#/properties/quote/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate40.errors = vErrors;
  return errors === 0;
}
function validate26(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.new_items === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "new_items" }, message: "must have required property 'new_items'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.reclassify === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reclassify" }, message: "must have required property 'reclassify'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.add_modifiers === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "add_modifiers" }, message: "must have required property 'add_modifiers'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.remove_modifiers === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "remove_modifiers" }, message: "must have required property 'remove_modifiers'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.supersede === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "supersede" }, message: "must have required property 'supersede'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.drop === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "drop" }, message: "must have required property 'drop'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "new_items" || key0 === "reclassify" || key0 === "add_modifiers" || key0 === "remove_modifiers" || key0 === "supersede" || key0 === "drop")) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.new_items !== void 0) {
      let data0 = data.new_items;
      if (Array.isArray(data0)) {
        const len0 = data0.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate27(data0[i0], { instancePath: instancePath + "/new_items/" + i0, parentData: data0, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err7 = { instancePath: instancePath + "/new_items", schemaPath: "#/properties/new_items/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.reclassify !== void 0) {
      let data2 = data.reclassify;
      const _errs6 = errors;
      let valid3 = false;
      const _errs7 = errors;
      if (!validate31(data2, { instancePath: instancePath + "/reclassify", parentData: data, parentDataProperty: "reclassify", rootData })) {
        vErrors = vErrors === null ? validate31.errors : vErrors.concat(validate31.errors);
        errors = vErrors.length;
      }
      var _valid0 = _errs7 === errors;
      valid3 = valid3 || _valid0;
      if (!valid3) {
        const _errs8 = errors;
        if (data2 !== null) {
          const err8 = { instancePath: instancePath + "/reclassify", schemaPath: "#/properties/reclassify/anyOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        var _valid0 = _errs8 === errors;
        valid3 = valid3 || _valid0;
      }
      if (!valid3) {
        const err9 = { instancePath: instancePath + "/reclassify", schemaPath: "#/properties/reclassify/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      } else {
        errors = _errs6;
        if (vErrors !== null) {
          if (_errs6) {
            vErrors.length = _errs6;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.add_modifiers !== void 0) {
      let data3 = data.add_modifiers;
      if (Array.isArray(data3)) {
        const len1 = data3.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate34(data3[i1], { instancePath: instancePath + "/add_modifiers/" + i1, parentData: data3, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate34.errors : vErrors.concat(validate34.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/add_modifiers", schemaPath: "#/properties/add_modifiers/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.remove_modifiers !== void 0) {
      let data5 = data.remove_modifiers;
      if (Array.isArray(data5)) {
        const len2 = data5.length;
        for (let i2 = 0; i2 < len2; i2++) {
          if (!validate36(data5[i2], { instancePath: instancePath + "/remove_modifiers/" + i2, parentData: data5, parentDataProperty: i2, rootData })) {
            vErrors = vErrors === null ? validate36.errors : vErrors.concat(validate36.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err11 = { instancePath: instancePath + "/remove_modifiers", schemaPath: "#/properties/remove_modifiers/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.supersede !== void 0) {
      let data7 = data.supersede;
      const _errs17 = errors;
      let valid8 = false;
      const _errs18 = errors;
      if (!validate38(data7, { instancePath: instancePath + "/supersede", parentData: data, parentDataProperty: "supersede", rootData })) {
        vErrors = vErrors === null ? validate38.errors : vErrors.concat(validate38.errors);
        errors = vErrors.length;
      }
      var _valid1 = _errs18 === errors;
      valid8 = valid8 || _valid1;
      if (!valid8) {
        const _errs19 = errors;
        if (data7 !== null) {
          const err12 = { instancePath: instancePath + "/supersede", schemaPath: "#/properties/supersede/anyOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        var _valid1 = _errs19 === errors;
        valid8 = valid8 || _valid1;
      }
      if (!valid8) {
        const err13 = { instancePath: instancePath + "/supersede", schemaPath: "#/properties/supersede/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      } else {
        errors = _errs17;
        if (vErrors !== null) {
          if (_errs17) {
            vErrors.length = _errs17;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.drop !== void 0) {
      let data8 = data.drop;
      const _errs22 = errors;
      let valid9 = false;
      const _errs23 = errors;
      if (!validate40(data8, { instancePath: instancePath + "/drop", parentData: data, parentDataProperty: "drop", rootData })) {
        vErrors = vErrors === null ? validate40.errors : vErrors.concat(validate40.errors);
        errors = vErrors.length;
      }
      var _valid2 = _errs23 === errors;
      valid9 = valid9 || _valid2;
      if (!valid9) {
        const _errs24 = errors;
        if (data8 !== null) {
          const err14 = { instancePath: instancePath + "/drop", schemaPath: "#/properties/drop/anyOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
        var _valid2 = _errs24 === errors;
        valid9 = valid9 || _valid2;
      }
      if (!valid9) {
        const err15 = { instancePath: instancePath + "/drop", schemaPath: "#/properties/drop/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      } else {
        errors = _errs22;
        if (vErrors !== null) {
          if (_errs22) {
            vErrors.length = _errs22;
          } else {
            vErrors = null;
          }
        }
      }
    }
  } else {
    const err16 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err16];
    } else {
      vErrors.push(err16);
    }
    errors++;
  }
  validate26.errors = vErrors;
  return errors === 0;
}
var schema17 = { "type": "object", "additionalProperties": false, "required": ["item", "field", "text"], "properties": { "item": { "type": ["string", "null"] }, "field": { "type": "string", "enum": ["problem_statement", "current_state", "mvp", "out_of_scope", "mitigation"] }, "text": { "type": "string" } } };
function validate43(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.field === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "field" }, message: "must have required property 'field'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.text === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "text" }, message: "must have required property 'text'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "field" || key0 === "text")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      let data0 = data.item;
      if (typeof data0 !== "string" && data0 !== null) {
        const err4 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: schema17.properties.item.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.field !== void 0) {
      let data1 = data.field;
      if (typeof data1 !== "string") {
        const err5 = { instancePath: instancePath + "/field", schemaPath: "#/properties/field/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      if (!(data1 === "problem_statement" || data1 === "current_state" || data1 === "mvp" || data1 === "out_of_scope" || data1 === "mitigation")) {
        const err6 = { instancePath: instancePath + "/field", schemaPath: "#/properties/field/enum", keyword: "enum", params: { allowedValues: schema17.properties.field.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.text !== void 0) {
      if (typeof data.text !== "string") {
        const err7 = { instancePath: instancePath + "/text", schemaPath: "#/properties/text/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
  } else {
    const err8 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err8];
    } else {
      vErrors.push(err8);
    }
    errors++;
  }
  validate43.errors = vErrors;
  return errors === 0;
}
var schema18 = { "type": "object", "additionalProperties": false, "required": ["item", "kind", "given", "when", "then", "evidence"], "properties": { "item": { "type": "string" }, "kind": { "type": "string", "enum": ["criterion", "error_case"] }, "given": { "type": "string" }, "when": { "type": "string" }, "then": { "type": "string" }, "evidence": { "type": "array", "items": { "type": "string" }, "description": "Coverage IDs with a recorded answer and quote." } } };
function validate45(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.kind === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.given === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "given" }, message: "must have required property 'given'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.when === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "when" }, message: "must have required property 'when'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.then === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "then" }, message: "must have required property 'then'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.evidence === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "kind" || key0 === "given" || key0 === "when" || key0 === "then" || key0 === "evidence")) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      if (typeof data.item !== "string") {
        const err7 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      let data1 = data.kind;
      if (typeof data1 !== "string") {
        const err8 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (!(data1 === "criterion" || data1 === "error_case")) {
        const err9 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/enum", keyword: "enum", params: { allowedValues: schema18.properties.kind.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.given !== void 0) {
      if (typeof data.given !== "string") {
        const err10 = { instancePath: instancePath + "/given", schemaPath: "#/properties/given/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.when !== void 0) {
      if (typeof data.when !== "string") {
        const err11 = { instancePath: instancePath + "/when", schemaPath: "#/properties/when/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.then !== void 0) {
      if (typeof data.then !== "string") {
        const err12 = { instancePath: instancePath + "/then", schemaPath: "#/properties/then/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data.evidence !== void 0) {
      let data5 = data.evidence;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data5[i0] !== "string") {
            const err13 = { instancePath: instancePath + "/evidence/" + i0, schemaPath: "#/properties/evidence/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/evidence", schemaPath: "#/properties/evidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
  } else {
    const err15 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err15];
    } else {
      vErrors.push(err15);
    }
    errors++;
  }
  validate45.errors = vErrors;
  return errors === 0;
}
var schema192 = { "type": "object", "additionalProperties": false, "required": ["item", "kind", "text", "evidence"], "properties": { "item": { "type": "string" }, "kind": { "type": "string", "enum": ["kill_criterion", "fallback", "review_point", "data_rule"] }, "text": { "type": "string" }, "evidence": { "type": "array", "items": { "type": "string" } } } };
function validate47(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.kind === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.text === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "text" }, message: "must have required property 'text'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.evidence === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidence" }, message: "must have required property 'evidence'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "kind" || key0 === "text" || key0 === "evidence")) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      if (typeof data.item !== "string") {
        const err5 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      let data1 = data.kind;
      if (typeof data1 !== "string") {
        const err6 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if (!(data1 === "kill_criterion" || data1 === "fallback" || data1 === "review_point" || data1 === "data_rule")) {
        const err7 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/enum", keyword: "enum", params: { allowedValues: schema192.properties.kind.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.text !== void 0) {
      if (typeof data.text !== "string") {
        const err8 = { instancePath: instancePath + "/text", schemaPath: "#/properties/text/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.evidence !== void 0) {
      let data3 = data.evidence;
      if (Array.isArray(data3)) {
        const len0 = data3.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data3[i0] !== "string") {
            const err9 = { instancePath: instancePath + "/evidence/" + i0, schemaPath: "#/properties/evidence/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
      } else {
        const err10 = { instancePath: instancePath + "/evidence", schemaPath: "#/properties/evidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
  } else {
    const err11 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err11];
    } else {
      vErrors.push(err11);
    }
    errors++;
  }
  validate47.errors = vErrors;
  return errors === 0;
}
var schema202 = { "type": "object", "additionalProperties": false, "required": ["item", "area", "question", "who_can_answer", "artifact_needed"], "properties": { "item": { "type": ["string", "null"] }, "area": { "type": "string" }, "question": { "type": "string" }, "who_can_answer": { "type": ["string", "null"] }, "artifact_needed": { "type": ["string", "null"] } } };
function validate49(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.area === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "area" }, message: "must have required property 'area'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.question === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "question" }, message: "must have required property 'question'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.who_can_answer === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "who_can_answer" }, message: "must have required property 'who_can_answer'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.artifact_needed === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "artifact_needed" }, message: "must have required property 'artifact_needed'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "area" || key0 === "question" || key0 === "who_can_answer" || key0 === "artifact_needed")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      let data0 = data.item;
      if (typeof data0 !== "string" && data0 !== null) {
        const err6 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: schema202.properties.item.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.area !== void 0) {
      if (typeof data.area !== "string") {
        const err7 = { instancePath: instancePath + "/area", schemaPath: "#/properties/area/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.question !== void 0) {
      if (typeof data.question !== "string") {
        const err8 = { instancePath: instancePath + "/question", schemaPath: "#/properties/question/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.who_can_answer !== void 0) {
      let data3 = data.who_can_answer;
      if (typeof data3 !== "string" && data3 !== null) {
        const err9 = { instancePath: instancePath + "/who_can_answer", schemaPath: "#/properties/who_can_answer/type", keyword: "type", params: { type: schema202.properties.who_can_answer.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.artifact_needed !== void 0) {
      let data4 = data.artifact_needed;
      if (typeof data4 !== "string" && data4 !== null) {
        const err10 = { instancePath: instancePath + "/artifact_needed", schemaPath: "#/properties/artifact_needed/type", keyword: "type", params: { type: schema202.properties.artifact_needed.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
  } else {
    const err11 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err11];
    } else {
      vErrors.push(err11);
    }
    errors++;
  }
  validate49.errors = vErrors;
  return errors === 0;
}
var schema212 = { "type": "object", "additionalProperties": false, "required": ["text", "status", "corrections"], "properties": { "text": { "type": "string" }, "status": { "type": "string", "enum": ["proposed", "confirmed", "corrected"] }, "corrections": { "type": "array", "items": { "type": "string" } } } };
function validate51(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.text === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "text" }, message: "must have required property 'text'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.status === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.corrections === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "corrections" }, message: "must have required property 'corrections'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "text" || key0 === "status" || key0 === "corrections")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.text !== void 0) {
      if (typeof data.text !== "string") {
        const err4 = { instancePath: instancePath + "/text", schemaPath: "#/properties/text/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.status !== void 0) {
      let data1 = data.status;
      if (typeof data1 !== "string") {
        const err5 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      if (!(data1 === "proposed" || data1 === "confirmed" || data1 === "corrected")) {
        const err6 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/enum", keyword: "enum", params: { allowedValues: schema212.properties.status.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.corrections !== void 0) {
      let data2 = data.corrections;
      if (Array.isArray(data2)) {
        const len0 = data2.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data2[i0] !== "string") {
            const err7 = { instancePath: instancePath + "/corrections/" + i0, schemaPath: "#/properties/corrections/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
      } else {
        const err8 = { instancePath: instancePath + "/corrections", schemaPath: "#/properties/corrections/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
  } else {
    const err9 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err9];
    } else {
      vErrors.push(err9);
    }
    errors++;
  }
  validate51.errors = vErrors;
  return errors === 0;
}
var schema222 = { "type": "object", "additionalProperties": false, "required": ["item", "area", "is_probe"], "properties": { "item": { "type": ["string", "null"] }, "area": { "type": ["string", "null"], "description": "The coverage ID the reply asks about, or null for the reflect-back." }, "is_probe": { "type": "boolean", "description": "True when the reply re-asks an area the user already answered vaguely. apply-turn allows one probe per area." } } };
function validate533(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.item === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "item" }, message: "must have required property 'item'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.area === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "area" }, message: "must have required property 'area'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.is_probe === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "is_probe" }, message: "must have required property 'is_probe'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "item" || key0 === "area" || key0 === "is_probe")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.item !== void 0) {
      let data0 = data.item;
      if (typeof data0 !== "string" && data0 !== null) {
        const err4 = { instancePath: instancePath + "/item", schemaPath: "#/properties/item/type", keyword: "type", params: { type: schema222.properties.item.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.area !== void 0) {
      let data1 = data.area;
      if (typeof data1 !== "string" && data1 !== null) {
        const err5 = { instancePath: instancePath + "/area", schemaPath: "#/properties/area/type", keyword: "type", params: { type: schema222.properties.area.type }, message: "must be string,null" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.is_probe !== void 0) {
      if (typeof data.is_probe !== "boolean") {
        const err6 = { instancePath: instancePath + "/is_probe", schemaPath: "#/properties/is_probe/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
  } else {
    const err7 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err7];
    } else {
      vErrors.push(err7);
    }
    errors++;
  }
  validate533.errors = vErrors;
  return errors === 0;
}
function validate21(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  ;
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.reply === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reply" }, message: "must have required property 'reply'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.updates === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "updates" }, message: "must have required property 'updates'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.facts === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "facts" }, message: "must have required property 'facts'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.router === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "router" }, message: "must have required property 'router'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.prose === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "prose" }, message: "must have required property 'prose'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.acceptance === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "acceptance" }, message: "must have required property 'acceptance'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.guardrails === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "guardrails" }, message: "must have required property 'guardrails'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.open_questions === void 0) {
      const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "open_questions" }, message: "must have required property 'open_questions'" };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data.reflect_back === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reflect_back" }, message: "must have required property 'reflect_back'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.next_target === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "next_target" }, message: "must have required property 'next_target'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema6.properties, key0)) {
        const err10 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.reply !== void 0) {
      if (typeof data.reply !== "string") {
        const err11 = { instancePath: instancePath + "/reply", schemaPath: "#/properties/reply/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.updates !== void 0) {
      let data1 = data.updates;
      if (Array.isArray(data1)) {
        const len0 = data1.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate22(data1[i0], { instancePath: instancePath + "/updates/" + i0, parentData: data1, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate22.errors : vErrors.concat(validate22.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err12 = { instancePath: instancePath + "/updates", schemaPath: "#/properties/updates/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data.facts !== void 0) {
      let data3 = data.facts;
      if (Array.isArray(data3)) {
        const len1 = data3.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate24(data3[i1], { instancePath: instancePath + "/facts/" + i1, parentData: data3, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/facts", schemaPath: "#/properties/facts/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.router !== void 0) {
      if (!validate26(data.router, { instancePath: instancePath + "/router", parentData: data, parentDataProperty: "router", rootData })) {
        vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
    if (data.prose !== void 0) {
      let data6 = data.prose;
      if (Array.isArray(data6)) {
        const len2 = data6.length;
        for (let i2 = 0; i2 < len2; i2++) {
          if (!validate43(data6[i2], { instancePath: instancePath + "/prose/" + i2, parentData: data6, parentDataProperty: i2, rootData })) {
            vErrors = vErrors === null ? validate43.errors : vErrors.concat(validate43.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/prose", schemaPath: "#/properties/prose/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.acceptance !== void 0) {
      let data8 = data.acceptance;
      if (Array.isArray(data8)) {
        const len3 = data8.length;
        for (let i3 = 0; i3 < len3; i3++) {
          if (!validate45(data8[i3], { instancePath: instancePath + "/acceptance/" + i3, parentData: data8, parentDataProperty: i3, rootData })) {
            vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/acceptance", schemaPath: "#/properties/acceptance/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.guardrails !== void 0) {
      let data10 = data.guardrails;
      if (Array.isArray(data10)) {
        const len4 = data10.length;
        for (let i4 = 0; i4 < len4; i4++) {
          if (!validate47(data10[i4], { instancePath: instancePath + "/guardrails/" + i4, parentData: data10, parentDataProperty: i4, rootData })) {
            vErrors = vErrors === null ? validate47.errors : vErrors.concat(validate47.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/guardrails", schemaPath: "#/properties/guardrails/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.open_questions !== void 0) {
      let data12 = data.open_questions;
      if (Array.isArray(data12)) {
        const len5 = data12.length;
        for (let i5 = 0; i5 < len5; i5++) {
          if (!validate49(data12[i5], { instancePath: instancePath + "/open_questions/" + i5, parentData: data12, parentDataProperty: i5, rootData })) {
            vErrors = vErrors === null ? validate49.errors : vErrors.concat(validate49.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err17 = { instancePath: instancePath + "/open_questions", schemaPath: "#/properties/open_questions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.reflect_back !== void 0) {
      let data14 = data.reflect_back;
      const _errs24 = errors;
      let valid13 = false;
      const _errs25 = errors;
      if (!validate51(data14, { instancePath: instancePath + "/reflect_back", parentData: data, parentDataProperty: "reflect_back", rootData })) {
        vErrors = vErrors === null ? validate51.errors : vErrors.concat(validate51.errors);
        errors = vErrors.length;
      }
      var _valid0 = _errs25 === errors;
      valid13 = valid13 || _valid0;
      if (!valid13) {
        const _errs26 = errors;
        if (data14 !== null) {
          const err18 = { instancePath: instancePath + "/reflect_back", schemaPath: "#/properties/reflect_back/anyOf/1/type", keyword: "type", params: { type: "null" }, message: "must be null" };
          if (vErrors === null) {
            vErrors = [err18];
          } else {
            vErrors.push(err18);
          }
          errors++;
        }
        var _valid0 = _errs26 === errors;
        valid13 = valid13 || _valid0;
      }
      if (!valid13) {
        const err19 = { instancePath: instancePath + "/reflect_back", schemaPath: "#/properties/reflect_back/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      } else {
        errors = _errs24;
        if (vErrors !== null) {
          if (_errs24) {
            vErrors.length = _errs24;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.next_target !== void 0) {
      if (!validate533(data.next_target, { instancePath: instancePath + "/next_target", parentData: data, parentDataProperty: "next_target", rootData })) {
        vErrors = vErrors === null ? validate533.errors : vErrors.concat(validate533.errors);
        errors = vErrors.length;
      }
    }
  } else {
    const err20 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err20];
    } else {
      vErrors.push(err20);
    }
    errors++;
  }
  validate21.errors = vErrors;
  return errors === 0;
}

// src/lib/schemas.ts
function run(fn, data) {
  const ok = fn(data);
  return { ok, errors: ok ? [] : formatErrors(fn.errors ?? []) };
}
function formatErrors(errors) {
  return errors.map((e) => `${e.instancePath || "/"} ${e.message ?? e.keyword}`);
}
function validateSession2(data) {
  return run(validateSession, data);
}
function validateTurn2(data) {
  return run(validateTurn, data);
}

// src/lib/apply-turn.ts
var ITEM_ID = /^item-\d+$/;
var sharedAnswer = (e) => !!e?.updated_at && !isCaptured(e) && !(e.status === "unknown" && e.quotes.length === 0);
function applyTurn(original, turnData, ctx) {
  const reject = (rejections2) => ({ session: original, rejections: rejections2, applied: false, confirmed: false, warnings: [] });
  const warnings = [];
  const shape = validateTurn2(turnData);
  if (!shape.ok) return reject(shape.errors.map((e) => ({ path: e.split(" ")[0], reason: `doesn't match the turn schema: ${e}` })));
  const turn = turnData;
  if (original.session.reflect_back?.confirmed) {
    return reject([{ path: "/", reason: "This intake is complete: the reflect-back was confirmed and the items are gated. Start a new intake to change anything." }]);
  }
  const { fw, now: now2 } = ctx;
  const session = structuredClone(original);
  const rejections = [];
  const fail = (path, reason) => rejections.push({ path, reason });
  const items = new Map(session.items.map((i) => [i.id, i]));
  const grounded = (path, quote) => {
    if (quote == null || ctx.transcript == null) return;
    if (ctx.transcript.length === 0) {
      fail(path, "No transcript is recorded, so no quote can be checked. Is intake-kit's prompt hook installed and enabled?");
    } else if (!findQuote(quote, ctx.transcript)) {
      fail(path, `"${quote}" isn't the user's words: it doesn't appear in any single user message. Quote the user exactly, or leave the quote out.`);
    }
  };
  const needItem = (path, id) => {
    if (id == null) {
      fail(path, "an item ID is required here");
      return void 0;
    }
    const item = items.get(id);
    if (!item) fail(path, `unknown item ${id}`);
    return item;
  };
  const areaFits = (path, item, area) => {
    const module2 = area.startsWith("mod.") ? area.split(".").slice(0, 2).join(".") : area.split(".")[0];
    const fits = module2 === item.type || item.modifiers.some((m) => `mod.${m}` === module2);
    if (!fits) fail(path, `${area} doesn't apply to ${item.id}, a ${item.type} item${item.modifiers.length ? ` with ${item.modifiers.join(", ")}` : ""}`);
    return fits;
  };
  const knownArea = (path, area) => {
    if (fw.areas.has(area)) return true;
    const asFact = area.replace(/^(core|[a-z_]+)\./, "");
    if (fw.factBands.has(area) || fw.factBands.has(asFact)) {
      fail(path, `${area} is a band pick, not a coverage area: record it only in "facts" (as { "fact": "${asFact}", "band": ... }), never in "updates" or as evidence.`);
    } else {
      fail(path, `unknown coverage ID ${area}`);
    }
    return false;
  };
  turn.router.new_items.forEach((n, i) => {
    const path = `/router/new_items/${i}`;
    if (!ITEM_ID.test(n.id)) fail(`${path}/id`, `item IDs look like item-1, not ${n.id}`);
    else if (items.has(n.id)) fail(`${path}/id`, `${n.id} already exists`);
    if (!n.title.trim()) fail(`${path}/title`, "a new item needs a title");
    if (n.spawned_from != null && !items.has(n.spawned_from)) fail(`${path}/spawned_from`, `unknown item ${n.spawned_from}`);
    grounded(`${path}/trigger_quote`, n.trigger_quote);
    items.set(n.id, {
      id: n.id,
      title: n.title,
      type: n.type,
      confidence: n.confidence,
      trigger_quote: n.trigger_quote,
      modifiers: [],
      spawned_from: n.spawned_from,
      superseded_by: null,
      type_history: [{ from: null, to: n.type, reason: n.spawned_from ? `spawned from ${n.spawned_from}` : "opening", quote: n.trigger_quote, at: now2 }],
      core_overrides: {},
      coverage: {},
      facts: {},
      prose: {},
      acceptance: [],
      guardrails: [],
      scoring: null,
      gate: null,
      open_questions: []
    });
  });
  const rc = turn.router.reclassify;
  if (rc) {
    const item = needItem("/router/reclassify/item", rc.item);
    if (item) {
      if (item.type === rc.to) fail("/router/reclassify/to", `${item.id} is already ${rc.to}`);
      if (!rc.reason.trim()) fail("/router/reclassify/reason", "say why the item is being reclassified");
      grounded("/router/reclassify/quote", rc.quote);
      item.type_history.push({ from: item.type, to: rc.to, reason: rc.reason, quote: rc.quote, at: now2 });
      item.type = rc.to;
    }
  }
  turn.router.add_modifiers.forEach((m, i) => {
    const path = `/router/add_modifiers/${i}`;
    const item = needItem(`${path}/item`, m.item);
    if (!item) return;
    if (item.modifiers.includes(m.modifier)) warnings.push(`${path} skipped: ${item.id} already has the ${m.modifier} modifier`);
    else item.modifiers.push(m.modifier);
    grounded(`${path}/quote`, m.quote);
  });
  turn.router.remove_modifiers.forEach((m, i) => {
    const path = `/router/remove_modifiers/${i}`;
    const item = needItem(`${path}/item`, m.item);
    if (!item) return;
    if (!m.reason.trim()) fail(`${path}/reason`, "say why the modifier doesn't apply");
    if (!item.modifiers.includes(m.modifier)) warnings.push(`${path} skipped: ${item.id} has no ${m.modifier} modifier`);
    else {
      item.modifiers = item.modifiers.filter((x) => x !== m.modifier);
      item.modifiers_removed = [.../* @__PURE__ */ new Set([...item.modifiers_removed ?? [], m.modifier])];
    }
  });
  const drop = turn.router.drop;
  if (drop) {
    const item = needItem("/router/drop/item", drop.item);
    if (!drop.reason.trim()) fail("/router/drop/reason", "say why the item doesn't apply");
    grounded("/router/drop/quote", drop.quote);
    if (item) {
      if (turn.router.supersede?.item === item.id) fail("/router/drop", `${item.id} can't be dropped and superseded in the same turn: drop it if it doesn't apply, supersede it if the other item replaces it`);
      item.dropped = { reason: drop.reason, quote: drop.quote, at: now2 };
      item.superseded_by = null;
    }
  }
  const sup = turn.router.supersede;
  if (sup) {
    const item = needItem("/router/supersede/item", sup.item);
    const by = needItem("/router/supersede/by", sup.by);
    if (item && by) {
      if (item.id === by.id) fail("/router/supersede/by", "an item can't supersede itself");
      else if (by.spawned_from === item.id) {
        fail("/router/supersede", `${by.id} was spawned from ${item.id} as its follow-on, so it can't replace it. If building or fixing ${item.id} makes ${by.id} go away, send { "item": "${by.id}", "by": "${item.id}" }.`);
      } else item.superseded_by = by.id;
    }
    grounded("/router/supersede/quote", sup.quote);
  }
  turn.updates.forEach((u, i) => {
    const path = `/updates/${i}`;
    if (!knownArea(`${path}/area`, u.area)) return;
    if (u.status === "covered" && !u.value?.trim()) fail(`${path}/value`, "covered needs a value");
    if ((u.status === "covered" || u.status === "assumed") && !u.quote?.trim()) {
      fail(`${path}/quote`, `${u.status} needs the user's words as a quote`);
    }
    if (u.status === "unknown" && u.value != null) fail(`${path}/value`, "unknown has no value; use null");
    grounded(`${path}/quote`, u.quote);
    let target;
    let key;
    if (u.area.startsWith("core.")) {
      key = u.area.slice(5);
      if (u.item == null) target = session.core;
      else {
        const item = needItem(`${path}/item`, u.item);
        if (!item) return;
        const shared = session.core[key];
        target = sharedAnswer(shared) || item.core_overrides[key] ? item.core_overrides : session.core;
      }
    } else {
      const item = needItem(`${path}/item`, u.item);
      if (!item || !areaFits(`${path}/area`, item, u.area)) return;
      target = item.coverage;
      key = u.area;
    }
    const prev = target[key] ?? (u.area.startsWith("core.") && u.item != null ? session.core[key] : void 0);
    const quotes = [...prev?.quotes ?? []];
    if (u.quote && !quotes.includes(u.quote)) quotes.push(u.quote);
    target[key] = { status: u.status, value: u.status === "unknown" ? null : u.value, quotes, probe_count: prev?.probe_count ?? 0, updated_at: now2 };
  });
  turn.facts.forEach((f, i) => {
    const path = `/facts/${i}`;
    const item = needItem(`${path}/item`, f.item);
    const bands = ctx.fw.factBands.get(f.fact);
    if (!bands) fail(`${path}/fact`, `unknown fact ${f.fact}`);
    else if (!bands.includes(f.band)) fail(`${path}/band`, `"${f.band}" isn't a band of ${f.fact}; use one of: ${bands.join(", ")}`);
    f.evidence.forEach((ev, j) => knownArea(`${path}/evidence/${j}`, ev));
    let quote = f.quote;
    if (quote != null && ctx.transcript != null && !findQuote(quote, ctx.transcript)) {
      warnings.push(`${path}/quote dropped: not the user's words`);
      quote = null;
    }
    if (item) item.facts[f.fact] = { band: f.band, evidence: f.evidence, quotes: quote ? [quote] : [] };
  });
  turn.prose.forEach((p, i) => {
    const item = needItem(`/prose/${i}/item`, p.item);
    if (!p.text.trim()) fail(`/prose/${i}/text`, "prose can't be empty");
    if (item) item.prose[p.field] = p.text;
  });
  const cited = [];
  const citeEvidence = (path, item, evidence) => {
    if (evidence.length === 0) fail(`${path}/evidence`, "cite at least one coverage ID");
    evidence.forEach((ev, j) => {
      if (!knownArea(`${path}/evidence/${j}`, ev) || !item) return;
      if (ev.startsWith("core.") || areaFits(`${path}/evidence/${j}`, item, ev)) cited.push([`${path}/evidence/${j}`, item, ev]);
    });
  };
  turn.acceptance.forEach((a, i) => {
    const path = `/acceptance/${i}`;
    const item = needItem(`${path}/item`, a.item);
    for (const field of ["given", "when", "then"]) if (!a[field].trim()) fail(`${path}/${field}`, `"${field}" can't be empty`);
    citeEvidence(path, item, a.evidence);
    if (item && !item.acceptance.some((x) => x.kind === a.kind && x.given === a.given && x.when === a.when && x.then === a.then)) {
      item.acceptance.push({ kind: a.kind, given: a.given, when: a.when, then: a.then, evidence: a.evidence });
    }
  });
  turn.guardrails.forEach((g, i) => {
    const path = `/guardrails/${i}`;
    const item = needItem(`${path}/item`, g.item);
    if (!g.text.trim()) fail(`${path}/text`, "a guardrail can't be empty");
    citeEvidence(path, item, g.evidence);
    if (item && !item.guardrails.some((x) => x.kind === g.kind && x.text === g.text)) item.guardrails.push({ kind: g.kind, text: g.text, evidence: g.evidence });
  });
  for (const [path, item, ev] of cited) {
    const entry = ev.startsWith("core.") ? item.core_overrides[ev.slice(5)] ?? session.core[ev.slice(5)] : item.coverage[ev];
    if (!entry?.quotes.length) fail(path, `${ev} has no answer in the user's words yet, so nothing can cite it`);
  }
  turn.open_questions.forEach((q, i) => {
    const path = `/open_questions/${i}`;
    const item = needItem(`${path}/item`, q.item);
    if (!knownArea(`${path}/area`, q.area)) return;
    if (!q.question.trim()) fail(`${path}/question`, "the question can't be empty");
    if (item && !item.open_questions.some((o) => o.area === q.area && o.question === q.question)) {
      item.open_questions.push({ area: q.area, question: q.question, who_can_answer: q.who_can_answer, artifact_needed: q.artifact_needed });
    }
  });
  const nt = turn.next_target;
  if (nt.item != null) needItem("/next_target/item", nt.item);
  if (nt.area != null && knownArea("/next_target/area", nt.area) && nt.item != null && items.has(nt.item) && !nt.area.startsWith("core.")) {
    areaFits("/next_target/area", items.get(nt.item), nt.area);
  }
  const targetEntry = () => {
    if (nt.area == null) return void 0;
    if (nt.area.startsWith("core.")) {
      const key = nt.area.slice(5);
      return (nt.item != null ? items.get(nt.item)?.core_overrides[key] : void 0) ?? session.core[key];
    }
    return nt.item != null ? items.get(nt.item)?.coverage[nt.area] : void 0;
  };
  const askedBefore = !!nt.area && !!original.session.asked && !!original.session.asked[askedKey(nt.item, nt.area) ?? ""];
  if (askedBefore && !nt.is_probe && fw.areas.has(nt.area)) {
    const entry = targetEntry();
    if (entry?.updated_at) {
      if (entry.probe_count >= 1) fail("/next_target/area", `${nt.area} has had its question and one follow-up already. Record what the user said (assumed or unknown if it's still vague) and ask about something else; anything still missing goes in open_questions.`);
      else entry.probe_count = 1;
    }
  }
  if (nt.is_probe) {
    if (nt.area == null) fail("/next_target/is_probe", "a probe has to target an area");
    else if (fw.areas.has(nt.area)) {
      const entry = targetEntry();
      if (!entry || !entry.updated_at) {
        fail("/next_target/is_probe", `${nt.area} hasn't been answered yet, so this is a first ask, not a probe`);
      } else if (entry.probe_count >= 1) {
        fail("/next_target/is_probe", `${nt.area} has already been probed once. Record it as assumed (in the user's words) or unknown, and move on.`);
      } else {
        entry.probe_count = 1;
      }
    }
  }
  const rb = turn.reflect_back;
  let confirmedNow = false;
  if (rb) {
    if (!rb.text.trim()) fail("/reflect_back/text", "the reflect-back can't be empty");
    const prior = original.session.reflect_back;
    if (rb.status === "proposed") {
      if (items.size === 0) fail("/reflect_back", "there's nothing to reflect back yet: no items");
      if (turn.router.new_items.length) fail("/reflect_back", "a reflect-back can't be proposed in the same turn as adding items: add the item and ask about it now, and propose once its questions are done");
      if (nt.area != null) fail("/next_target/area", "a reflect-back proposal asks only whether the summary is right: set next_target.area to null and ask no other question in the reply");
      session.session.reflect_back = { text: rb.text, confirmed: false, corrections: prior?.corrections ?? [], proposed_at: now2 };
    } else if (!prior?.proposed_at) {
      fail("/reflect_back/status", `can't mark the reflect-back ${rb.status} before it has been proposed to the user`);
    } else if (ctx.transcript && !ctx.transcript.some((e) => e.role === "user" && e.at > prior.proposed_at)) {
      fail("/reflect_back/status", `the user hasn't replied since the reflect-back was proposed, so it can't be ${rb.status} yet`);
    } else if (rb.status === "corrected") {
      if (rb.corrections.length === 0) fail("/reflect_back/corrections", "list what the user corrected");
      session.session.reflect_back = { ...prior, text: rb.text, confirmed: false, corrections: [...prior.corrections, ...rb.corrections] };
    } else {
      session.session.reflect_back = { ...prior, text: rb.text, confirmed: true };
      confirmedNow = true;
    }
  }
  const asked = original.session.last_target;
  const lastUser = ctx.transcript?.filter((e) => e.role === "user").at(-1);
  const sawAsked = !!asked && (ctx.lastReply === void 0 || asked.reply === void 0 || asked.reply === ctx.lastReply);
  const recordedReply = !!lastUser && turn.updates.some((u) => u.quote != null && findQuote(u.quote, [lastUser]));
  if (asked && sawAsked && lastUser && !original.session.reflect_back && fw.areas.has(asked.area) && !turn.updates.some((u) => u.area === asked.area) && !recordedReply && lastUser.text.trim().split(/\s+/).length >= 4) {
    let target = null;
    let key = asked.area;
    if (asked.area.startsWith("core.")) {
      key = asked.area.slice(5);
      const item = asked.item == null ? null : items.get(asked.item);
      const shared = session.core[key];
      target = !item || !sharedAnswer(shared) ? session.core : item.core_overrides;
    } else {
      const item = asked.item == null ? void 0 : items.get(asked.item);
      const module2 = asked.area.startsWith("mod.") ? asked.area.split(".").slice(0, 2).join(".") : asked.area.split(".")[0];
      if (item && (module2 === item.type || item.modifiers.some((m) => `mod.${m}` === module2))) target = item.coverage;
    }
    const current = target?.[key];
    const open = !current?.updated_at || current.status === "unknown" || isCaptured(current);
    if (target && ctx.capture === false) {
      const question = asked.reply ? ` ("${asked.reply}")` : "";
      fail("/updates", `your last question${question} was about ${asked.area}${asked.item ? ` for ${asked.item}` : ""}, and this turn records nothing from the user's answer. Record it under the area it really answers (covered, assumed or unknown, quoting them exactly). If it doesn't answer your question, record what it does answer and ask again.`);
    } else if (target && open) {
      const text = lastUser.text.trim();
      const dontKnow = /\b(don'?t|do not) know\b|\bnot sure\b|\bno idea\b|\bunsure\b/i.test(text);
      const quotes = current?.quotes.includes(text) ? current.quotes : [...current?.quotes ?? [], text];
      const probe_count = current?.probe_count ?? 0;
      target[key] = dontKnow ? { status: "unknown", value: null, quotes, probe_count, updated_at: now2, source: "captured" } : { status: "assumed", value: text, quotes, probe_count, updated_at: now2, source: "captured" };
      warnings.push(`${asked.area} captured from the user's reply: the turn didn't record the answer to the question it asked`);
    }
  }
  if (session.session.asked && nt.area && fw.areas.has(nt.area) && rb?.status !== "proposed") {
    const key = askedKey(nt.item, nt.area);
    if (key && !session.session.asked[key]) session.session.asked = { ...session.session.asked, [key]: now2 };
  }
  session.session.last_target = turn.next_target.area ? { item: turn.next_target.item, area: turn.next_target.area, reply: turn.reply } : null;
  if (!turn.reply.trim()) fail("/reply", "the reply to the user can't be empty");
  if (rejections.length) return reject(rejections);
  session.items = [...items.values()];
  let result = session;
  if (confirmedNow) {
    try {
      result = scoreAndGate(session, fw).session;
    } catch (err) {
      return reject([{ path: "/reflect_back", reason: `couldn't score the session: ${err.message}` }]);
    }
  }
  const valid = validateSession2(result);
  if (!valid.ok) return reject(valid.errors.map((e) => ({ path: "/", reason: `the result wouldn't be a valid session: ${e}` })));
  return { session: result, rejections: [], applied: true, confirmed: confirmedNow, warnings };
}

// src/lib/guide.ts
var list = (xs) => xs.map((x) => `"${x}"`).join(", ");
function areaBlock(a) {
  const flags = [a.critical ? "critical" : "", a.always_ask ? "always ask" : ""].filter(Boolean).join(", ");
  const lines = [`- \`${a.id}\`${flags ? ` (${flags})` : ""}: ${a.must_capture}`, `  - Ask: ${a.probes.map((p) => `"${p}"`).join(" \xB7 ")}`];
  for (const f of a.followup_conditions) lines.push(`  - Follow up only when ${f.when}: "${f.ask}"${f.spawns ? ` (spawns a new ${f.spawns === "item" ? "" : `${f.spawns} `}item)` : ""}`);
  if (a.stop_at) lines.push(`  - Stop at: ${a.stop_at}`);
  return lines.join("\n");
}
function guide(fw) {
  const { router: router2, modules, scoring: scoring2 } = fw;
  const out2 = [];
  out2.push("## Entry types", "", "Classify each distinct pain into one type. Record the user's words that triggered it.", "");
  for (const [type, t] of Object.entries(router2.types)) {
    out2.push(`- **${type}** (${t.label}). Signals: ${list(t.signals)}. If unsure, ask: "${t.low_confidence_probe}"`);
  }
  out2.push("", "## Modifiers", "", "Add to any item when you hear these; each adds its own areas.", "");
  for (const [mod, m] of Object.entries(router2.modifiers)) {
    const effect = m.effects?.risk_tier ? " Sets risk tier high." : m.effects?.gate ? " Routes the item to more discovery." : "";
    out2.push(`- **${mod}** (${m.label}). Signals: ${list(m.signals)}.${effect}`);
  }
  out2.push("", `Reclassify an item when ${router2.rules.reclassify_min_signals} or more new signals point to another type, or the story contradicts the label. Shared-core answers carry over.`);
  out2.push("", "## Shared core (once per session; use item: null)", "");
  for (const a of modules.core.areas) out2.push(areaBlock(a));
  for (const type of Object.keys(router2.types)) {
    const m = modules[type];
    out2.push("", `## ${type} areas`, "");
    for (const key of ["step_tags", "candidates", "self_serve_rule"]) {
      if (m[key]) out2.push(`${key.replace("_", " ")}: ${Array.isArray(m[key]) ? m[key].join(", ") : m[key]}`, "");
    }
    for (const a of m.areas) out2.push(areaBlock(a));
  }
  for (const mod of Object.keys(router2.modifiers)) {
    out2.push("", `## mod.${mod} areas`, "");
    for (const a of modules[`mod.${mod}`].areas) out2.push(areaBlock(a));
  }
  out2.push("", "## Facts: pick a band, never a number", "", "Use only these band names. Infer each from the answers it usually comes from; use `unknown` only when nothing the user said bears on it.", "");
  for (const [name, c] of Object.entries(scoring2.criteria)) {
    out2.push(`- \`${name}\` (${c.label}): ${Object.entries(c.describe).map(([b, d]) => `\`${b}\` = ${d}`).join("; ")}; \`unknown\`. Usually from: ${c.usually_from.join(", ")}`);
  }
  out2.push(`- \`${scoring2.ai_overlay.applies_fact}\`: ${Object.keys(scoring2.ai_overlay.applies_bands).map((b) => `\`${b}\``).join(", ")}. "yes" only when the proposed solution uses an LLM.`);
  out2.push("", "AI overlay checks, only when ai_applies is yes. Each is `pass`, `fail` or `unknown`:", "");
  for (const [name, c] of Object.entries(scoring2.ai_overlay.checks)) out2.push(`- \`${name}\` (${c.label}): passes when ${c.passes_when}`);
  const forceSources = Object.entries(scoring2.adoption.usually_from ?? {}).map(([f, ids]) => `\`${f}\` from ${ids.join(", ")}`);
  out2.push("", `Adoption forces, for ${scoring2.adoption.applies_to.join(" and ")} items: ${scoring2.adoption.forces.map((f) => `\`${f}\``).join(", ")}, each ${scoring2.adoption.bands.map((b) => `\`${b}\``).join(", ")}.${forceSources.length ? ` Usually from: ${forceSources.join("; ")}.` : ""}`);
  out2.push("", "Gate facts:", "");
  for (const [name, bands] of Object.entries(scoring2.gate_facts)) {
    const note = scoring2.gate_fact_notes?.[name];
    out2.push(`- \`${name}\`: ${bands.map((b) => `\`${b}\``).join(", ")}${note ? `. ${note}` : ""}`);
  }
  return out2.join("\n") + "\n";
}
function factsFor(item, fw) {
  const s = fw.scoring;
  const facts = [...Object.keys(s.criteria), s.ai_overlay.applies_fact, "success_metric", "existing_asset", "decision_depends"];
  if (item.type === "broken") facts.push("broken_cause", "workaround_permanent");
  if (s.adoption.applies_to.includes(item.type)) facts.push(...s.adoption.forces);
  if (item.facts[s.ai_overlay.applies_fact]?.band === "yes") facts.push(...Object.keys(s.ai_overlay.checks));
  return facts;
}
function needsAcceptance(i) {
  return i.superseded_by == null && !i.dropped && i.type !== "exploratory" && !i.light_pass;
}
function bandSourcesUnasked(item, fw, asked) {
  const modules = /* @__PURE__ */ new Set([item.type, ...item.modifiers.map((m) => `mod.${m}`)]);
  const applies = (id) => id.startsWith("core.") || modules.has(id.startsWith("mod.") ? id.split(".").slice(0, 2).join(".") : id.split(".")[0]);
  const out2 = /* @__PURE__ */ new Set();
  for (const c of Object.values(fw.scoring.criteria)) {
    const sources = c.usually_from.filter(applies);
    if (sources.length && !sources.some(asked)) out2.add(sources[0]);
  }
  return [...out2];
}
function needsBands(i) {
  return i.superseded_by == null && !i.dropped && !i.light_pass && i.type !== "exploratory";
}
function said(signal, text) {
  if (/^an? /.test(signal)) return false;
  const esc = normalize(signal).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9])${esc}(?=[^a-z0-9]|$)`, "g");
  for (const m of text.matchAll(re)) {
    const before = text.slice(0, m.index + m[1].length).split(/[.;:!?\n]/).pop().trim().split(/[\s,]+/).slice(-5);
    if (!before.some((w) => NEGATION.test(w))) return true;
  }
  return false;
}
var NEGATION = /^(no|not|without|never|nor|none|isn't|aren't|don't|doesn't|didn't|isnt|arent|dont|doesnt|didnt)$/;
function routingHint(fw, transcript) {
  const opening = transcript.find((t) => t.role === "user");
  if (!opening) return null;
  const text = normalize(opening.text);
  let best = null;
  for (const [type, def] of Object.entries(fw.router.types)) {
    for (const signal of def.signals) {
      if (said(signal, text) && (!best || signal.length > best.signal.length)) best = { type, signal };
    }
  }
  if (!best) return null;
  return `The opening says "${best.signal}", a ${fw.router.types[best.type].label.toLowerCase()} signal: start with a \`${best.type}\` item unless the user's words clearly point elsewhere.`;
}
function structureHints(session, fw, transcript, opts = {}) {
  const live = session.items.filter((i) => !i.superseded_by && !i.dropped);
  if (live.length === 0) return [];
  const text = normalize(transcript.filter((t) => t.role === "user").map((t) => t.text).join("\n"));
  const hints = [];
  const primary = live[0];
  for (const [mod, def] of Object.entries(fw.router.modifiers)) {
    const m = mod;
    if (live.some((i) => i.modifiers.includes(m)) || session.items.some((i) => i.modifiers_removed?.includes(m))) continue;
    const heard = def.signals.filter((sig) => said(sig, text));
    if (heard.length) hints.push(`The user said ${heard.map((h) => `"${h}"`).join(", ")}: if it's part of ${primary.id}, add the \`${mod}\` modifier (set it in that item's \`modifiers\`) and cover its areas.`);
  }
  if (opts.primaryInterviewed && primary.type !== "manual_process" && primary.type !== "exploratory" && !session.items.some((i) => i.type === "manual_process")) {
    const heard = fw.router.types.manual_process.signals.filter((sig) => said(sig, text));
    if (heard.length) hints.push(`The user said ${heard.map((h) => `"${h}"`).join(", ")}. If that might be manual work they do today that ${primary.id} would replace (not just what they'd fall back to if something failed), ask whether it happens today and when it last did. Only once they describe it happening, add it as one \`manual_process\` item with spawned_from "${primary.id}", and supersede it by ${primary.id} (router.supersede) once they say it would go away; it needs only a light pass (how often, how long). If they say it doesn't apply, add nothing, or drop the item (router.drop) if you already added it.`);
  }
  if (live.some((i) => i.type === "exploratory") && live.length < 4) {
    hints.push("This is an exploratory intake: for each concrete example the user gives, add its own item with spawned_from the exploratory item and the type that fits the example (usually manual_process; never exploratory), and ask only one or two things about it (the last time it happened, roughly what it costs a week). Don't interview any one example in depth; aim for three or more.");
  }
  return hints;
}
function statusOf(session, fw, transcript = []) {
  const rb = session.session.reflect_back;
  const core = Object.entries(session.core).map(([key, e]) => ({
    area: `core.${key}`,
    status: e.status,
    asked: wasAsked(session, null, `core.${key}`),
    probe_available: !!e.updated_at && (e.status === "assumed" || e.status === "unknown") && e.probe_count === 0
  }));
  const items = session.items.map((item) => {
    const modules = [item.type, ...item.modifiers.map((m) => `mod.${m}`)];
    const areas = modules.flatMap((m) => fw.modules[m]?.areas ?? []);
    const asked = (id) => wasAsked(session, item, id);
    const asksCore = modules.flatMap((m) => fw.modules[m]?.asks_core ?? []);
    const critical = criticalAreas(item, fw);
    const probeable = areas.map((a) => [a.id, item.coverage[a.id]]).filter(([, e]) => e?.updated_at && (e.status === "assumed" || e.status === "unknown") && e.probe_count === 0).map(([id]) => id);
    const light = item.spawned_from != null || !!item.dropped;
    const factsMissing = factsFor(item, fw).filter((f) => !item.facts[f]);
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      modifiers: item.modifiers,
      superseded_by: item.superseded_by,
      dropped: !!item.dropped,
      light_pass: item.spawned_from != null,
      preview_quadrant: factsMissing.length === 0 ? scoreItem(scoringView(session, item), fw).quadrant ?? null : null,
      has_mitigation: !!item.prose.mitigation,
      unasked: areas.filter((a) => !asked(a.id)).map((a) => a.id),
      always_ask_pending: light ? [] : [...areas.filter((a) => a.always_ask).map((a) => a.id), ...asksCore].filter((id) => !asked(id)),
      critical_unasked: light ? [] : critical.filter((id) => !asked(id)),
      critical_unprobed: light ? [] : critical.filter((id) => {
        const e = coverageFor(session, item, id);
        return asked(id) && e?.status === "assumed" && e.probe_count === 0;
      }),
      band_sources_unasked: light || item.superseded_by || item.type === "exploratory" ? [] : bandSourcesUnasked(item, fw, asked),
      probe_available: probeable,
      facts_missing: factsMissing,
      acceptance: {
        criteria: item.acceptance.filter((a) => a.kind === "criterion").length,
        error_cases: item.acceptance.filter((a) => a.kind === "error_case").length
      },
      guardrails: {
        kill_criterion: item.guardrails.filter((g) => g.kind === "kill_criterion").length,
        fallback: item.guardrails.filter((g) => g.kind === "fallback").length,
        review_point: item.guardrails.filter((g) => g.kind === "review_point").length,
        data_rule: item.guardrails.filter((g) => g.kind === "data_rule").length
      }
    };
  });
  const interviewed = (i) => i.critical_unasked.length === 0 && i.critical_unprobed.length === 0 && i.always_ask_pending.length === 0 && i.band_sources_unasked.length === 0;
  const interviewComplete = items.length > 0 && items.every(interviewed);
  const writeUpComplete = items.every(
    (i) => (!needsBands(i) || i.facts_missing.length === 0) && (!needsAcceptance(i) || i.acceptance.criteria > 0 && i.acceptance.error_cases > 0 && i.guardrails.kill_criterion > 0 && i.guardrails.fallback > 0)
  );
  const reflect = !rb ? "none" : rb.confirmed ? "confirmed" : "proposed";
  const primary = items.find((i) => !i.superseded_by && !i.dropped);
  const primaryInterviewed = !!primary && interviewed(primary);
  const hints = reflect === "none" ? structureHints(session, fw, transcript, { primaryInterviewed }) : [];
  return {
    reflect_back: reflect,
    core,
    items,
    interview_complete: interviewComplete,
    ready_for_reflect_back: interviewComplete && writeUpComplete,
    next_step: nextStep(reflect, interviewComplete, items, hints, items.length === 0 ? routingHint(fw, transcript) : null),
    hints
  };
}
function nextStep(reflect, interviewComplete, items, hints, routing = null) {
  if (reflect === "confirmed") return "The intake is complete. Thank the user briefly.";
  if (reflect === "proposed") {
    const review = items.filter((i) => i.preview_quadrant === "review" && !i.has_mitigation && !i.superseded_by);
    return [
      `You've played back a summary. If the user's latest message agrees with it (yes, that's right, that captures it), send \`reflect_back\` with status "confirmed" and the same text; don't propose it again. If they corrected something, send status "corrected" with the corrections listed.`,
      ...review.length ? [`${review.map((i) => i.id).join(", ")} would score in the Review quadrant, which can't reach Go without a written mitigation: add a one-line \`mitigation\` prose for it from what the user has already said would reduce the risk (their fallback, review step or rule). Ask only if they've said nothing at all about how risk is handled, and not about core.trust once it has had its question and follow-up.`] : []
    ].join(" ");
  }
  if (items.length === 0) return ["Create the first item from the user's opening statement and ask your first question.", ...routing ? [routing] : []].join(" ");
  const check2 = hints.length ? ` Also check: ${hints.join(" ")}` : "";
  if (!interviewComplete) {
    const open = [...new Set(items.flatMap((i) => [...i.critical_unasked, ...i.always_ask_pending, ...i.band_sources_unasked]))];
    const probe = [...new Set(items.flatMap((i) => i.critical_unprobed))].filter((id) => !open.includes(id));
    return [
      "Keep interviewing.",
      ...open.length ? [`Still to ask (in whatever order follows the conversation; set next_target to the area you ask): ${open.join(", ")}.`] : [],
      ...probe.length ? [`Answered only vaguely, so ask once about the last time it happened (is_probe true): ${probe.join(", ")}.`] : [],
      `Record every answer the user gives as you go.${check2}`
    ].join(" ");
  }
  const banded = items.filter(needsBands).map((i) => i.id);
  const buildable = items.filter(needsAcceptance).map((i) => i.id);
  return [
    ...hints.length ? [`First check: ${hints.join(" ")} If one applies, add it and ask about it instead of writing up. Otherwise:`] : [],
    "Every needed area has been asked, so stop asking questions now. In this one turn:",
    ...banded.length ? [`add a band for every fact listed in facts_missing for ${banded.join(", ")} (skip the other items), picked from what the user already said (use \`unknown\` where they didn't say), in \`facts\` only, never in \`updates\`; a band's quote is optional, so leave it null unless you copy the user's exact words;`] : [],
    ...buildable.length ? [`write acceptance criteria (at least one criterion and one error case) and guardrails (at least a kill criterion and a fallback) for ${buildable.join(", ")}, from what you heard;`] : [],
    "write a one-line `mitigation` prose for any item where the user described how a risk is handled (a fallback, someone checking);",
    "and propose the reflect-back."
  ].join(" ");
}

// src/lib/check-meta.ts
var CHECK_IDS = ["traceability", "eval_gate", "kill_criteria", "flagged_paths", "open_assumptions"];
var CHECK_LABELS = {
  traceability: "Every SPEC and ACCEPTANCE requirement cites a real answer in the user's words",
  eval_gate: "Items that use an LLM have an eval set, and the evals pass",
  kill_criteria: "Kill criteria and fallback are written down in GUARDRAILS.md",
  flagged_paths: "Pull requests touching flagged paths carry the review label",
  open_assumptions: "Every assumption in DECISIONS.md has an owner"
};
var DEFAULT_CONFIG = {
  version: 1,
  enabled: [...CHECK_IDS],
  flagged_paths: [],
  review_label: "needs-review",
  eval_command: null,
  evals_dir: "evals"
};

// src/lib/render.ts
var RenderError = class extends Error {
};
var NOTHING = "_Nothing recorded._";
var DECISION_LABEL = { go: "Go", gather_more: "Gather more discovery", dont_build: "Don't build", fix_not_build: "Fix, not build" };
function citation(entry, id) {
  const quote = entry?.quotes[0];
  return quote ? `[${id}] "${quote}"` : null;
}
function areasOf(item, fw) {
  return ["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)].flatMap((m) => fw.modules[m]?.areas ?? []);
}
function fedLines(session, item, fw, file, section) {
  const lines = [];
  for (const area of areasOf(item, fw)) {
    if (!area.feeds.some((f) => f.file === file && f.section === section)) continue;
    const entry = coverageFor(session, item, area.id);
    if (!entry || entry.status !== "covered" && entry.status !== "assumed" || !entry.value) continue;
    const cite = citation(entry, area.id);
    if (!cite) continue;
    lines.push(`- ${entry.value}${entry.status === "assumed" ? " _(assumed)_" : ""} ${cite}`);
  }
  return lines;
}
function perItem(items, body) {
  const blocks = items.map((item) => {
    const lines = body(item);
    const content = lines.length ? lines.join("\n") : NOTHING;
    return items.length > 1 ? `### ${item.title} (\`${item.id}\`)

${content}` : content;
  });
  return blocks.join("\n\n");
}
function openQuestionLines(session, item, fw, files) {
  const lines = item.open_questions.map((q) => {
    const who = q.who_can_answer ? ` Who can answer: ${q.who_can_answer}.` : "";
    const artifact = q.artifact_needed ? ` What would settle it: ${q.artifact_needed}.` : "";
    return `- ${q.question}${who}${artifact} [${q.area}]`;
  });
  const asked = new Set(item.open_questions.map((q) => q.area));
  for (const area of areasOf(item, fw)) {
    if (asked.has(area.id) || !area.feeds.some((f) => files.includes(f.file))) continue;
    const entry = coverageFor(session, item, area.id);
    const neverAsked = !entry || entry.status === "unknown" && !entry.updated_at && entry.quotes.length === 0 && entry.probe_count === 0;
    if (neverAsked) {
      if (area.critical) lines.push(`- Not yet asked: ${area.must_capture}. [${area.id}]`);
    } else if (entry.status === "unknown") {
      lines.push(`- Still unknown: ${area.must_capture}. [${area.id}]`);
    }
  }
  return lines;
}
function acceptanceLines(session, item, kind) {
  return item.acceptance.filter((a) => a.kind === kind).map((a) => {
    const cites = a.evidence.map((id) => citation(coverageFor(session, item, id), id));
    if (cites.some((c) => c === null)) throw new RenderError(`${item.id}: an acceptance line cites ${a.evidence.join(", ")}, which has no quote to cite`);
    return `- [ ] **Given** ${a.given}, **when** ${a.when}, **then** ${a.then}. ${cites.join(" \xB7 ")}`;
  });
}
function guardrailLines(session, item, kind) {
  return item.guardrails.filter((g) => g.kind === kind).map((g) => {
    const cites = g.evidence.map((id) => citation(coverageFor(session, item, id), id));
    if (cites.some((c) => c === null)) throw new RenderError(`${item.id}: a guardrail cites ${g.evidence.join(", ")}, which has no quote to cite`);
    return `- ${g.text} ${cites.join(" \xB7 ")}`;
  });
}
function gateBlock(item) {
  const g = item.gate;
  const s = item.scoring;
  const lines = [`### ${item.title} (\`${item.id}\`): ${DECISION_LABEL[g.decision]}`, "", ...g.reasons.map((r) => `- ${r}`)];
  const scores = s.automation_potential != null && s.ease != null ? `Automation potential ${s.automation_potential}, ease ${s.ease} (${s.quadrant}).` : "Not enough known criteria to place it in a quadrant.";
  lines.push("", `Scores: ${scores}${s.ai_overlay.applies ? ` AI overlay: ${Object.entries(s.ai_overlay.checks).map(([c, r]) => `${c} ${r}`).join(", ")}.` : ""}`);
  if (g.revisit_trigger) lines.push("", `${g.revisit_trigger}.`);
  return lines;
}
function scope(session) {
  const items = session.items;
  const go = items.filter((i) => i.gate?.decision === "go");
  return {
    "SPEC.md": go,
    "ACCEPTANCE.md": go,
    "CLAUDE.md": go,
    "GUARDRAILS.md": go,
    "FIRST_PROMPT.md": go,
    "DECISIONS.md": items,
    "DISCOVERY_BRIEF.md": items.filter((i) => i.gate?.decision === "gather_more"),
    "DIAGNOSTIC_BRIEF.md": items.filter((i) => i.type === "broken"),
    "PROCESS_MAP.md": items.filter((i) => i.type === "manual_process"),
    "BACKLOG.md": items.some((i) => i.type === "exploratory") ? items : []
  };
}
function sectionRenderers(session, fw, file, checks) {
  const fed = (section) => (items) => perItem(items, (i) => fedLines(session, i, fw, file, section));
  const withSummary = (section, field) => (items) => perItem(items, (i) => {
    const lines = fedLines(session, i, fw, file, section);
    const text = i.prose[field];
    return text ? [`> ${text}`, ...lines.length ? ["", ...lines] : []] : lines;
  });
  const prose = (field) => (items) => perItem(items, (i) => i.prose[field] ? [`> ${i.prose[field]}`] : []);
  const notYet = "_Not set up yet. Run the intake-kit guardrails command (`/intake-kit:guardrails` in Claude Code, `$intake-guardrails` in Codex) to choose these._";
  switch (file) {
    case "SPEC.md":
      return {
        open_questions: (items) => perItem(items, (i) => openQuestionLines(session, i, fw, ["SPEC.md", "ACCEPTANCE.md"])),
        problem: withSummary("problem", "problem_statement"),
        users: fed("users"),
        current_state: withSummary("current_state", "current_state"),
        success_metric: fed("success_metric"),
        mvp: withSummary("mvp", "mvp"),
        out_of_scope: prose("out_of_scope"),
        data: fed("data"),
        systems: fed("systems"),
        constraints: fed("constraints")
      };
    case "ACCEPTANCE.md":
      return {
        criteria: (items) => perItem(items, (i) => acceptanceLines(session, i, "criterion")),
        error_cases: (items) => perItem(items, (i) => acceptanceLines(session, i, "error_case"))
      };
    case "CLAUDE.md":
      return {
        pointers: () => ["- `SPEC.md`: what we're building and why", "- `ACCEPTANCE.md`: what done means; write tests from it", "- `GUARDRAILS.md`: kill criteria, fallback, review points, data handling", "- `DECISIONS.md`: gate decisions and open assumptions", "- `intake-answers.yaml`: the source every file above is rendered from"].join("\n"),
        stack: fed("stack"),
        commands: () => "_None yet. Add build, test and run commands here as soon as they exist._",
        never_do: (items) => [
          "- Don't break a constraint in SPEC.md or a guardrail in GUARDRAILS.md.",
          ...items.flatMap((i) => guardrailLines(session, i, "data_rule"))
        ].join("\n")
      };
    case "GUARDRAILS.md":
      return {
        kill_criteria: (items) => perItem(items, (i) => guardrailLines(session, i, "kill_criterion")),
        fallback: (items) => perItem(items, (i) => guardrailLines(session, i, "fallback")),
        review_points: (items) => perItem(items, (i) => [...guardrailLines(session, i, "review_point"), ...i.prose.mitigation ? [`> Mitigation agreed in the intake: ${i.prose.mitigation}`] : []]),
        data_handling: (items) => perItem(items, (i) => guardrailLines(session, i, "data_rule")),
        flagged_paths: () => !checks ? notYet : checks.flagged_paths.length ? [...checks.flagged_paths.map((g) => `- \`${g}\``), "", `A pull request that changes any of these needs the \`${checks.review_label}\` label and a human review before it can merge.`].join("\n") : "_None flagged._",
        ci_checks: () => !checks ? notYet : [
          ...checks.enabled.map((id) => `- **${id}**: ${CHECK_LABELS[id]}`),
          "",
          "They run on every pull request from `.github/workflows/intake-kit.yml`; a failing check blocks the merge. Configure them in `.intake-kit/checks.json`."
        ].join("\n")
      };
    case "FIRST_PROMPT.md":
      return {
        prompt: (items) => {
          const first = items.flatMap((i) => i.acceptance.filter((a) => a.kind === "criterion"))[0];
          const open = items.reduce((n, i) => n + i.open_questions.length, 0);
          return [
            "Read SPEC.md, ACCEPTANCE.md, GUARDRAILS.md and DECISIONS.md in full before doing anything.",
            "",
            `We're building: ${items.map((i) => i.title).join("; ")}.`,
            "",
            "1. Plan first. Give me a short plan: the smallest slice that proves the idea, the files you'll touch, and how you'll test it. Wait for my OK.",
            first ? `2. Build only that slice. Start with this criterion: Given ${first.given}, when ${first.when}, then ${first.then}.` : "2. Build only that slice, starting from the first criterion in ACCEPTANCE.md.",
            "3. Write tests from ACCEPTANCE.md, including the error cases, before the code they cover.",
            `4. Stop and ask before touching anything in Out of scope${open ? `, or anything that depends on the ${open} open question${open === 1 ? "" : "s"} in SPEC.md` : ""}.`,
            "5. Check GUARDRAILS.md before anything that touches data handling or a review point."
          ].join("\n");
        }
      };
    case "DECISIONS.md":
      return {
        gate: (items) => items.map((i) => gateBlock(i).join("\n")).join("\n\n"),
        reclassifications: (items) => {
          const lines = items.flatMap(
            (i) => i.type_history.filter((h) => h.from != null).map((h) => `- \`${i.id}\` ${h.from} \u2192 ${h.to}: ${h.reason} ("${h.quote}")`)
          );
          return lines.length ? lines.join("\n") : "_None._";
        },
        assumptions: (items) => {
          const lines = [];
          const seen = /* @__PURE__ */ new Set();
          for (const i of items) {
            for (const area of areasOf(i, fw)) {
              const entry = coverageFor(session, i, area.id);
              if (entry?.status !== "assumed") continue;
              const shared = area.id.startsWith("core.") && !i.core_overrides[area.id.slice(5)];
              const key = shared ? area.id : `${i.id}:${area.id}`;
              if (seen.has(key)) continue;
              seen.add(key);
              lines.push(`- **${area.id}**${shared ? "" : ` (\`${i.id}\`)`}: ${entry.value} ("${entry.quotes[0]}"). Owner: _unassigned_`);
            }
          }
          return lines.length ? lines.join("\n") : "_None._";
        },
        adoption_risks: (items) => {
          const lines = items.flatMap((i) => i.scoring ? adoptionRisks(i.scoring, fw).map((force) => `- \`${i.id}\`: ${force} is ${i.scoring.adoption[force]}`) : []);
          return lines.length ? lines.join("\n") : "_None identified._";
        }
      };
    case "DISCOVERY_BRIEF.md":
      return {
        open_questions: (items) => items.map((i) => {
          const open = openQuestionLines(session, i, fw, Object.keys(fw.sections));
          return [`## ${i.title} (\`${i.id}\`)`, "", "Why it needs more discovery:", "", ...i.gate.reasons.map((r) => `- ${r}`), "", "Open questions:", "", ...open.length ? open : [NOTHING]].join("\n");
        }).join("\n\n")
      };
    case "DIAGNOSTIC_BRIEF.md":
      return {
        symptom: fed("symptom"),
        timeline: fed("timeline"),
        impact: fed("impact"),
        workaround: fed("workaround"),
        cause: fed("cause"),
        recurrence: fed("recurrence"),
        fix_ticket: (items) => perItem(items, (i) => {
          if (i.gate?.decision !== "fix_not_build") return ["_Not a fix: see the gate decision in DECISIONS.md._"];
          const cause = i.facts.broken_cause?.band ?? "unknown";
          return [`**${i.title}**: ${cause} cause.`, "", ...fedLines(session, i, fw, file, "fix_ticket")];
        }),
        known_error: fed("known_error")
      };
    case "PROCESS_MAP.md":
      return {
        steps: fed("steps"),
        candidates: (items) => perItem(items, (i) => [
          `**${DECISION_LABEL[i.gate.decision]}**${i.scoring?.quadrant ? ` (${i.scoring.quadrant})` : ""}: ${i.gate.reasons[0]}.`,
          "",
          ...fedLines(session, i, fw, file, "candidates")
        ])
      };
    case "BACKLOG.md":
      return {
        items: (items) => {
          const rank = (i) => (i.gate?.decision === "go" ? 0 : 1) * 100 - ((i.scoring?.automation_potential ?? 0) + (i.scoring?.ease ?? 0));
          const ranked = items.filter((i) => i.type !== "exploratory").sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
          return ranked.length ? ranked.map((i, n) => `${n + 1}. **${i.title}** (\`${i.id}\`, ${i.type}): ${DECISION_LABEL[i.gate.decision]}${i.scoring?.quadrant ? `, ${i.scoring.quadrant}` : ""}`).join("\n") : NOTHING;
        },
        self_serve: (items) => perItem(items.filter((i) => i.type === "exploratory"), (i) => fedLines(session, i, fw, file, "self_serve"))
      };
    default:
      throw new RenderError(`no renderer for ${file}`);
  }
}
function renderAll(session, fw, templates, checks = null) {
  if (!session.session.reflect_back?.confirmed || session.items.some((i) => !i.gate || !i.scoring)) {
    throw new RenderError("The session isn't scored and gated yet: confirm the reflect-back first.");
  }
  const out2 = /* @__PURE__ */ new Map();
  const scopes = scope(session);
  for (const [file, sections2] of Object.entries(fw.sections)) {
    const items = scopes[file];
    if (!items?.length) continue;
    const renderers = sectionRenderers(session, fw, file, checks);
    let text = templates[file];
    if (text == null) throw new RenderError(`no template for ${file}`);
    for (const section of sections2) {
      const fn = renderers[section];
      if (!fn) throw new RenderError(`${file}: no renderer for section ${section}`);
      const placeholder = `{{section:${section}}}`;
      if (!text.includes(placeholder)) throw new RenderError(`templates/${file} is missing ${placeholder}`);
      text = text.replace(placeholder, () => fn(items));
    }
    text = text.replaceAll("{{titles}}", items.map((i) => i.title).join("; ")).replaceAll("{{session_id}}", session.session.id).replaceAll("{{date}}", session.session.started_at.slice(0, 10)).replaceAll("{{rules_version}}", items[0].gate.rules_version);
    const leftover = text.match(/\{\{[^}]+\}\}/);
    if (leftover) throw new RenderError(`templates/${file}: unknown placeholder ${leftover[0]}`);
    out2.set(file, text.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
  }
  return out2;
}

// src/lib/summary.ts
var CORE_LABEL = {
  "core.users": "Who's involved",
  "core.outcome": "What success looks like",
  "core.data": "The data",
  "core.systems": "Systems and tools",
  "core.constraints": "Rules and constraints",
  "core.trust": "When it goes wrong"
};
var humanize = (s) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
var areaLabel = (id) => CORE_LABEL[id] ?? humanize(id.split(".").pop());
var GATE_FACT_LABEL = {
  success_metric: "How success is measured",
  existing_asset: "Something that already does this",
  decision_depends: "Someone acts on the result",
  broken_cause: "Cause",
  workaround_permanent: "The workaround is permanent",
  ai_applies: "Uses AI",
  push: "Pain with today's way",
  pull: "Pull of the new way",
  anxiety: "Worry about the new way",
  habit: "Habit of the old way"
};
function bandText(fw, fact, band) {
  if (band === "unknown") return "Not known yet";
  const described = fw.scoring.criteria[fact]?.describe?.[band];
  return described ?? humanize(band);
}
function factLabel(fw, fact) {
  return fw.scoring.criteria[fact]?.label ?? fw.scoring.ai_overlay.checks[fact]?.label ?? GATE_FACT_LABEL[fact] ?? humanize(fact);
}
function buildSummary(session, fw) {
  const live = session.items.filter((i) => !i.superseded_by && !i.dropped);
  return {
    items: live.map((item) => summarizeItem(session, item, fw)),
    set_aside: [
      ...session.items.filter((i) => i.dropped).map((i) => `${i.title}: dropped (${i.dropped.reason})`),
      ...session.items.filter((i) => i.superseded_by && !i.dropped).map((i) => `${i.title}: replaced by ${session.items.find((x) => x.id === i.superseded_by)?.title ?? i.superseded_by}`)
    ]
  };
}
function summarizeItem(session, item, fw) {
  const modules = ["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)];
  const answers = [];
  for (const m of modules) {
    for (const a of fw.modules[m]?.areas ?? []) {
      const e = coverageFor(session, item, a.id);
      if (!e?.updated_at) continue;
      answers.push({ area: a.id, label: areaLabel(a.id), status: e.status, value: e.value, captured: isCaptured(e) });
    }
  }
  const bands = Object.entries(item.facts).map(([fact, f]) => {
    const band = usableBand(session, item, fact);
    const dropped = band === "unknown" && f.band !== "unknown";
    return {
      fact,
      label: factLabel(fw, fact),
      text: bandText(fw, fact, band),
      unknown: band === "unknown",
      note: dropped ? `Left as not known: it rested only on a reply I didn't record properly (I'd have said "${bandText(fw, fact, f.band)}").` : null
    };
  });
  return {
    id: item.id,
    title: item.title,
    type: fw.router.types[item.type]?.label ?? item.type,
    problem: item.prose.problem_statement ?? null,
    today: item.prose.current_state ?? null,
    smallest_version: item.prose.mvp ?? null,
    out_of_scope: item.prose.out_of_scope ?? null,
    mitigation: item.prose.mitigation ?? null,
    answers,
    bands,
    acceptance: item.acceptance.map((a) => `${a.kind === "error_case" ? "If it goes wrong: " : ""}Given ${a.given}, when ${a.when}, then ${a.then}.`),
    guardrails: item.guardrails.map((g) => `${humanize(g.kind)}: ${g.text}`),
    open_questions: item.open_questions.map((q) => q.question)
  };
}
var STATUS_NOTE = {
  covered: "",
  assumed: " (my reading; please check)",
  unknown: " (not known yet)",
  not_applicable: " (doesn't apply)"
};
function summaryText(summary) {
  const out2 = [];
  for (const it of summary.items) {
    out2.push(`## ${it.title} (${it.type})`, "");
    for (const [label, text] of [["The problem", it.problem], ["Today", it.today], ["Smallest useful version", it.smallest_version], ["Out of scope", it.out_of_scope], ["How risk is reduced", it.mitigation]]) {
      if (text) out2.push(`- ${label}: ${text}`);
    }
    if (it.answers.length) {
      out2.push("", "What you told me:");
      for (const a of it.answers) {
        const value = a.value ?? "";
        out2.push(`- ${a.label}: ${value}${a.captured ? " (your words as typed; not yet confirmed)" : STATUS_NOTE[a.status]}`.trimEnd());
      }
    }
    if (it.bands.length) {
      out2.push("", "How I'd rate it:");
      for (const b of it.bands) out2.push(`- ${b.label}: ${b.text}${b.note ? `. ${b.note}` : ""}`);
    }
    if (it.acceptance.length) out2.push("", "It works when:", ...it.acceptance.map((a) => `- ${a}`));
    if (it.guardrails.length) out2.push("", "Guardrails:", ...it.guardrails.map((g) => `- ${g}`));
    if (it.open_questions.length) out2.push("", "Still open:", ...it.open_questions.map((q) => `- ${q}`));
    out2.push("");
  }
  if (summary.set_aside.length) out2.push("Set aside:", ...summary.set_aside.map((s) => `- ${s}`), "");
  return out2.join("\n").trim() + "\n";
}

// src/lib/diff.ts
function lineDiff(before, after, context = 2) {
  const a = before.split("\n");
  const b = after.split("\n");
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i2 = a.length - 1; i2 >= 0; i2--) {
    for (let j2 = b.length - 1; j2 >= 0; j2--) {
      lcs[i2][j2] = a[i2] === b[j2] ? lcs[i2 + 1][j2 + 1] + 1 : Math.max(lcs[i2 + 1][j2], lcs[i2][j2 + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push([" ", a[i]]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) ops.push(["-", a[i++]]);
    else ops.push(["+", b[j++]]);
  }
  while (i < a.length) ops.push(["-", a[i++]]);
  while (j < b.length) ops.push(["+", b[j++]]);
  const keep = ops.map((_, k) => ops.slice(Math.max(0, k - context), k + context + 1).some(([op]) => op !== " "));
  const out2 = [];
  let skipped = false;
  ops.forEach(([op, line], k) => {
    if (keep[k]) {
      out2.push(`${op} ${line}`);
      skipped = false;
    } else if (!skipped) {
      out2.push("  \u2026");
      skipped = true;
    }
  });
  return out2.join("\n");
}

// src/lib/checks.ts
var import_yaml2 = __toESM(require_dist(), 1);
import { existsSync as existsSync2, readFileSync as readFileSync2, readdirSync as readdirSync2 } from "node:fs";
import { join as join2 } from "node:path";
function readConfig(dir) {
  const file = join2(dir, ".intake-kit", "checks.json");
  if (!existsSync2(file)) return { config: DEFAULT_CONFIG, found: false };
  const raw = JSON.parse(readFileSync2(file, "utf8"));
  const config = { ...DEFAULT_CONFIG, ...raw };
  const unknown = config.enabled.filter((c) => !CHECK_IDS.includes(c));
  if (unknown.length) throw new Error(`.intake-kit/checks.json enables unknown checks: ${unknown.join(", ")}`);
  if (!Array.isArray(config.flagged_paths) || !config.flagged_paths.every((p) => typeof p === "string")) {
    throw new Error(".intake-kit/checks.json: flagged_paths must be a list of glob strings");
  }
  return { config, found: true };
}

// src/lib/state.ts
var import_yaml3 = __toESM(require_dist(), 1);
import { appendFileSync, existsSync as existsSync3, mkdirSync, readFileSync as readFileSync3, renameSync, writeFileSync } from "node:fs";
import { dirname, join as join3 } from "node:path";
import { fileURLToPath } from "node:url";
var SESSION_FILE = "intake-answers.yaml";
function paths(dir) {
  const state = join3(dir, ".intake-kit");
  return {
    session: join3(dir, SESSION_FILE),
    stateDir: state,
    marker: join3(state, "active"),
    transcript: join3(state, "transcript.jsonl"),
    turn: join3(state, "turn.json"),
    rejections: join3(state, "rejections.jsonl"),
    state: join3(state, "state.json"),
    archive: join3(state, "archive"),
    gitignore: join3(state, ".gitignore")
  };
}
var STATE_GITIGNORE = `# Local intake-kit state. Transcripts hold the user's exact words and stay on this machine.
# checks.json and check.mjs (the CI copy of the checks) are the only files here that belong in the repo.
*
!.gitignore
!checks.json
!check.mjs
`;
function ensureStateDir(dir) {
  const p = paths(dir);
  mkdirSync(p.stateDir, { recursive: true });
  if (!existsSync3(p.gitignore)) writeFileSync(p.gitignore, STATE_GITIGNORE);
}
function archive(dir, file, name) {
  const p = paths(dir);
  mkdirSync(p.archive, { recursive: true });
  const target = join3(p.archive, name);
  renameSync(file, target);
  return target;
}
function archiveText(dir, name, content) {
  const p = paths(dir);
  mkdirSync(p.archive, { recursive: true });
  const target = join3(p.archive, name);
  writeFileSync(target, content);
  return target;
}
function readTranscript(dir) {
  const file = paths(dir).transcript;
  if (!existsSync3(file)) return null;
  return readFileSync3(file, "utf8").split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
}
function writeTranscript(dir, entries) {
  writeFileSync(paths(dir).transcript, entries.map((e) => JSON.stringify(e) + "\n").join(""));
}
function readSession(dir) {
  const file = paths(dir).session;
  return existsSync3(file) ? (0, import_yaml3.parse)(readFileSync3(file, "utf8")) : null;
}
function writeSession(dir, session) {
  const header = "# Written by intake-kit. Edit with care: every SPEC and ACCEPTANCE line is rendered from this file.\n";
  writeFileSync(paths(dir).session, header + (0, import_yaml3.stringify)(session, { lineWidth: 0, aliasDuplicateObjects: false }));
}
function readRunState(dir) {
  const file = paths(dir).state;
  if (!existsSync3(file)) return { consecutive_rejections: 0 };
  return JSON.parse(readFileSync3(file, "utf8"));
}
function writeRunState(dir, state) {
  writeFileSync(paths(dir).state, JSON.stringify(state, null, 2) + "\n");
}
function pluginRoot(from = fileURLToPath(import.meta.url)) {
  let dir = dirname(from);
  for (; ; ) {
    if (existsSync3(join3(dir, ".claude-plugin", "plugin.json")) || existsSync3(join3(dir, "kit.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`intake-kit: can't find the plugin root above ${from}`);
    dir = parent;
  }
}

// src/cli/intake.ts
var out = (exitCode, body) => {
  process.stdout.write(JSON.stringify(body, null, 2) + "\n");
  process.exit(exitCode);
};
var now = () => (/* @__PURE__ */ new Date()).toISOString();
function start(dir, opts) {
  const p = paths(dir);
  const fw = loadFramework(pluginRoot());
  ensureStateDir(dir);
  const existing = readSession(dir);
  if (existing) {
    const done = existing.session.reflect_back?.confirmed === true;
    if (opts.resume && !done) {
      if (existing.session.grounding === "transcript" && !existsSync4(p.marker)) writeFileSync2(p.marker, "");
      return out(0, { result: "resumed", session_id: existing.session.id, status: statusOf(existing, fw) });
    }
    if (!opts.new) {
      return out(4, {
        result: "needs_decision",
        session_id: existing.session.id,
        complete: done,
        message: done ? `${p.session} holds a completed intake. Run start --new to begin another; the old file is archived, not deleted.` : `${p.session} holds an intake in progress. Ask the user whether to resume it (start --resume) or start over (start --new; the old file is archived, not deleted).`
      });
    }
    const archived = archive(dir, p.session, `intake-answers-${existing.session.id}.yaml`);
    const transcript = readTranscript(dir);
    if (transcript) {
      const lastCommand = transcript.map((e) => !!e.command).lastIndexOf(true);
      const keep = lastCommand >= 0 ? transcript.slice(lastCommand) : [];
      if (keep.length < transcript.length) {
        const earlier = transcript.slice(0, transcript.length - keep.length);
        archiveText(dir, `transcript-${existing.session.id}.jsonl`, earlier.map((e) => JSON.stringify(e) + "\n").join(""));
        writeTranscript(dir, keep);
      }
    }
    process.stderr.write(`archived the previous intake to ${archived}
`);
  }
  const startedAt = now();
  const seeded = () => ({ status: "unknown", value: null, quotes: [], probe_count: 0 });
  const session = {
    schema_version: 1,
    framework_version: fw.router.framework_version,
    session: {
      id: `${startedAt.slice(0, 10)}-${randomBytes(2).toString("hex")}`,
      started_at: startedAt,
      mode: opts.mode,
      provider: opts.provider,
      grounding: opts.grounding,
      reflect_back: null,
      asked: {}
    },
    core: { users: seeded(), outcome: seeded(), data: seeded(), systems: seeded(), constraints: seeded(), trust: seeded() },
    items: []
  };
  writeSession(dir, session);
  writeRunState(dir, { consecutive_rejections: 0 });
  const warnings = [];
  if (opts.grounding === "transcript") {
    if (!existsSync4(p.marker)) writeFileSync2(p.marker, "");
    if (!readTranscript(dir)?.length) {
      warnings.push("No transcript has been recorded yet, so quotes can't be verified. The prompt hook may not be installed or enabled; check /hooks. Every quoted answer will be rejected until it records the user's messages.");
    }
  }
  return out(0, { result: "started", session_id: session.session.id, session_file: p.session, warnings, status: statusOf(session, fw) });
}
function applyTurnCommand(dir, turnFile) {
  const p = paths(dir);
  const session = readSession(dir);
  if (!session) return out(4, { result: "no_session", message: "No intake in progress. Run start first." });
  if (!existsSync4(turnFile)) return out(4, { result: "no_turn", message: `Write the turn JSON to ${turnFile} first.` });
  let turn;
  try {
    turn = JSON.parse(readFileSync4(turnFile, "utf8"));
  } catch (err) {
    turn = { __unparseable: err.message };
  }
  const transcript = session.session.grounding === "transcript" ? readTranscript(dir) ?? [] : null;
  const fw = loadFramework(pluginRoot());
  const state = readRunState(dir);
  const result = applyTurn(session, turn, { fw, transcript, now: now(), lastReply: state.shown_reply ?? void 0, capture: state.consecutive_rejections > 0 });
  if (!result.applied) {
    const attempt = state.consecutive_rejections + 1;
    writeFileSync2(p.rejections, JSON.stringify({ at: now(), attempt, rejections: result.rejections }) + "\n", { flag: "a" });
    if (attempt === 1) {
      writeRunState(dir, { ...state, consecutive_rejections: 1 });
      return out(2, {
        result: "rejected",
        retry: true,
        message: "Nothing was saved. Fix these and write the whole turn again, then rerun apply-turn. Don't show the reply to the user yet.",
        rejections: result.rejections
      });
    }
    const reply = turn?.reply;
    writeRunState(dir, { consecutive_rejections: 0, shown_reply: typeof reply === "string" ? reply : null });
    return out(3, {
      result: "rejected",
      retry: false,
      message: "Rejected twice in a row, so nothing from this turn was saved. Say your reply to the user and carry on; capture these answers again on a later turn.",
      rejections: result.rejections
    });
  }
  writeSession(dir, result.session);
  writeRunState(dir, { consecutive_rejections: 0 });
  const rb = result.session.session.reflect_back;
  const proposed = !!rb && !rb.confirmed && rb.proposed_at !== session.session.reflect_back?.proposed_at;
  if (result.confirmed && existsSync4(p.marker)) rmSync(p.marker);
  return out(0, {
    result: "applied",
    scored: result.confirmed,
    ...result.confirmed ? { gates: result.session.items.map((i) => ({ item: i.id, title: i.title, decision: i.gate?.decision, reasons: i.gate?.reasons, revisit_trigger: i.gate?.revisit_trigger })) } : { status: statusOf(result.session, fw, transcript ?? []) },
    // The playback is built from the session by code, never from the model's reply.
    ...proposed ? { summary: summaryText(buildSummary(result.session, fw)) } : {}
  });
}
function renderCommand(dir, overwrite, keep) {
  const session = readSession(dir);
  if (!session) return out(4, { result: "no_session", message: "No intake in progress. Run start first." });
  if (!session.session.reflect_back?.confirmed) {
    return out(4, { result: "not_ready", message: "Nothing is rendered until the reflect-back is confirmed and the items are gated." });
  }
  const both = overwrite.filter((f) => keep.includes(f));
  if (both.length) return out(4, { result: "bad_option", message: `Use --overwrite or --keep for a file, not both: ${both.join(", ")}` });
  const root = pluginRoot();
  const checks = existsSync4(join4(paths(dir).stateDir, "checks.json")) ? readConfig(dir).config : null;
  const rendered = renderAll(session, loadFramework(root), readTemplates(root), checks);
  const unknown = [...overwrite, ...keep].filter((f) => !rendered.has(f));
  if (unknown.length) return out(4, { result: "bad_option", message: `--overwrite/--keep name files this intake doesn't render: ${unknown.join(", ")}` });
  const ledgerFile = join4(paths(dir).stateDir, "rendered.json");
  const raw = existsSync4(ledgerFile) ? JSON.parse(readFileSync4(ledgerFile, "utf8")) : {};
  const ledger = raw.written || raw.kept ? { written: raw.written ?? {}, kept: raw.kept ?? {} } : { written: raw, kept: {} };
  const hash = (text) => createHash("sha256").update(text).digest("hex");
  const write = (file, content) => {
    writeFileSync2(join4(dir, file), content);
    ledger.written[file] = hash(content);
    delete ledger.kept[file];
  };
  const staged = join4(paths(dir).stateDir, "render");
  const files = [];
  for (const [file, content] of rendered) {
    const target = join4(dir, file);
    if (!existsSync4(target)) {
      write(file, content);
      files.push({ file, status: "written" });
      continue;
    }
    const current = readFileSync4(target, "utf8").replace(/\r\n/g, "\n");
    if (current === content) {
      ledger.written[file] = hash(content);
      files.push({ file, status: "unchanged" });
    } else if (ledger.written[file] === hash(current)) {
      write(file, content);
      files.push({ file, status: "updated" });
    } else if (overwrite.includes(file)) {
      write(file, content);
      files.push({ file, status: "overwritten" });
    } else if (keep.includes(file) || ledger.kept[file] === hash(content)) {
      ledger.kept[file] = hash(content);
      files.push({ file, status: "kept" });
    } else {
      const stagedFile = join4(staged, file);
      mkdirSync2(dirname2(stagedFile), { recursive: true });
      writeFileSync2(stagedFile, content);
      files.push({ file, status: "needs_confirmation", diff: lineDiff(current, content), staged: stagedFile });
    }
  }
  mkdirSync2(paths(dir).stateDir, { recursive: true });
  writeFileSync2(ledgerFile, JSON.stringify(ledger, null, 2) + "\n");
  const pending = files.filter((f) => f.status === "needs_confirmation").map((f) => f.file);
  return out(pending.length ? 5 : 0, {
    result: pending.length ? "needs_confirmation" : "rendered",
    files,
    ...pending.length ? { message: `These files already exist and would change: ${pending.join(", ")}. Show the user each diff and ask. Then run render once with --overwrite <file> for each one they approve and --keep <file> for each one they want left as it is.` } : {}
  });
}
function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: "string" },
      turn: { type: "string" },
      mode: { type: "string", default: "stakeholder" },
      provider: { type: "string", default: "claude" },
      grounding: { type: "string", default: "transcript" },
      new: { type: "boolean", default: false },
      resume: { type: "boolean", default: false },
      overwrite: { type: "string", multiple: true, default: [] },
      keep: { type: "string", multiple: true, default: [] }
    }
  });
  const dir = values.dir ?? process.cwd();
  const [command] = positionals;
  const choice = (name, value, allowed) => {
    if (!allowed.includes(value)) out(4, { result: "bad_option", message: `--${name} must be one of ${allowed.join(", ")}` });
  };
  switch (command) {
    case "start":
      choice("mode", values.mode, ["stakeholder", "builder"]);
      choice("provider", values.provider, ["claude", "codex"]);
      choice("grounding", values.grounding, ["transcript", "unverified"]);
      if (values.new && values.resume) out(4, { result: "bad_option", message: "use --new or --resume, not both" });
      return start(dir, { mode: values.mode, provider: values.provider, grounding: values.grounding, new: values.new, resume: values.resume });
    case "apply-turn":
      return applyTurnCommand(dir, values.turn ?? paths(dir).turn);
    case "render":
      return renderCommand(dir, values.overwrite, values.keep);
    case "status": {
      const session = readSession(dir);
      if (!session) return out(4, { result: "no_session", message: "No intake in progress. Run start first." });
      return out(0, { result: "status", session_id: session.session.id, status: statusOf(session, loadFramework(pluginRoot()), readTranscript(dir) ?? []) });
    }
    case "guide":
      process.stdout.write(guide(loadFramework(pluginRoot())));
      return;
    default:
      return out(4, { result: "bad_command", message: "usage: intake.mjs start | apply-turn | render | status | guide  (see the header of src/cli/intake.ts)" });
  }
}
try {
  main();
} catch (err) {
  process.stderr.write(`intake-kit: ${err.message}
`);
  process.exit(1);
}

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

// src/cli/doctor.ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var root = join(dirname(fileURLToPath(import.meta.url)), "..");
var manifest = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
console.log(`intake-kit ${manifest.version} ready (node ${process.versions.node})`);

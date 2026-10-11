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
var version = true ? "0.1.0" : "0.0.0-dev";
console.log(`intake-kit ${version} ready (node ${process.versions.node})`);

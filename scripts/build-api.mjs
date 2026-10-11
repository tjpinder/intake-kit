// Bundles api/src/index.ts, with the kit's core, the framework YAML and SKILL.md inlined, into
// api/dist/index.js for Azure Static Web Apps managed functions (apiRuntime node:22).
// @azure/functions-core is provided by the Functions host at runtime, so it stays external.

import { build } from "esbuild";
import { rmSync } from "node:fs";

rmSync("api/dist", { recursive: true, force: true });
await build({
  entryPoints: ["api/src/index.ts"],
  outfile: "api/dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  // Bundled CommonJS (yaml, ajv, @azure/functions) calls require(); an ESM bundle has none.
  banner: { js: ['import { createRequire as __ikCreateRequire } from "node:module";', "const require = __ikCreateRequire(import.meta.url);"].join("\n") },
  target: "node22",
  external: ["@azure/functions-core"],
  loader: { ".yaml": "text", ".md": "text" },
  legalComments: "inline",
  logLevel: "warning",
});
console.log("built api/dist/index.js");

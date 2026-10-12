// Bundles each src/cli/*.ts entry, with yaml and the generated validators inlined, into a self-contained
// dist/<name>.mjs. dist/ is committed so users never install or build anything.

import { build } from "esbuild";
import { readdirSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { nodeVersionBanner } from "../src/lib/node-check.ts";
import { buildCodex, OUT as CODEX_OUT } from "./build-codex.mjs";

const entries = readdirSync("src/cli")
  .filter((f) => f.endsWith(".ts"))
  .map((f) => join("src/cli", f));

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");

for (const entry of entries) {
  await build({
    entryPoints: [entry],
    outfile: join("dist", basename(entry, ".ts") + ".mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    define: { __INTAKE_KIT_VERSION__: JSON.stringify(JSON.parse(readFileSync(".claude-plugin/plugin.json", "utf8")).version) },
    // yaml is CommonJS and calls require() internally; an ESM bundle has no require,
    // so give it one.
    banner: {
      js: [
        nodeVersionBanner(),
        'import { createRequire as __ikCreateRequire } from "node:module";',
        "const require = __ikCreateRequire(import.meta.url);",
      ].join("\n"),
    },
    legalComments: "inline",
    logLevel: "warning",
  });
}

console.log(`built ${entries.length} script(s) into dist/`);

buildCodex();
console.log(`built the Codex packaging into ${CODEX_OUT}/`);

// Regenerates tests/golden/<name>/ from the session fixtures. Dev-only: run it after an
// intentional change to templates or rendering, then review the diff before committing.
//   node scripts/update-golden.mjs

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { loadFramework, readTemplates } from "../src/lib/framework-fs.ts";
import { renderAll } from "../src/lib/render.ts";

const CASES = { "pick-exception": "tests/fixtures/session/pick-exception-scored.yaml" };
const fw = loadFramework(".");
for (const [name, fixture] of Object.entries(CASES)) {
  const dir = join("tests/golden", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const files = renderAll(parse(readFileSync(fixture, "utf8")), fw, readTemplates("."));
  for (const [file, text] of files) writeFileSync(join(dir, file), text);
  console.log(`${name}: ${[...files.keys()].join(", ")}`);
}

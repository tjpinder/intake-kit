// `node dist/doctor.mjs` — the first thing every skill runs. Prints one line the skill can
// read: the kit version and Node version, or (via the bundle banner) why it can't run.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8")) as { version: string };

console.log(`intake-kit ${manifest.version} ready (node ${process.versions.node})`);

// Records the async demo's model calls once, against a real model, so the demo replays with none.
//
//   node scripts/record-async-demo.mjs
//
// Runs every step through dist/intake.mjs in a scratch folder. When a command exits 6 (it needs a
// model call), this answers the call with Azure OpenAI (AZURE_OPENAI_DEPLOYMENT / AZURE_OPENAI_MODEL,
// default intake-kit-eval-gpt41 / gpt-4.1), saves the answer under examples/async-demo/recorded/<step>/,
// and runs the command again. Needs a clean tree; the commit goes in recorded/meta.json.

import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createAzureProvider } from "../src/llm/azure.ts";
import { DEMO, FIXED, STEPS } from "./async-demo-steps.mjs";

const SCHEMAS = Object.fromEntries(["opening", "phrase", "extract", "writeup", "ingest"].map((n) => [n, JSON.parse(readFileSync(`schema/v2/${n}.schema.json`, "utf8"))]));
const SCHEMA_OF = { classify_opening: "opening", phrase: "phrase", extract: "extract", write_up: "writeup", ingest: "ingest" };

if (execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim()) { console.error("Commit first."); process.exit(2); }
const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const env = process.env;
if (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_API_KEY) { console.error("Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY first."); process.exit(2); }
const model = env.AZURE_OPENAI_MODEL || "gpt-4.1";
const provider = createAzureProvider({ endpoint: env.AZURE_OPENAI_ENDPOINT, apiKey: env.AZURE_OPENAI_API_KEY, deployment: env.AZURE_OPENAI_DEPLOYMENT || "intake-kit-eval-gpt41", model, maxCompletionTokens: 8000, timeoutMs: 180_000 });

const out = join(DEMO, "recorded");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const main = mkdtempSync(join(tmpdir(), "intake-demo-"));
const early = join(tmpdir(), `${main.split(/[\\/]/).pop()}-early`);
const sources = resolve(DEMO, "sources");

function run(dir, args) {
  const r = spawnSync(process.execPath, [resolve("dist/intake.mjs"), ...args.map((a) => a.replace("SOURCES", sources)), "--dir", dir], { encoding: "utf8", env: { ...process.env, ...FIXED } });
  return { status: r.status, body: JSON.parse(r.stdout) };
}

for (const step of STEPS) {
  const dir = step.branch === "early" ? early : main;
  // The early branch starts as a copy of the main folder after the notes.
  if (step.branch === "early" && !existsSync(early)) cpSync(main, early, { recursive: true });
  const saved = join(out, step.id);
  for (let i = 0; ; i++) {
    const r = run(dir, step.args);
    if (r.status !== 6) {
      if (r.status !== 0) { console.error(`${step.id}: exit ${r.status}`, r.body); process.exit(1); }
      console.log(`${step.id}: ${r.body.result}`);
      break;
    }
    if (i > 10) { console.error(`${step.id}: too many calls`); process.exit(1); }
    const name = r.body.call;
    const res = await provider.complete({ system: r.body.instructions, context: r.body.input, history: [], format: { name, schema: SCHEMAS[SCHEMA_OF[name]] } });
    const answer = JSON.parse(res.text);
    for (const target of [join(dir, ".intake-kit", "calls"), saved]) {
      mkdirSync(target, { recursive: true });
      const file = join(target, `${name}.json`);
      const list = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
      writeFileSync(file, JSON.stringify([...list, answer], null, 2) + "\n");
    }
  }
}
writeFileSync(join(out, "meta.json"), JSON.stringify({ recorded_at: new Date().toISOString(), commit, model, note: "Model answers to every call the async demo makes, recorded once. Sources are synthetic." }, null, 2) + "\n");
rmSync(main, { recursive: true, force: true });
rmSync(early, { recursive: true, force: true });
console.log(`recorded on ${commit} with ${model} into ${out}`);

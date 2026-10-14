// Async intake persona evals against real models, with a hard spend cap. On demand, not in CI.
//
//   node scripts/eval-async.mjs [--personas id,id] [--formats email,notes,transcript] [--runs 1]
//     [--budget 3] [--concurrency 2] [--report docs/evals/async-report.md]
//
// The kit (ingest, write-up) runs on AZURE_OPENAI_DEPLOYMENT / AZURE_OPENAI_MODEL (default
// intake-kit-eval-gpt41 / gpt-4.1). The simulated requester writes each document on
// AZURE_SIMULATOR_DEPLOYMENT / AZURE_SIMULATOR_MODEL (default intake-kit-turn / gpt-4.1-mini).
// Every run is tied to a commit: the working tree must be clean. Writes evals/results/async-<stamp>.json.

import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { createAzureProvider } from "../src/llm/azure.ts";
import { loadPersonas } from "../src/evals/personas.ts";
import { createAzureDocumentWriter } from "../src/evals/simulator.ts";
import { asyncReport, runAsyncIntake } from "../src/evals/async-run.ts";

const { values } = parseArgs({
  options: {
    personas: { type: "string" },
    formats: { type: "string", default: "email,notes,transcript" },
    runs: { type: "string", default: "1" },
    budget: { type: "string", default: "3" },
    concurrency: { type: "string", default: "2" },
    report: { type: "string", default: "docs/evals/async-report.md" },
  },
});
const dirty = execSync("git status --porcelain --untracked-files=no", { encoding: "utf8" }).trim();
if (dirty) { console.error(`Commit first: every eval run is tied to a commit hash.\n${dirty}`); process.exit(2); }
const commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const env = process.env;
if (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_API_KEY) { console.error("Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY first."); process.exit(2); }

const kit = { endpoint: env.AZURE_OPENAI_ENDPOINT, apiKey: env.AZURE_OPENAI_API_KEY, deployment: env.AZURE_OPENAI_DEPLOYMENT || "intake-kit-eval-gpt41", model: env.AZURE_OPENAI_MODEL || "gpt-4.1" };
const sim = { ...kit, deployment: env.AZURE_SIMULATOR_DEPLOYMENT || "intake-kit-turn", model: env.AZURE_SIMULATOR_MODEL || "gpt-4.1-mini" };
const writer = createAzureDocumentWriter(sim);
const fw = loadFramework(".");
const wanted = values.personas?.split(",");
const personas = loadPersonas().filter((p) => !wanted || wanted.includes(p.id));
const formats = values.formats.split(",");
const budget = Number(values.budget);
let spent = 0;

const jobs = [];
for (const persona of personas) for (const format of formats) for (let run = 1; run <= Number(values.runs); run++) jobs.push({ persona, format, run });
console.log(`${jobs.length} async intakes (${personas.map((p) => p.id).join(", ")} x ${formats.join("/")}), budget $${budget}`);
const stamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-async-${kit.model}-${commit}`;
mkdirSync("evals/results", { recursive: true });
const records = [];
let next = 0;
async function worker() {
  while (next < jobs.length && spent < budget) {
    const { persona, format, run } = jobs[next++];
    const r = await runAsyncIntake({
      persona, format, run, kit: createAzureProvider({ ...kit, maxCompletionTokens: 8000 }), kitModel: kit.model, writer, writerModel: sim.model, fw,
      onSpend: (usd) => { spent += usd; }, shouldStop: () => spent >= budget,
    });
    records.push(r);
    appendFileSync(`evals/results/${stamp}.progress.jsonl`, JSON.stringify(r) + "\n");
    console.log(`${persona.id} ${format} #${run}: ${r.completed ? "completed" : `incomplete (${r.error})`}; ${r.session.items.map((i) => `${i.type} ${i.gate?.decision ?? "-"}`).join(", ")}; match ${r.score.gatesCorrect}; first answer ${r.firstPass.answered}/${r.firstPass.required}; follow-ups ${r.followUps}; ungrounded ${r.score.ungroundedQuotes} ($${r.costUSD.toFixed(3)}, total $${spent.toFixed(2)})`);
  }
}
await Promise.all(Array.from({ length: Number(values.concurrency) }, worker));
const notRun = next < jobs.length ? [`${jobs.length - next} intakes skipped: the $${budget} budget was reached.`] : [];
writeFileSync(`evals/results/${stamp}.json`, JSON.stringify({ stamp, commit, kitModel: kit.model, writerModel: sim.model, spentUSD: spent, records }, null, 2));
mkdirSync("docs/evals", { recursive: true });
const order = (r) => personas.findIndex((p) => p.id === r.persona) * 100 + formats.indexOf(r.format) * 10 + r.run;
writeFileSync(values.report, asyncReport(records.sort((a, b) => order(a) - order(b)), { date: new Date().toISOString().slice(0, 10), commit, kitModel: kit.model, writerModel: sim.model, notRun }));
console.log(`\ncommit ${commit}; spent $${spent.toFixed(3)}; wrote evals/results/${stamp}.json and ${values.report}`);

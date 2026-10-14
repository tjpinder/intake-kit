// Runs the persona evals against real models, with a hard spend cap. On demand, not in CI.
//
//   node scripts/eval-personas.mjs [--runs 3] [--runs-for id:n,id:n] [--budget 5] [--concurrency 2]
//     [--personas id,id] [--report path] [--extract-model gpt-4.1-mini --extract-deployment intake-kit-turn]
//
// Every run is tied to a commit: the working tree must be clean (results are gitignored), and the
// commit hash goes in the results and the report. --extract-model routes only the engine's
// extract calls to another model, to measure whether a cheaper one classifies as reliably.
//
// Needs AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY. The interviewer runs on
// AZURE_OPENAI_DEPLOYMENT / AZURE_OPENAI_MODEL (default intake-kit-eval-gpt41 / gpt-4.1, as in the
// web app). With
// ANTHROPIC_API_KEY set, also runs every persona with Claude as the interviewer (CLAUDE_MODEL,
// default claude-opus-5-5) for the parity report. The simulated user stays on gpt-4.1-mini
// (AZURE_SIMULATOR_DEPLOYMENT / AZURE_SIMULATOR_MODEL, default intake-kit-turn / gpt-4.1-mini), so
// interviewers are compared against the same simulator. Writes evals/results/<stamp>.json (full
// transcripts) and the report (default docs/evals/persona-report.md).

import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { createAzureProvider } from "../src/llm/azure.ts";
import { createClaudeProvider } from "../src/llm/anthropic.ts";
import { loadPersonas } from "../src/evals/personas.ts";
import { createAzureSimulator } from "../src/evals/simulator.ts";
import { report, runInterview } from "../src/evals/run.ts";

const { values } = parseArgs({
  options: {
    runs: { type: "string", default: "3" },
    budget: { type: "string", default: "5" },
    concurrency: { type: "string", default: "2" },
    personas: { type: "string" },
    report: { type: "string", default: "docs/evals/persona-report.md" },
    "runs-for": { type: "string" },
    "extract-model": { type: "string" },
    "extract-deployment": { type: "string" },
  },
});
const runs = Number(values.runs);
const budget = Number(values.budget);
const concurrency = Number(values.concurrency);

const dirty = execSync("git status --porcelain --untracked-files=no", { encoding: "utf8" }).trim();
if (dirty) {
  console.error(`Commit first: every gate run is tied to a commit hash.
${dirty}`);
  process.exit(2);
}
const commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const runsFor = Object.fromEntries((values["runs-for"] ?? "").split(",").filter(Boolean).map((p) => { const [id, n] = p.split(":"); return [id, Number(n)]; }));

const env = process.env;
if (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_API_KEY) {
  console.error("Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY first.");
  process.exit(2);
}
const azure = { endpoint: env.AZURE_OPENAI_ENDPOINT, apiKey: env.AZURE_OPENAI_API_KEY, deployment: env.AZURE_OPENAI_DEPLOYMENT || "intake-kit-eval-gpt41", model: env.AZURE_OPENAI_MODEL || "gpt-4.1" };
const claudeModel = env.CLAUDE_MODEL || "claude-opus-5-5";

const fw = loadFramework(".");
const skill = readFileSync("skills/intake/SKILL.md", "utf8");
const wanted = values.personas?.split(",");
const personas = loadPersonas().filter((p) => !wanted || wanted.includes(p.id));
const simAzure = { ...azure, deployment: env.AZURE_SIMULATOR_DEPLOYMENT || "intake-kit-turn", model: env.AZURE_SIMULATOR_MODEL || "gpt-4.1-mini" };
const simulator = createAzureSimulator(simAzure);

// Optionally, only the extract calls go to another deployment (a narrow classifier may not need the big model).
const extractAzure = values["extract-model"] ? { ...azure, deployment: values["extract-deployment"] ?? "intake-kit-turn", model: values["extract-model"] } : null;
const withExtract = (main) => {
  if (!extractAzure) return main;
  const ex = createAzureProvider({ ...extractAzure, maxCompletionTokens: 8000 });
  return { name: main.name, complete: (req, signal) => (req.format?.name === "extract" ? ex : main).complete(req, signal) };
};
const interviewers = [{ name: "azure-openai", model: azure.model, make: () => withExtract(createAzureProvider({ ...azure, maxCompletionTokens: 8000 })) }];
const notRun = [];
if (env.ANTHROPIC_API_KEY) interviewers.push({ name: "claude", model: claudeModel, make: () => createClaudeProvider({ apiKey: env.ANTHROPIC_API_KEY, model: claudeModel }) });
else notRun.push("Claude as interviewer: no ANTHROPIC_API_KEY was set, so the parity comparison covers Azure OpenAI only.");

let spent = 0;
const jobs = [];
for (const iv of interviewers) for (const persona of personas) for (let run = 1; run <= (runsFor[persona.id] ?? runs); run++) jobs.push({ iv, persona, run });
console.log(`${jobs.length} interviews (${personas.length} personas x ${runs} runs x ${interviewers.length} interviewer${interviewers.length > 1 ? "s" : ""}), budget $${budget}, concurrency ${concurrency}`);

const records = [];
let next = 0;
// Each interview is appended here as it finishes, so a long run can be inspected mid-way.
const stamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${azure.model}-${commit}`; // model and commit keep parallel runs apart
mkdirSync("evals/results", { recursive: true });
const progressFile = `evals/results/${stamp}.progress.jsonl`;
async function worker() {
  while (next < jobs.length && spent < budget) {
    const { iv, persona, run } = jobs[next++];
    const record = await runInterview({
      persona, run, interviewer: iv.make(), interviewerModel: iv.model, simulator, simulatorModel: simAzure.model, fw, skill,
      onSpend: (usd) => { spent += usd; },
      shouldStop: () => spent >= budget,
    });
    records.push(record);
    appendFileSync(progressFile, JSON.stringify(record) + "\n");
    const s = record.score;
    console.log(`${iv.name} ${persona.id} #${run}: ${record.completed ? "completed" : "incomplete"} in ${record.turns} turns, ` +
      `gate ${record.session.items[0]?.gate?.decision ?? "-"}, ${s.notes.length ? s.notes.join("; ") : "all checks passed"} ($${record.costUSD.toFixed(3)}, total $${spent.toFixed(2)})`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
if (next < jobs.length) notRun.push(`${jobs.length - next} interviews skipped: the $${budget} budget was reached.`);

writeFileSync(`evals/results/${stamp}.json`, JSON.stringify({ stamp, commit, azureModel: azure.model, extractModel: extractAzure?.model ?? null, spentUSD: spent, records }, null, 2));
mkdirSync("docs/evals", { recursive: true });
const order = (r) => interviewers.findIndex((i) => i.name === r.provider) * 1000 + personas.findIndex((p) => p.id === r.persona) * 10 + r.run;
writeFileSync(values.report, report(records.sort((a, b) => order(a) - order(b)), {
  date: new Date().toISOString().slice(0, 10), commit, interviewerModel: interviewers.map((i) => i.model).join(" and ") + (extractAzure ? ` (extract on ${extractAzure.model})` : ""), simulatorModel: simAzure.model, notRun,
}));
console.log(`\ncommit ${commit}; spent $${spent.toFixed(3)}; wrote evals/results/${stamp}.json and ${values.report}`);

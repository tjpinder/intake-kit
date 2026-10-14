// Real-model smoke test for async ingest (HANDOFF.md, "Async intake mode"). Synthetic sources only.
// Three sources in order: an email reply, terse meeting notes that disagree with it on one point,
// and a follow-up transcript that settles it. Records what each model filled, dropped and flagged.
//   source the eval env first; node evals/smoke-ingest.ts
// Results go to evals/results/ (gitignored), tied to the commit.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { createAzureProvider } from "../src/llm/azure.ts";
import { costUSD } from "../src/llm/pricing.ts";
import { runIngest, startAsync } from "../src/engine/ingest.ts";
import { findGaps } from "../src/engine/gaps.ts";
import { entryOf } from "../src/engine/apply.ts";
import { areaKey } from "../src/engine/plan.ts";
import type { Session } from "../src/lib/session.ts";

const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim();
if (dirty) { console.error("Commit first: the smoke test records the commit it ran on."); process.exit(1); }
const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const env = process.env;
if (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_API_KEY) { console.error("Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY first."); process.exit(1); }

const REPLY = `Hi Tom,

Answers below, sorry it's a bit of a ramble.

What we'd do with it: the shift leads would use it every Tuesday to pick which pickers get pulled for retraining. Right now they mostly guess.

Who: I build the current version, the three shift leads use it, and Priya (DC manager) signs off on any retraining.

Today it takes me about four hours every Monday morning to put together in Excel, by hand, from a WMS export. If it works, I'd like short picks per picker down by a third within two months.

Data: everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations.

Counting: a short pick is when the confirmed quantity is less than the task quantity. Cancelled lines don't count. I think wrong-location scans should count too but I'm not totally sure, Priya might know.

We also get over picks. An over pick is when someone physically takes more than the ticket says - the system never sees it because they confirm the ticket quantity. Last week order 5521's ticket said 12 and 14 came off the slot, so that's 2 over picked.

The WMS dashboard only shows building totals, nothing per picker.

If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet.

Thanks,
Sam`;

const NOTES = `Call w/ Priya (DC mgr), 15 min
- wants report by 6am, not 7 - night shift leads leave at 6:30
- if dashboard and report disagree, WMS pick confirmations win
- wrong-location scans: YES count them
- per picker per shift per day`;

const FOLLOWUP = `Tom: Sam said 7am and Priya said 6am. Which is it?
Sam: Priya's right, 6am. The night leads need it before they leave.`;

const EXPECT_AFTER_REPLY = ["data_report.decision", "core.users", "core.outcome", "core.data", "core.systems", "core.trust", "data_report.definition", "data_report.existing"];

async function run(label: string, deployment: string, model: string) {
  const fw = loadFramework(".");
  const provider = createAzureProvider({ endpoint: env.AZURE_OPENAI_ENDPOINT!, apiKey: env.AZURE_OPENAI_API_KEY!, deployment, model, maxCompletionTokens: 8000 });
  let s: Session = startAsync(fw, { id: "2026-10-14-5a0e", request: "A daily short-pick report per picker so the shift leads can target retraining", type: "data_report", from: "Sam (ops supervisor)", provider: "azure-openai", now: new Date().toISOString() });
  const steps: Array<{ kind: "reply" | "notes" | "transcript"; from: string; text: string }> = [
    { kind: "reply", from: "Sam (ops supervisor)", text: REPLY },
    { kind: "notes", from: "Tom", text: NOTES },
    { kind: "transcript", from: "Sam (ops supervisor)", text: FOLLOWUP },
  ];
  const record: Record<string, unknown>[] = [];
  let spent = 0;
  for (const step of steps) {
    const out = await runIngest({ provider, fw, session: s, source: step, now: new Date().toISOString() });
    spent += out.calls.reduce((n, c) => n + costUSD(model, c.usage), 0);
    s = out.session;
    const item = s.items[0];
    const covered = [...new Set([...Object.keys(s.core).map((k) => `core.${k}`), ...Object.keys(item.coverage)])].filter((id) => { const e = entryOf(s, item, id); return e && e.status !== "unknown"; });
    record.push({
      source: step.kind,
      result: out.result,
      calls_ok: out.calls.filter((c) => c.ok).length,
      calls_bad: out.calls.filter((c) => !c.ok).map((c) => c.problem),
      dropped: out.events.filter((e) => /no quote from the source|not in the source|no words from the source|doesn't apply/.test(e)),
      events: out.events,
      covered,
      statuses: Object.fromEntries(covered.map((id) => [id, entryOf(s, item, id)!.status])),
      conflicts: Object.entries(s.session.engine!.areas).filter(([, v]) => v.conflict).map(([k, v]) => ({ area: k, ...v.conflict })),
      checks: s.session.engine!.checks,
      terms: (s.terms ?? []).map((t) => ({ term: t.term, status: t.status, kind: t.kind, measurable: t.measurable, examples: t.examples, definition: t.definition })),
      items: s.items.map((i) => `${i.id}:${i.type}`),
      delivery: entryOf(s, item, "data_report.delivery")?.value ?? null,
      open_gaps: findGaps(s, fw).gaps.length,
    });
  }
  const afterReply = record[0].covered as string[];
  const recall = EXPECT_AFTER_REPLY.filter((id) => afterReply.includes(id));
  return { label, model, deployment, spentUSD: Number(spent.toFixed(4)), recall_after_reply: `${recall.length}/${EXPECT_AFTER_REPLY.length}`, missing_after_reply: EXPECT_AFTER_REPLY.filter((id) => !afterReply.includes(id)), steps: record, conflict_key: areaKey(s.items[0], "data_report.delivery") };
}

const runs = [];
runs.push(await run("gpt-4.1", env.AZURE_OPENAI_DEPLOYMENT || "intake-kit-eval-gpt41", env.AZURE_OPENAI_MODEL || "gpt-4.1"));
runs.push(await run("gpt-4.1-mini", "intake-kit-turn", "gpt-4.1-mini"));
mkdirSync("evals/results", { recursive: true });
const file = `evals/results/smoke-ingest-${new Date().toISOString().replace(/[:.]/g, "-")}-${commit}.json`;
writeFileSync(file, JSON.stringify({ commit, runs }, null, 2));
console.log(JSON.stringify({ commit, file, runs: runs.map((r) => ({ label: r.label, spentUSD: r.spentUSD, recall_after_reply: r.recall_after_reply, missing_after_reply: r.missing_after_reply })) }, null, 2));

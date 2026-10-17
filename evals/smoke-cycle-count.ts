// Real-model smoke test for async ingest on the cycle-count scenario (Tom's live web test, Oct 16-17):
// a request with a $500 threshold, the requester's reply, and the controller's call notes that
// disagree on the threshold and on how a variance is calculated. Synthetic sources only.
// Records which areas each paste filled, which answers code dropped and why, the conflicts, the
// items, and the round-2 packet.
//   source the eval env first; node evals/smoke-cycle-count.ts
// Results go to evals/results/ (gitignored), tied to the commit.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { createAzureProvider } from "../src/llm/azure.ts";
import { costUSD } from "../src/llm/pricing.ts";
import { runIngest, startAsync } from "../src/engine/ingest.ts";
import { findGaps, followUpEmail } from "../src/engine/gaps.ts";
import { entryOf } from "../src/engine/apply.ts";
import type { Session } from "../src/lib/session.ts";

const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const dirty = !!execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim();
const env = process.env;
if (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_API_KEY) { console.error("Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY first."); process.exit(1); }

export const REQUEST = "Cycle count variances over $500 should go to the controller each week";

export const REPLY = `Hi,

Happy to help. We use it to decide which locations get recounted and which variances get written off, so the controller isn't approving adjustments blind.

Right now I pull the counts from the WMS every morning, paste them into Excel next to the item cost and sort by the biggest swings. It takes me about an hour and a half a day.

Cost lives in the ERP and counts live in the WMS. If the two disagree, the WMS count is the one we trust, since that's what was physically counted.

A variance is the units off times the cost, I think. Mike might calculate it differently.

The inventory team leads and I use it; Mike (the controller) signs off on write-offs. It needs to be in my inbox by 7am so the leads can plan the recounts before the first shift.

If the report said a location was fine and the auditors found it off, we'd stop trusting it and go back to my sheet.

Dana`;

export const NOTES = `Call with Mike (controller), 20 min
- anything over $250 should come to him, not $500 - audit flagged smaller ones last quarter
- variance = absolute value per SKU, not net across locations
- weekly is fine for him, but he wants the detail by location`;

async function run() {
  const fw = loadFramework(".");
  const model = env.AZURE_OPENAI_MODEL || "gpt-4.1";
  const provider = createAzureProvider({ endpoint: env.AZURE_OPENAI_ENDPOINT!, apiKey: env.AZURE_OPENAI_API_KEY!, deployment: env.AZURE_OPENAI_DEPLOYMENT || "intake-kit-eval-gpt41", model, maxCompletionTokens: 8000 });
  let s: Session = startAsync(fw, { id: "2026-10-17-cc01", request: REQUEST, type: "data_report", from: "Dana (inventory manager)", provider: "azure-openai", now: new Date().toISOString() });
  const steps = [
    { kind: "reply" as const, from: "Dana (inventory manager)", text: REPLY },
    { kind: "notes" as const, from: "Mike (controller)", text: NOTES },
  ];
  const record: Record<string, unknown>[] = [];
  let spent = 0;
  for (const step of steps) {
    const out = await runIngest({ provider, fw, session: s, source: step, now: new Date().toISOString() });
    spent += out.calls.reduce((n, c) => n + costUSD(model, c.usage), 0);
    s = out.session;
    const item = s.items[0];
    const ids = [...new Set([...Object.keys(s.core).map((k) => `core.${k}`), ...Object.keys(item.coverage)])];
    record.push({
      source: step.kind,
      result: out.result,
      returned: out.calls.filter((c) => c.ok).flatMap((c) => (JSON.parse(c.text).answers as Array<{ item: string; area: string; status: string; quotes: string[]; conflict: boolean }>).map((a) => `${a.item}:${a.area} ${a.status}${a.conflict ? " CONFLICT" : ""} <- ${JSON.stringify(a.quotes)}`)),
      events: out.events,
      filled: ids.filter((id) => { const e = entryOf(s, item, id); return e && e.status !== "unknown"; }).map((id) => `${id}=${entryOf(s, item, id)!.status}`),
      conflicts: Object.entries(s.session.engine!.areas).filter(([, v]) => v.conflict).map(([k, v]) => `${k}: ${v.conflict!.value}`),
      items: s.items.map((i) => `${i.id} ${i.type} "${i.title}"`),
      terms: (s.terms ?? []).map((t) => `${t.term} ${t.status}${t.conflict ? " CONFLICT" : ""}`),
    });
  }
  const gaps = findGaps(s, fw);
  return { commit, dirty, model, spentUSD: Number(spent.toFixed(4)), steps: record, followUp: followUpEmail(s, gaps) };
}

const result = await run();
mkdirSync("evals/results", { recursive: true });
const file = `evals/results/smoke-cycle-count-${new Date().toISOString().replace(/[:.]/g, "-")}-${commit}${dirty ? "-dirty" : ""}.json`;
writeFileSync(file, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ file, ...result }, null, 2));

// Async intake: gaps and the follow-up packet (HANDOFF.md, "Async intake mode", step 4). Code only;
// ingest output is scripted.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import type { Session } from "../src/lib/session.ts";
import { runIngest, startAsync } from "../src/engine/ingest.ts";
import { findGaps, followUpEmail, readinessLines } from "../src/engine/gaps.ts";
import { queueFor } from "../src/engine/plan.ts";
import { setEntry } from "../src/engine/apply.ts";
import { MANUAL_QUESTION } from "../src/engine/turn.ts";
import type { Provider } from "../src/llm/types.ts";

const fw = loadFramework(".");
const NOW = "2026-10-14T12:00:00.000Z";
const triaged = (): Session => startAsync(fw, { id: "2026-10-14-a5c1", request: "A daily short-pick report per picker for the shift leads", type: "data_report", from: "Ops supervisor", provider: "azure-openai", now: NOW });
const one = (out: unknown): Provider => ({ name: "azure-openai", async complete() { return { text: JSON.stringify(out), usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 }, model: "scripted" }; } });
const ingest = (session: Session, text: string, out: Partial<{ answers: unknown[]; checks: unknown[]; terms: unknown[]; definitions: unknown[] }>, from = "Ops supervisor") =>
  runIngest({ provider: one({ answers: [], checks: [], terms: [], definitions: [], ...out }), fw, session, source: { kind: "reply", from, text }, now: NOW }).then((r) => r.session);
const ans = (area: string, quote: string, over: Record<string, unknown> = {}) => ({ item: "item-1", area, status: "answered", value: `v ${area}`, quotes: [quote], conflict: false, ...over });

/** Every required area answered with a number somewhere, and every check settled. */
function complete(): Session {
  const s = triaged();
  const item = s.items[0];
  for (const area of queueFor(item, fw)) setEntry(s, item, area, { status: "covered", value: "v", quotes: ["about four hours every Monday"], probe_count: 0, updated_at: NOW });
  for (const c of ["manual_work", "existing_asset", "kill_criteria"]) s.session.engine!.checks[`item-1:${c}`] = { asks: 1, result: "no" };
  return s;
}

describe("gaps and the follow-up packet", () => {
  test("right after triage, every required area is open, in the interview's order, plus the checks", () => {
    const s = triaged();
    const r = findGaps(s, fw);
    const queue = queueFor(s.items[0], fw);
    assert.deepEqual(r.gaps.filter((g) => g.kind === "unknown").map((g) => g.target), queue);
    assert.deepEqual(r.gaps.filter((g) => g.kind === "check").map((g) => g.target), ["manual_work", "kill_criteria"]);
    assert.ok(r.gaps.some((g) => g.question === MANUAL_QUESTION));
    assert.equal(r.readiness[0].answered, 0);
    assert.equal(r.readiness[0].required, queue.length);
  });

  test("nothing already answered is asked again; partial and disagreeing answers come back quoted", async () => {
    const text = "We'd use it to pick who gets retraining each week.\n\nI think wrong-location scans count, not sure.\n\nThe leads use it.";
    let s = await ingest(triaged(), text, { answers: [
      ans("data_report.decision", "pick who gets retraining each week"),
      ans("data_report.definition", "I think wrong-location scans count, not sure.", { status: "partial" }),
      ans("core.users", "The leads use it."),
    ] });
    s = await ingest(s, "It's really for the monthly site review.", { answers: [ans("data_report.decision", "for the monthly site review", { value: "Monthly site review", conflict: true })] }, "Site manager");
    const r = findGaps(s, fw);
    assert.ok(!r.gaps.some((g) => g.target === "core.users"), "an answered area isn't asked again");
    const partial = r.gaps.find((g) => g.target === "data_report.definition")!;
    assert.equal(partial.kind, "partial");
    assert.match(partial.question, /^You mentioned "I think wrong-location scans count, not sure\."/);
    const conflict = r.gaps.find((g) => g.target === "data_report.decision")!;
    assert.equal(conflict.kind, "conflict");
    assert.match(conflict.question, /"v data_report.decision" and "Monthly site review"\. Which is right\?/);
    const email = followUpEmail(s, r);
    for (const g of r.gaps) assert.ok(email.includes(g.question));
    assert.ok(!email.includes(fw.areas.get("core.users")!.packet.ask));
  });

  test("a follow-up answer settles a disagreement, and the gap goes away", async () => {
    let s = await ingest(triaged(), "We'd use it to pick who gets retraining each week.", { answers: [ans("data_report.decision", "pick who gets retraining each week")] });
    s = await ingest(s, "It's for the monthly site review.", { answers: [ans("data_report.decision", "for the monthly site review", { conflict: true })] });
    assert.ok(findGaps(s, fw).gaps.some((g) => g.kind === "conflict"));
    s = await ingest(s, "Retraining is the point; the site review just reads it.", { answers: [ans("data_report.decision", "Retraining is the point", { value: "Choose who to retrain" })] });
    assert.ok(!findGaps(s, fw).gaps.some((g) => g.kind === "conflict"));
    assert.equal(s.items[0].coverage["data_report.decision"].value, "Choose who to retrain");
  });

  test("an unconfirmed term, and a baseline with no number, are asked", async () => {
    const s = await ingest(triaged(), "Over picks are killing us. We want fewer of them.", {
      answers: [ans("core.outcome", "We want fewer of them.")],
      terms: [{ term: "over pick", quote: "Over picks", kind: "metric" }],
    });
    const r = findGaps(s, fw);
    assert.match(r.gaps.find((g) => g.kind === "term")!.question, /what counts as "over pick"/);
    assert.ok(r.gaps.some((g) => g.kind === "baseline"));
    assert.ok(readinessLines(r)[0].includes('"over pick": no confirmed definition'));
  });

  test("when everything is answered and settled, there's no follow-up and the item is ready for the summary", () => {
    const r = findGaps(complete(), fw);
    assert.deepEqual(r.gaps, []);
    assert.equal(followUpEmail(complete(), r), "");
    assert.match(readinessLines(r)[0], /ready for the summary/);
  });
});

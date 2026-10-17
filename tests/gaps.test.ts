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
const readRequest = (s: Session) => { s.session.engine!.request_read = true; return s; };
const triaged = (): Session => readRequest(startAsync(fw, { id: "2026-10-14-a5c1", request: "A daily short-pick report per picker for the shift leads", type: "data_report", from: "Ops supervisor", provider: "azure-openai", now: NOW }));
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
    assert.match(partial.question, /^Ops supervisor wrote: "I think wrong-location scans count, not sure\." Could you say more\?/);
    const conflict = r.gaps.find((g) => g.target === "data_report.decision")!;
    assert.equal(conflict.kind, "conflict");
    assert.match(conflict.question, /Ops supervisor wrote: "pick who gets retraining each week"\. Site manager wrote: "for the monthly site review"\. Which is right\?/);
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
    assert.match(r.gaps.find((g) => g.kind === "term")!.question, /How exactly do you calculate over pick\?/);
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

describe("one question per definition (live test: the area and the term both asked)", () => {
  test("an open metric term's question replaces the item's generic definition question, and names the term", async () => {
    const s = await ingest(triaged(), "We track cycle count variances.\n\nI think a variance is the units off.", {
      answers: [ans("data_report.definition", "I think a variance is the units off.", { status: "partial" })],
      terms: [{ term: "variance", quote: "cycle count variances", kind: "metric" }],
    });
    const r = findGaps(s, fw);
    assert.ok(!r.gaps.some((g) => g.target === "data_report.definition"), "the generic area question is merged away");
    const q = r.gaps.filter((g) => g.kind === "term");
    assert.equal(q.length, 1);
    assert.match(q[0].question, /^How exactly do you calculate variance\?/);
  });
});

describe("a disagreement on an optional area is asked too (worked example: 6am vs 7am landed on delivery)", () => {
  test("a conflict on an optional area goes in the round-2 packet", async () => {
    let s = await ingest(triaged(), "It needs to be there by 7am when I get in.", { answers: [ans("data_report.delivery", "It needs to be there by 7am", { value: "Ready by 7am" })] });
    s = await ingest(s, "- wants report by 6am, not 7", { answers: [ans("data_report.delivery", "wants report by 6am", { value: "Ready by 6am", conflict: true })] }, "Priya");
    const g = findGaps(s, fw).gaps.find((x) => x.target === "data_report.delivery")!;
    assert.equal(g.kind, "conflict");
    assert.match(g.question, /Ops supervisor wrote: "It needs to be there by 7am"\. Priya wrote: "wants report by 6am"\. Which is right\?/);
  });
});

describe("each thing is asked once (cycle-count test: 11 questions with repeats)", () => {
  test("one sentence offered for two areas is quoted back once, with both areas' questions", async () => {
    const said = "We recount because the auditors sample our biggest variances.";
    const s = await ingest(triaged(), said, { answers: [
      ans("core.constraints", "because the auditors sample our biggest variances", { status: "partial", value: "Auditors sample variances" }),
      ans("core.trust", "because the auditors sample our biggest variances", { status: "partial", value: "Auditors sample variances" }),
    ] });
    const gaps = findGaps(s, fw).gaps;
    const quoted = gaps.filter((g) => g.question.includes("auditors sample"));
    assert.equal(quoted.length, 1);
    assert.ok(quoted[0].question.includes(`Also: ${fw.areas.get("core.trust")!.packet.ask}`));
  });

  test("the same disagreement filed under two areas is asked once", async () => {
    let s = await ingest(triaged(), "Counts come from the WMS and costs from the ERP.", { answers: [
      ans("core.data", "Counts come from the WMS and costs from the ERP.", { value: "WMS counts, ERP costs" }),
      ans("data_report.truth", "Counts come from the WMS and costs from the ERP.", { value: "WMS counts, ERP costs" }),
    ] });
    s = await ingest(s, "Cost should be standard cost from the ERP.", { answers: [
      ans("core.data", "Cost should be standard cost from the ERP.", { value: "Standard cost from the ERP", conflict: true }),
      ans("data_report.truth", "Cost should be standard cost from the ERP.", { value: "Standard cost from the ERP", conflict: true }),
    ] });
    assert.equal(findGaps(s, fw).gaps.filter((g) => g.kind === "conflict").length, 1);
  });
});

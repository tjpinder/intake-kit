// Async intake: triage and ingest (HANDOFF.md, "Async intake mode", steps 1 and 3). The model's
// output is scripted; nothing here calls a model.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { validateSession } from "../src/lib/schemas.ts";
import type { Session } from "../src/lib/session.ts";
import { chunks, runIngest, sourceTranscript, startAsync } from "../src/engine/ingest.ts";
import { findGaps } from "../src/engine/gaps.ts";
import type { Provider, TurnRequest } from "../src/llm/types.ts";

const fw = loadFramework(".");
const NOW = "2026-10-14T12:00:00.000Z";
const LATER = "2026-10-15T12:00:00.000Z";

function scripted(outputs: unknown[]): Provider & { requests: TurnRequest[] } {
  const queue = [...outputs];
  const requests: TurnRequest[] = [];
  return {
    name: "azure-openai",
    requests,
    async complete(req) {
      requests.push(req);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return { text: typeof next === "string" ? next : JSON.stringify(next), usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 }, model: "scripted" };
    },
  };
}

// Most tests here aren't about the request line, so they start with it already read.
const readRequest = (s: Session) => { s.session.engine!.request_read = true; return s; };
const fresh = (): Session => startAsync(fw, { id: "2026-10-14-a5c1", request: "A daily short-pick report per picker for the shift leads", type: "data_report", from: "Ops supervisor", provider: "azure-openai", now: NOW });
const triaged = (): Session => readRequest(fresh());

const REPLY = [
  "We'd use it to pick who gets retraining each week.",
  "Short picks count, cancelled lines don't. I think wrong-location scans count too, but check with Dana.",
  "Nothing here is done by hand anymore.",
  "If the counts disagreed with the WMS for two weeks we'd switch it off.",
].join("\n\n");
const answer = (area: string, quotes: string[], over: Record<string, unknown> = {}) => ({ item: "item-1", area, status: "answered", value: `value for ${area}`, quotes, conflict: false, ...over });
const ingestOut = (answers: unknown[], checks: unknown[] = [], terms: unknown[] = [], definitions: unknown[] = []) => ({ answers, checks, terms, definitions });

describe("triage", () => {
  test("starts a valid async session with the request as its first source; no model call", () => {
    const s = triaged();
    assert.equal(s.schema_version, 2);
    assert.equal(s.session.channel, "async");
    assert.equal(s.session.engine!.phase, "collecting");
    assert.deepEqual(s.session.sources!.map((x) => x.kind), ["request"]);
    assert.equal(s.items[0].type, "data_report");
    assert.equal(validateSession(s).ok, true, validateSession(s).errors.join("; "));
  });
});

describe("ingest", () => {
  test("answers with quotes from the source are covered, and each quote records its source", async () => {
    const provider = scripted([ingestOut([answer("data_report.decision", ["pick who gets retraining each week"])])]);
    const out = await runIngest({ provider, fw, session: triaged(), source: { kind: "reply", from: "Ops supervisor", text: REPLY }, now: LATER });
    assert.equal(out.result, "applied");
    const e = out.session.items[0].coverage["data_report.decision"];
    assert.equal(e.status, "covered");
    assert.deepEqual(e.quote_sources, { "pick who gets retraining each week": "src-2" });
    assert.ok(out.session.session.asked!["item-1:data_report.decision"]);
    assert.equal(validateSession(out.session).ok, true, validateSession(out.session).errors.join("; "));
  });

  test("a quote that isn't in the source is dropped, and an answer left with none isn't recorded", async () => {
    const provider = scripted([ingestOut([answer("core.users", ["the three shift leads use it"]), answer("data_report.decision", ["pick who gets retraining each week", "made-up words"])])]);
    const out = await runIngest({ provider, fw, session: triaged(), source: { kind: "reply", from: "Ops supervisor", text: REPLY }, now: LATER });
    assert.equal(out.session.core.users.status, "unknown");
    assert.ok(out.events.some((e) => e.includes("core.users: no quote from the source")));
    assert.deepEqual(out.session.items[0].coverage["data_report.decision"].quotes, ["pick who gets retraining each week"]);
  });

  test("a partial answer is assumed, and flagged for the follow-up", async () => {
    const provider = scripted([ingestOut([answer("data_report.definition", ["I think wrong-location scans count too, but check with Dana"], { status: "partial" })])]);
    const out = await runIngest({ provider, fw, session: triaged(), source: { kind: "notes", from: "Ops supervisor", text: REPLY }, now: LATER });
    assert.equal(out.session.items[0].coverage["data_report.definition"].status, "assumed");
    assert.ok(out.session.session.engine!.areas["item-1:data_report.definition"].partial);
  });

  test("a later source never silently overwrites: a disagreement is kept as a conflict, agreement adds its quotes", async () => {
    const first = await runIngest({ provider: scripted([ingestOut([answer("data_report.decision", ["pick who gets retraining each week"], { value: "Pick who to retrain" })])]), fw, session: triaged(), source: { kind: "reply", from: "Ops supervisor", text: REPLY }, now: LATER });
    const second = "Actually the report is for the site manager's monthly review, not retraining.";
    const conflicted = await runIngest({ provider: scripted([ingestOut([answer("data_report.decision", ["for the site manager's monthly review"], { value: "Monthly site review", conflict: true })])]), fw, session: first.session, source: { kind: "transcript", from: "Site manager", text: second }, now: LATER });
    const e = conflicted.session.items[0].coverage["data_report.decision"];
    assert.equal(e.value, "Pick who to retrain");
    assert.deepEqual(conflicted.session.session.engine!.areas["item-1:data_report.decision"].conflict, { value: "Monthly site review", quote: "for the site manager's monthly review", source: "src-3" });

    const agreeing = "Yes, it's so we know who to retrain.";
    const agreed = await runIngest({ provider: scripted([ingestOut([answer("data_report.decision", ["so we know who to retrain"])])]), fw, session: first.session, source: { kind: "reply", from: "Ops supervisor", text: agreeing }, now: LATER });
    const a = agreed.session.items[0].coverage["data_report.decision"];
    assert.equal(a.value, "Pick who to retrain");
    assert.deepEqual(a.quotes, ["pick who gets retraining each week", "so we know who to retrain"]);
    assert.deepEqual(a.quote_sources, { "pick who gets retraining each week": "src-2", "so we know who to retrain": "src-3" });
  });

  test("not applicable or declined never replaces a recorded answer", async () => {
    const first = await runIngest({ provider: scripted([ingestOut([answer("data_report.decision", ["pick who gets retraining each week"])])]), fw, session: triaged(), source: { kind: "reply", from: "x", text: REPLY }, now: LATER });
    const out = await runIngest({ provider: scripted([ingestOut([answer("data_report.decision", [], { status: "declined", value: null })])]), fw, session: first.session, source: { kind: "reply", from: "x", text: "No idea." }, now: LATER });
    assert.equal(out.session.items[0].coverage["data_report.decision"].status, "covered");
  });

  test("checks: a grounded yes on manual work spawns the follow-on item; the kill-criteria answer is kept", async () => {
    const text = "Every Monday I still build the sheet by hand in Excel.\n\nIf the counts disagreed with the WMS for two weeks we'd switch it off.";
    const provider = scripted([ingestOut([], [
      { item: "item-1", check: "manual_work", result: "yes", value: "The Monday sheet", quote: "Every Monday I still build the sheet by hand in Excel." },
      { item: "item-1", check: "kill_criteria", result: "yes", value: "WMS disagreement for two weeks", quote: "If the counts disagreed with the WMS for two weeks we'd switch it off." },
      { item: "item-1", check: "existing_asset", result: "unclear", value: null, quote: null },
    ])]);
    const out = await runIngest({ provider, fw, session: triaged(), source: { kind: "reply", from: "x", text }, now: LATER });
    assert.deepEqual(out.session.items.map((i) => i.type), ["data_report", "manual_process"]);
    assert.equal(out.session.items[1].spawned_from, "item-1");
    assert.equal(out.session.session.engine!.checks["item-1:kill_criteria"].value, "WMS disagreement for two weeks");
    assert.ok(out.session.core.trust.quotes.includes("If the counts disagreed with the WMS for two weeks we'd switch it off."));
    assert.equal(out.session.core.trust.quote_sources?.["If the counts disagreed with the WMS for two weeks we'd switch it off."], "src-2");
    assert.deepEqual(out.session.session.engine!.checks["item-1:existing_asset"], { asks: 1, result: null });
    assert.equal(validateSession(out.session).ok, true, validateSession(out.session).errors.join("; "));
  });

  test("the model sees every area with what's recorded so far, and the source as data", async () => {
    const provider = scripted([ingestOut([])]);
    await runIngest({ provider, fw, session: triaged(), source: { kind: "notes", from: "Dana", text: REPLY }, now: LATER });
    const ctx = provider.requests[0].context;
    for (const id of ["core.users", "data_report.decision", "data_report.truth"]) assert.ok(ctx.includes(`- ${id}:`), id);
    assert.match(ctx, /the interviewer's notes from talking to Dana/);
    assert.match(ctx, /manual_work:/);
  });

  test("calls that fail three times record nothing from the source", async () => {
    const out = await runIngest({ provider: scripted(["not json", { answers: "nope" }, "still not json"]), fw, session: triaged(), source: { kind: "reply", from: "x", text: REPLY }, now: LATER });
    assert.equal(out.result, "failed");
    assert.equal(out.session.session.sources!.length, 1);
  });

  test("a long source is read in chunks, and every chunk's quotes are checked against the whole source", async () => {
    const para = "We pick who gets retraining each week. ".repeat(200);
    const text = `${para}\n\n${para}\n\nShort picks count, cancelled lines don't.`;
    assert.ok(chunks(text).length >= 2);
    const outputs = chunks(text).map((_, i) => ingestOut(i === chunks(text).length - 1 ? [answer("data_report.definition", ["Short picks count, cancelled lines don't."])] : []));
    const provider = scripted(outputs);
    const out = await runIngest({ provider, fw, session: triaged(), source: { kind: "transcript", from: "x", text }, now: LATER });
    assert.equal(provider.requests.length, chunks(text).length);
    assert.equal(out.session.items[0].coverage["data_report.definition"].status, "covered");
    assert.equal(sourceTranscript(out.session).length, 2);
  });
});

describe("definitions (HANDOFF.md, Definitions)", () => {
  const TEXT = [
    "We keep seeing over picks on the night shift.",
    "An over pick is when the picker takes more units than the pick ticket says, and it never shows on the system transaction.",
    "Last Tuesday, order 1043's ticket said 20 and 22 left the slot, so that's 2 over picked.",
  ].join("\n\n");

  test("a term found in the source starts unconfirmed; one not in the source is ignored", async () => {
    const out = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "over pick", quote: "over picks on the night shift", kind: "metric" }, { term: "fill rate", quote: "fill rate", kind: "metric" }])]), fw, session: triaged(), source: { kind: "reply", from: "Dana", text: TEXT }, now: LATER });
    assert.deepEqual(out.session.terms!.map((t) => [t.term, t.status, t.items]), [["over pick", "unconfirmed", ["item-1"]]]);
    assert.equal(validateSession(out.session).ok, true, validateSession(out.session).errors.join("; "));
  });

  test("a definition in the owner's words confirms the term, with who gave it, whether it's measurable and the worked example", async () => {
    const def = { term: "Over pick", definition: "More units taken than the ticket says; not on the system transaction", quotes: ["An over pick is when the picker takes more units than the pick ticket says"], certain: true, measurable: "no", examples: [{ case: "Order 1043: ticket 20, 22 left the slot", expected: "2" }], conflict: false };
    const out = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "over pick", quote: "over picks on the night shift", kind: "metric" }], [def])]), fw, session: triaged(), source: { kind: "reply", from: "Dana", text: TEXT }, now: LATER });
    const [t] = out.session.terms!;
    assert.equal(t.status, "confirmed");
    assert.equal(t.given_by, "Dana");
    assert.equal(t.source, "src-2");
    assert.equal(t.measurable, "no");
    assert.deepEqual(t.examples, [{ case: "Order 1043: ticket 20, 22 left the slot", expected: "2" }]);
    assert.equal(validateSession(out.session).ok, true, validateSession(out.session).errors.join("; "));
  });

  test("a definition with no words from the source isn't recorded; a later disagreeing one is kept as a conflict", async () => {
    const def = (definition: string, quote: string, conflict = false) => ({ term: "over pick", definition, quotes: [quote], certain: true, measurable: "unknown", examples: [], conflict });
    const none = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "over pick", quote: "over picks on the night shift", kind: "metric" }], [def("Anything extra", "words not in it")])]), fw, session: triaged(), source: { kind: "reply", from: "x", text: TEXT }, now: LATER });
    assert.equal(none.session.terms![0].status, "unconfirmed");

    const first = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "over pick", quote: "over picks on the night shift", kind: "metric" }], [def("Not on the transaction", "it never shows on the system transaction")])]), fw, session: triaged(), source: { kind: "reply", from: "x", text: TEXT }, now: LATER });
    const second = await runIngest({ provider: scripted([ingestOut([], [], [], [def("Picked qty above ticket qty in the WMS", "confirmed quantity is above the task quantity", true)])]), fw, session: first.session, source: { kind: "reply", from: "IT", text: "For us an over pick is when the confirmed quantity is above the task quantity." }, now: LATER });
    const t = second.session.terms![0];
    assert.equal(t.definition, "Not on the transaction");
    assert.deepEqual(t.conflict, { definition: "Picked qty above ticket qty in the WMS", quote: "confirmed quantity is above the task quantity", source: "src-3" });
  });
});

describe("ingest fixes after the real-model smoke test", () => {
  const SRC = "A short pick is when the confirmed quantity is less than the task quantity. I think wrong-location scans count too, but check with Priya.";
  const shortPick = (over: Record<string, unknown>) => ({ term: "short pick", definition: "Confirmed quantity below the task quantity", quotes: ["A short pick is when the confirmed quantity is less than the task quantity."], certain: true, measurable: "yes", examples: [], conflict: false, ...over });

  test("a hedged definition doesn't confirm the term: it's kept as a draft and quoted back in the follow-up", async () => {
    const out = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "short pick", quote: "A short pick", kind: "metric" }], [shortPick({ certain: false, definition: "Below the task quantity; maybe wrong-location scans too" })])]), fw, session: triaged(), source: { kind: "reply", from: "Sam", text: SRC }, now: LATER });
    const t = out.session.terms![0];
    assert.equal(t.status, "unconfirmed");
    assert.equal(t.draft!.definition, "Below the task quantity; maybe wrong-location scans too");
    const q = findGaps(out.session, fw).gaps.find((g) => g.kind === "term")!.question;
    assert.match(q, /^You described "short pick" as "Below the task quantity; maybe wrong-location scans too", but weren't sure/);
    assert.equal(validateSession(out.session).ok, true, validateSession(out.session).errors.join("; "));
  });

  test("a later source that settles part of a term updates that term, keeping the earlier words", async () => {
    const first = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "short pick", quote: "A short pick", kind: "metric" }], [shortPick({})])]), fw, session: triaged(), source: { kind: "reply", from: "Sam", text: SRC }, now: LATER });
    const notes = "wrong-location scans: YES count them as short picks";
    const out = await runIngest({ provider: scripted([ingestOut([], [], [], [shortPick({ definition: "Confirmed quantity below the task quantity, including wrong-location scans", quotes: ["wrong-location scans: YES count them as short picks"] })])]), fw, session: first.session, source: { kind: "reply", from: "Priya", text: notes }, now: LATER });
    assert.equal(out.session.terms!.length, 1);
    const t = out.session.terms![0];
    assert.equal(t.definition, "Confirmed quantity below the task quantity, including wrong-location scans");
    assert.deepEqual(t.quotes, ["A short pick is when the confirmed quantity is less than the task quantity.", "wrong-location scans: YES count them as short picks"]);
    assert.equal(t.given_by, "Priya");
  });

  test("the prompt says added detail isn't a conflict, partial coverage is a yes, and part of a term updates that term", async () => {
    const provider = scripted([ingestOut([])]);
    await runIngest({ provider, fw, session: triaged(), source: { kind: "reply", from: "x", text: SRC }, now: LATER });
    const sys = provider.requests[0].system;
    assert.match(sys, /"per picker" then "per picker, per shift, per day" is conflict false/);
    assert.match(sys, /never make a separate term out of part of one/);
    assert.match(provider.requests[0].context, /"yes" even if it only does part/);
  });
});

describe("ingest fixes after the second smoke test", () => {
  test("an answer filed under the type instead of the item ID still lands on the one item it belongs to", async () => {
    const out = await runIngest({ provider: scripted([ingestOut([{ item: "data_report", area: "data_report.delivery", status: "answered", value: "By 6am", quotes: ["wants report by 6am"], conflict: false }])]), fw, session: triaged(), source: { kind: "reply", from: "Priya", text: "- wants report by 6am, not 7" }, now: LATER });
    assert.equal(out.session.items[0].coverage["data_report.delivery"].status, "covered");
  });

  test("the model sees a term's draft, and is told to give the complete definition", async () => {
    const first = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "short pick", quote: "short pick", kind: "metric" }], [{ term: "short pick", definition: "Below the task quantity; maybe wrong-location scans", quotes: ["short pick is below the task quantity"], certain: false, measurable: "yes", examples: [], conflict: false }])]), fw, session: triaged(), source: { kind: "reply", from: "Sam", text: "A short pick is below the task quantity, I think." }, now: LATER });
    const provider = scripted([ingestOut([])]);
    await runIngest({ provider, fw, session: first.session, source: { kind: "notes", from: "Tom", text: "wrong-location scans count" }, now: LATER });
    assert.match(provider.requests[0].context, /- short pick: drafted as "Below the task quantity; maybe wrong-location scans", not yet certain/);
    assert.match(provider.requests[0].context, /must be the complete definition/);
  });
});

describe("source rule: notes are the interviewer's paraphrase, never the stakeholder's confirmation", () => {
  const NOTES = "- grain: per picker per shift per day\n- short pick = confirmed qty below task qty, wrong-location scans count";
  const noteOut = ingestOut(
    [{ item: "item-1", area: "data_report.grain", status: "answered", value: "Per picker, per shift, per day", quotes: ["per picker per shift per day"], conflict: false }],
    [], [{ term: "short pick", quote: "short pick", kind: "metric" }],
    [{ term: "short pick", definition: "Confirmed quantity below task quantity, wrong-location scans included", quotes: ["short pick = confirmed qty below task qty, wrong-location scans count"], certain: true, measurable: "yes", examples: [], conflict: false }],
  );

  test("an answer from notes alone stays assumed, and the follow-up asks the stakeholder to confirm it", async () => {
    const out = await runIngest({ provider: scripted([noteOut]), fw, session: triaged(), source: { kind: "notes", from: "Tom", text: NOTES }, now: LATER });
    assert.equal(out.session.items[0].coverage["data_report.grain"].status, "assumed");
    const gap = findGaps(out.session, fw).gaps.find((g) => g.target === "data_report.grain")!;
    assert.equal(gap.kind, "confirm");
    assert.match(gap.question, /^Our notes say: "Per picker, per shift, per day". Is that right?/);
  });

  test("a definition from notes alone is a draft: the term stays unconfirmed and blocks Go until the owner confirms it", async () => {
    const out = await runIngest({ provider: scripted([noteOut]), fw, session: triaged(), source: { kind: "notes", from: "Tom", text: NOTES }, now: LATER });
    const t = out.session.terms![0];
    assert.equal(t.status, "unconfirmed");
    assert.equal(t.draft!.definition, "Confirmed quantity below task quantity, wrong-location scans included");
    assert.match(findGaps(out.session, fw).gaps.find((g) => g.kind === "term")!.question, /^Our notes define "short pick" as/);
  });

  test("the stakeholder's own words then confirm both", async () => {
    const first = await runIngest({ provider: scripted([noteOut]), fw, session: triaged(), source: { kind: "notes", from: "Tom", text: NOTES }, now: LATER });
    const reply = "Yes: per picker, per shift, per day. A short pick is a confirmed quantity below the task quantity, and wrong-location scans count.";
    const out = await runIngest({ provider: scripted([ingestOut(
      [{ item: "item-1", area: "data_report.grain", status: "answered", value: "Per picker, per shift, per day", quotes: ["per picker, per shift, per day"], conflict: false }], [], [],
      [{ term: "short pick", definition: "Confirmed quantity below the task quantity; wrong-location scans count", quotes: ["A short pick is a confirmed quantity below the task quantity, and wrong-location scans count."], certain: true, measurable: "yes", examples: [], conflict: false }],
    )]), fw, session: first.session, source: { kind: "reply", from: "Sam", text: reply }, now: LATER });
    assert.equal(out.session.items[0].coverage["data_report.grain"].status, "covered");
    const t = out.session.terms![0];
    assert.equal(t.status, "confirmed");
    assert.equal(t.given_by, "Sam");
    assert.equal(t.draft ?? null, null);
    assert.ok(!findGaps(out.session, fw).gaps.some((g) => g.target === "data_report.grain" || g.kind === "term"));
  });

  test("notes never change a definition the owner confirmed: a different one is only proposed", async () => {
    const owner = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "short pick", quote: "short pick", kind: "metric" }], [{ term: "short pick", definition: "Confirmed below task", quotes: ["A short pick is confirmed below task."], certain: true, measurable: "yes", examples: [], conflict: false }])]), fw, session: triaged(), source: { kind: "reply", from: "Sam", text: "A short pick is confirmed below task." }, now: LATER });
    const out = await runIngest({ provider: scripted([noteOut]), fw, session: owner.session, source: { kind: "notes", from: "Tom", text: NOTES }, now: LATER });
    const t = out.session.terms![0];
    assert.equal(t.status, "confirmed");
    assert.equal(t.definition, "Confirmed below task");
    assert.equal(t.draft!.definition, "Confirmed quantity below task quantity, wrong-location scans included");
  });
});

describe("the request line is read for facts on the first paste (live test: the $500 threshold)", () => {
  const REQUEST = "Cycle count variances over $500 should go to the controller each week";
  const start = () => startAsync(fw, { id: "2026-10-16-c0c1", request: REQUEST, type: "data_report", from: "Dana", provider: "azure-openai", now: NOW });
  const ruleFromRequest = { answers: [{ item: "item-1", area: "core.constraints", status: "answered", value: "Variances over $500 go to the controller", quotes: ["variances over $500 should go to the controller"], conflict: false }], checks: [], terms: [], definitions: [] };

  test("the first paste reads the request first, as the requester's words, and only once", async () => {
    const provider = scripted([ruleFromRequest, ingestOut([])]);
    const out = await runIngest({ provider, fw, session: start(), source: { kind: "reply", from: "Dana", text: "Nothing else to add." }, now: LATER });
    assert.match(provider.requests[0].context, /the request as it came in from Dana/);
    const e = out.session.core.constraints;
    assert.equal(e.status, "covered");
    assert.equal(e.quote_sources?.["variances over $500 should go to the controller"], "src-1");
    assert.equal(out.session.session.engine!.request_read, true);
    const again = scripted([ingestOut([])]);
    await runIngest({ provider: again, fw, session: out.session, source: { kind: "reply", from: "Dana", text: "Still nothing." }, now: LATER });
    assert.equal(again.requests.length, 1, "the request isn't read twice");
  });

  test("a later source's different threshold conflicts with the request's", async () => {
    const first = await runIngest({ provider: scripted([ruleFromRequest, ingestOut([])]), fw, session: start(), source: { kind: "reply", from: "Dana", text: "Nothing else." }, now: LATER });
    const notes = "Mike (controller): anything over $250 should come to him";
    const out = await runIngest({ provider: scripted([ingestOut([{ item: "item-1", area: "core.constraints", status: "answered", value: "Over $250 goes to the controller", quotes: ["anything over $250 should come to him"], conflict: true }])]), fw, session: first.session, source: { kind: "notes", from: "Mike (controller)", text: notes }, now: LATER });
    assert.equal(out.session.core.constraints.value, "Variances over $500 go to the controller");
    assert.equal(out.session.session.engine!.areas["core.constraints"].conflict?.value, "Over $250 goes to the controller");
  });
});

describe("definition disagreements (live test: 'times the cost' vs 'absolute value per SKU')", () => {
  const def = (definition: string, quote: string, conflict: boolean, certain = true) => ({ term: "variance", definition, quotes: [quote], certain, measurable: "yes", examples: [], conflict });
  const DANA = "A variance is the units off times the cost.";
  const MIKE = "- Mike: variance = absolute value per SKU";

  test("notes that contradict the requester's definition keep both; notes never confirm", async () => {
    const first = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "variance", quote: "variance", kind: "metric" }], [def("Units off times the cost", "A variance is the units off times the cost.", false)])]), fw, session: triaged(), source: { kind: "reply", from: "Dana", text: DANA }, now: LATER });
    assert.equal(first.session.terms![0].status, "confirmed");
    const out = await runIngest({ provider: scripted([ingestOut([], [], [], [def("Absolute value per SKU", "variance = absolute value per SKU", true)])]), fw, session: first.session, source: { kind: "notes", from: "Mike (controller)", text: MIKE }, now: LATER });
    const t = out.session.terms![0];
    assert.equal(t.definition, "Units off times the cost");
    assert.equal(t.conflict?.definition, "Absolute value per SKU");
    const q = findGaps(out.session, fw).gaps.find((g) => g.kind === "term")!.question;
    assert.match(q, /"variance" was defined two ways: "Units off times the cost" and "Absolute value per SKU"\. Which is right\?/);
  });

  test("a contradiction against a draft is kept too, and notes can't settle a disagreement; the stakeholder's words can", async () => {
    const hedged = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "variance", quote: "variance", kind: "metric" }], [def("Units off times the cost, I think", "A variance is the units off times the cost.", false, false)])]), fw, session: triaged(), source: { kind: "reply", from: "Dana", text: DANA }, now: LATER });
    const conflicted = await runIngest({ provider: scripted([ingestOut([], [], [], [def("Absolute value per SKU", "variance = absolute value per SKU", true)])]), fw, session: hedged.session, source: { kind: "notes", from: "Mike (controller)", text: MIKE }, now: LATER });
    assert.equal(conflicted.session.terms![0].status, "unconfirmed");
    assert.ok(conflicted.session.terms![0].conflict);
    const byNotes = await runIngest({ provider: scripted([ingestOut([], [], [], [def("Absolute value per SKU", "variance = absolute value per SKU", false)])]), fw, session: conflicted.session, source: { kind: "notes", from: "Tom", text: MIKE }, now: LATER });
    assert.ok(byNotes.session.terms![0].conflict, "still open");
    assert.equal(byNotes.session.terms![0].status, "unconfirmed");
    const settled = await runIngest({ provider: scripted([ingestOut([], [], [], [def("Absolute value of units off, per SKU", "It's the absolute value per SKU.", false)])]), fw, session: byNotes.session, source: { kind: "reply", from: "Dana", text: "It's the absolute value per SKU." }, now: LATER });
    assert.equal(settled.session.terms![0].status, "confirmed");
    assert.equal(settled.session.terms![0].conflict ?? null, null);
  });
});

describe("one span, one area; one term per name (cycle-count test)", () => {
  test("a sentence already filed under one area isn't recorded under a second: that area is asked plainly", async () => {
    const said = "We recount because the auditors sample our biggest variances.";
    const out = await runIngest({ provider: scripted([ingestOut([
      answer("data_report.decision", ["We recount because the auditors sample our biggest variances."]),
      answer("core.trust", ["because the auditors sample our biggest variances"]),
    ])]), fw, session: triaged(), source: { kind: "reply", from: "Dana", text: said }, now: LATER });
    assert.equal(out.session.items[0].coverage["data_report.decision"].status, "covered");
    assert.equal(out.session.core.trust.status, "unknown");
    assert.ok(out.events.some((e) => e.includes("core.trust: its words are already filed under another area")));
  });

  test("'cycle count variances' and 'variance' are one term", async () => {
    const out = await runIngest({ provider: scripted([ingestOut([], [], [{ term: "variance", quote: "variance", kind: "metric" }, { term: "cycle count variances", quote: "cycle count variances", kind: "metric" }])]), fw, session: triaged(), source: { kind: "reply", from: "Dana", text: "We track cycle count variances; a variance is units off." }, now: LATER });
    assert.deepEqual(out.session.terms!.map((t) => t.term), ["variance"]);
  });
});

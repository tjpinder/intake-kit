// The reflect-back the user sees is built from the session by code, and captured replies (the
// user's words stored when the interviewer didn't record an answer) never count as scoring
// evidence. Both from the first live web test.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { scoreAndGate } from "../src/lib/gates.ts";
import { usableBand } from "../src/lib/score.ts";
import { buildSummary, summaryIndex, summaryText } from "../src/lib/summary.ts";
import type { CoverageEntry } from "../src/lib/session.ts";
import { covered, makeItem, makeSession } from "./helpers.ts";

const fw = loadFramework(".");
const captured = (value: string): CoverageEntry => ({ status: "assumed", value, quotes: [value], probe_count: 0, updated_at: "2026-10-10T10:05:00.000Z", source: "captured" });
const answered = (value: string): CoverageEntry => ({ ...covered(value), updated_at: "2026-10-10T10:05:00.000Z" });

describe("captured replies are never scoring evidence", () => {
  test("a band whose only evidence is a captured reply scores as unknown", () => {
    const item = makeItem("item-1");
    item.facts.input_digital = { band: "fully", evidence: ["core.data"], quotes: [] };
    const session = makeSession([item], { core: { data: captured("It's all in CSV files.") } });
    assert.equal(usableBand(session, item, "input_digital"), "unknown");
    const scored = scoreAndGate(session, fw).session.items[0].scoring!;
    assert.equal(scored.criteria.input_digital.band, "unknown");
    assert.equal(scored.criteria.input_digital.score, null);
  });

  test("a band with at least one answer the interviewer recorded keeps its pick", () => {
    const item = makeItem("item-1");
    item.facts.access = { band: "programmatic", evidence: ["core.systems", "core.data"], quotes: [] };
    const session = makeSession([item], { core: { data: captured("CSV files read by scripts."), systems: answered("Node scripts read the files directly") } });
    assert.equal(usableBand(session, item, "access"), "programmatic");
  });

  test("a gate fact resting only on a captured reply is unknown at the gate", () => {
    const item = makeItem("item-1");
    item.facts.success_metric = { band: "measurable_with_baseline", evidence: ["core.outcome"], quotes: [] };
    const session = makeSession([item], { core: { outcome: captured("Four hours every Monday now; under one would be a win.") } });
    const gate = scoreAndGate(session, fw).session.items[0].gate!;
    assert.notEqual(gate.decision, "go");
  });

  test("a critical area answered only by a captured reply isn't settled, even after confirmation", () => {
    const session = makeSession([makeItem("item-1")], { core: { users: captured("The shift leads use it every Tuesday.") } });
    const gate = scoreAndGate(session, fw).session.items[0].gate!;
    assert.equal(gate.decision, "gather_more");
    assert.ok(gate.reasons.some((r) => r.includes("core.users")), gate.reasons.join("; "));
  });
});

describe("the reflect-back summary", () => {
  function proposed() {
    const item = makeItem("item-1", { mitigation: "A lead checks the first week of reports." });
    item.prose.problem_statement = "Short picks aren't visible by shift.";
    item.facts = {
      input_digital: { band: "fully", evidence: ["core.data"], quotes: [] },
      documentation: { band: "none", evidence: ["core.users"], quotes: [] },
    };
    const session = makeSession([item], {
      confirmed: false,
      core: { data: answered("Pick logs in the WMS"), users: captured("The shift leads use it every Tuesday.") },
    });
    session.session.reflect_back!.proposed_at = "2026-10-10T10:08:00.001Z";
    return session;
  }

  test("is built from the session: prose, answers with their status, bands in plain words", () => {
    const s = buildSummary(proposed(), fw);
    const it = s.items[0];
    assert.equal(it.problem, "Short picks aren't visible by shift.");
    assert.equal(it.mitigation, "A lead checks the first week of reports.");
    assert.deepEqual(it.answers.map((a) => [a.area, a.captured]), [["core.users", true], ["core.data", false]]);
    const digital = it.bands.find((b) => b.fact === "input_digital")!;
    assert.equal(digital.text, "Fully digital");
    const docs = it.bands.find((b) => b.fact === "documentation")!;
    assert.equal(docs.unknown, true, "a band resting only on a captured reply is shown as not known");
    assert.match(docs.note!, /I'd have said "None"/);
  });

  test("the text version marks captured answers for the user to check", () => {
    const text = summaryText(buildSummary(proposed(), fw));
    assert.match(text, /Who's involved: The shift leads use it every Tuesday\. \(your words as typed; not yet confirmed\)/);
    assert.match(text, /Input digital: Fully digital/);
  });

  test("leaves out items another item replaced, and says so", () => {
    const session = proposed();
    const follow = makeItem("item-2", { type: "manual_process", superseded_by: "item-1" });
    follow.title = "Monday spreadsheet";
    session.items.push(follow);
    const s = buildSummary(session, fw);
    assert.deepEqual(s.items.map((i) => i.id), ["item-1"]);
    assert.deepEqual(s.set_aside, ["Monday spreadsheet: replaced by Item item-1"]);
  });

  test("goes under the reply to the message the proposal came in on", () => {
    const transcript = [
      { at: "2026-10-10T10:01:00.000Z" },
      { at: "2026-10-10T10:08:00.000Z" },
      { at: "2026-10-10T10:09:00.000Z" },
    ];
    assert.equal(summaryIndex(proposed(), transcript), 1);
    const none = proposed();
    none.session.reflect_back = null;
    assert.equal(summaryIndex(none, transcript), null);
  });
});

describe("dropped items", () => {
  test("gate as Don't build with the reason, and are set aside in the summary", () => {
    const kept = makeItem("item-1");
    const gone = makeItem("item-2", { type: "manual_process" });
    gone.title = "Fallback by hand";
    gone.dropped = { reason: "a fallback, not something done today", quote: "by hand", at: "2026-10-10T10:05:00.000Z" };
    const s = makeSession([kept, gone]);
    const gate = scoreAndGate(s, fw).session.items[1].gate!;
    assert.equal(gate.decision, "dont_build");
    assert.deepEqual(gate.reasons, ["Dropped during the interview: a fallback, not something done today"]);
    const summary = buildSummary({ ...s, session: { ...s.session, reflect_back: { text: "x", confirmed: false, corrections: [] } } }, fw);
    assert.deepEqual(summary.items.map((i) => i.id), ["item-1"]);
    assert.deepEqual(summary.set_aside, ["Fallback by hand: dropped (a fallback, not something done today)"]);
  });
});

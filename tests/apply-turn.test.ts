import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { applyTurn, type ApplyResult } from "../src/lib/apply-turn.ts";
import { normalize, findQuote, type TranscriptEntry } from "../src/lib/grounding.ts";
import { validateSession } from "../src/lib/schemas.ts";
import { planTargets, statusOf } from "../src/lib/guide.ts";
import type { Session } from "../src/lib/session.ts";
import { makeItem, makeSession } from "./helpers.ts";

const fw = loadFramework(".");
const T0 = "2026-10-10T14:00:00.000Z";
const NOW = "2026-10-10T14:30:00.000Z";

const user = (text: string, at = "2026-10-10T14:10:00.000Z"): TranscriptEntry => ({ role: "user", text, at });

const TRANSCRIPT: TranscriptEntry[] = [
  user("/intake-kit:intake I need a report of short picks by shift and picker", "2026-10-10T14:01:00.000Z"),
  user("I build it in Excel every Monday and it eats my whole Monday morning", "2026-10-10T14:05:00.000Z"),
  user("filter by shift and count by picker. I build it, the shift leads use it Tuesday", "2026-10-10T14:08:00.000Z"),
];

function emptyTurn(): any {
  return {
    reply: "What happens next?",
    updates: [],
    facts: [],
    router: { new_items: [], reclassify: null, add_modifiers: [], remove_modifiers: [], supersede: null, drop: null },
    prose: [],
    acceptance: [],
    guardrails: [],
    open_questions: [],
    reflect_back: null,
  };
}

/** A fresh, unconfirmed session with one data_report item and core seeded as start does. */
function freshSession(): Session {
  const s = makeSession([makeItem("item-1")], { confirmed: null });
  for (const k of Object.keys(s.core) as Array<keyof Session["core"]>) s.core[k] = { status: "unknown", value: null, quotes: [], probe_count: 0 };
  s.items[0].facts = {};
  s.items[0].coverage = {};
  return s;
}

function run(turn: any, opts: { session?: Session; transcript?: TranscriptEntry[] | null; now?: string; lastReply?: string | null; capture?: boolean } = {}): ApplyResult {
  return applyTurn(opts.session ?? freshSession(), turn, {
    fw,
    transcript: opts.transcript === undefined ? TRANSCRIPT : opts.transcript,
    now: opts.now ?? NOW,
    lastReply: opts.lastReply,
    capture: opts.capture,
  });
}

function expectRejected(result: ApplyResult, path: string, fragment: string) {
  assert.equal(result.applied, false, "expected the turn to be rejected");
  assert.ok(
    result.rejections.some((r) => r.path.startsWith(path) && r.reason.includes(fragment)),
    `expected a rejection at ${path} containing "${fragment}", got:\n  ${result.rejections.map((r) => `${r.path}: ${r.reason}`).join("\n  ")}`,
  );
}

describe("grounding normalization", () => {
  test("only quotes, dashes, ellipsis, whitespace and case are normalized", () => {
    assert.equal(normalize("  It’s “done” — mostly…  "), `it's "done" - mostly...`);
    assert.equal(normalize("ALL\n\tcaps"), "all caps");
    assert.notEqual(normalize("colour"), normalize("color"));
  });

  test("a quote must sit inside one user turn", () => {
    assert.ok(findQuote("count by picker", TRANSCRIPT));
    assert.equal(findQuote("every Monday filter by shift", TRANSCRIPT), null);
  });

  test("curly quotes and an em dash in the quote still match", () => {
    const t = [user("we don't trust it -- well, the WMS one")];
    assert.equal(findQuote("we don’t trust it", t)?.text, t[0].text);
    assert.ok(findQuote("we don't trust it — well", [user("we don't trust it - well")]));
  });

  test("assistant words aren't in the transcript, so they never ground", () => {
    assert.equal(findQuote("What happens next?", TRANSCRIPT), null);
  });
});

describe("applying a good turn", () => {
  test("core update, new item and module update land in the session", () => {
    const turn = emptyTurn();
    turn.updates = [
      { item: null, area: "core.users", status: "covered", value: "Supervisor builds; shift leads use", quote: "I build it, the shift leads use it Tuesday" },
      { item: "item-1", area: "data_report.grain", status: "covered", value: "Per picker per shift", quote: "count by picker" },
    ];
    turn.router.new_items = [{ id: "item-2", type: "manual_process", confidence: "med", title: "Monday Excel build", trigger_quote: "I build it in Excel every Monday", spawned_from: "item-1" }];
    const r = run(turn);
    assert.deepEqual(r.rejections, []);
    assert.equal(r.session.core.users.status, "covered");
    assert.deepEqual(r.session.core.users.quotes, ["I build it, the shift leads use it Tuesday"]);
    assert.equal(r.session.core.users.updated_at, NOW);
    assert.equal(r.session.items[0].coverage["data_report.grain"].value, "Per picker per shift");
    const item2 = r.session.items[1];
    assert.equal(item2.id, "item-2");
    assert.deepEqual(item2.type_history[0], { from: null, to: "manual_process", reason: "spawned from item-1", quote: "I build it in Excel every Monday", at: NOW });
    assert.deepEqual(validateSession(r.session).errors, []);
  });

  test("a core answer aimed at an item becomes the shared answer when there isn't one yet", () => {
    // Found in the persona evals: the model filed shared answers under the item, status never
    // saw them, and the interviewer kept re-asking.
    const turn = emptyTurn();
    turn.updates = [{ item: "item-1", area: "core.data", status: "covered", value: "Has badge numbers", quote: "count by picker" }];
    const r = run(turn);
    assert.equal(r.session.core.data.value, "Has badge numbers");
    assert.deepEqual(r.session.items[0].core_overrides, {});
  });

  test("once a shared answer exists, an item's different answer is an override and leaves the shared one alone", () => {
    const session = freshSession();
    session.core.data = { status: "covered", value: "No personal data", quotes: ["count by picker"], probe_count: 0, updated_at: T0 };
    const turn = emptyTurn();
    turn.updates = [{ item: "item-1", area: "core.data", status: "covered", value: "Has badge numbers", quote: "short picks by shift" }];
    const r = run(turn, { session });
    assert.equal(r.session.items[0].core_overrides.data.value, "Has badge numbers");
    assert.equal(r.session.core.data.value, "No personal data");
  });

  test("quotes accumulate without duplicates and probe_count is kept", () => {
    const session = freshSession();
    session.core.outcome = { status: "assumed", value: "Monday back", quotes: ["it eats my whole Monday morning"], probe_count: 1, updated_at: T0 };
    const turn = emptyTurn();
    turn.updates = [
      { item: null, area: "core.outcome", status: "covered", value: "Four hours back", quote: "it eats my whole Monday morning" },
      { item: null, area: "core.outcome", status: "covered", value: "Four hours back", quote: "I build it in Excel every Monday" },
    ];
    const r = run(turn, { session });
    assert.deepEqual(r.session.core.outcome.quotes, ["it eats my whole Monday morning", "I build it in Excel every Monday"]);
    assert.equal(r.session.core.outcome.probe_count, 1);
  });

  test("facts, prose and open questions are stored", () => {
    const turn = emptyTurn();
    turn.facts = [{ item: "item-1", fact: "ways_done", band: "one", evidence: ["data_report.definition"], quote: null }];
    turn.prose = [{ item: "item-1", field: "problem_statement", text: "Retraining is guesswork." }];
    turn.open_questions = [{ item: "item-1", area: "data_report.truth", question: "Which count wins?", who_can_answer: "WMS admin", artifact_needed: null }];
    const r = run(turn);
    assert.deepEqual(r.session.items[0].facts.ways_done, { band: "one", evidence: ["data_report.definition"], quotes: [] });
    assert.equal(r.session.items[0].prose.problem_statement, "Retraining is guesswork.");
    assert.equal(r.session.items[0].open_questions.length, 1);
  });

  test("reclassify records the history; supersede links the items", () => {
    const session = freshSession();
    session.items.push(makeItem("item-2", { type: "manual_process" }));
    const turn = emptyTurn();
    turn.router.reclassify = { item: "item-2", to: "data_report", reason: "Real ask is a report", quote: "short picks by shift" };
    turn.router.supersede = { item: "item-2", by: "item-1", quote: "I build it in Excel every Monday" };
    const r = run(turn, { session });
    const item2 = r.session.items[1];
    assert.equal(item2.type, "data_report");
    assert.deepEqual(item2.type_history.at(-1), { from: "manual_process", to: "data_report", reason: "Real ask is a report", quote: "short picks by shift", at: NOW });
    assert.equal(item2.superseded_by, "item-1");
  });
});

describe("the model can't set scores or gates", () => {
  test("a score on a fact fails the turn schema", () => {
    const turn = emptyTurn();
    turn.facts = [{ item: "item-1", fact: "ways_done", band: "one", evidence: [], quote: null, score: 5 }];
    expectRejected(run(turn), "/facts/0", "turn schema");
  });

  test("a gate at the top level fails the turn schema", () => {
    const turn = emptyTurn();
    turn.gate = { decision: "go" };
    expectRejected(run(turn), "/", "turn schema");
  });

  test("an unparseable turn is rejected, not a crash", () => {
    expectRejected(run({ __unparseable: "Unexpected token" }), "/", "turn schema");
  });
});

describe("status rules", () => {
  const update = (u: object) => { const t = emptyTurn(); t.updates = [{ item: null, area: "core.users", status: "covered", value: "x", quote: "count by picker", ...u }]; return t; };

  test("covered with no quote", () => expectRejected(run(update({ quote: null })), "/updates/0/quote", "covered needs the user's words"));
  test("covered with no value", () => expectRejected(run(update({ value: "  " })), "/updates/0/value", "covered needs a value"));
  test("assumed with no quote", () => expectRejected(run(update({ status: "assumed", quote: null })), "/updates/0/quote", "assumed needs"));
  test("unknown with a value", () => expectRejected(run(update({ status: "unknown", quote: null })), "/updates/0/value", "unknown has no value"));
  test("unknown without a quote is fine", () => assert.equal(run(update({ status: "unknown", value: null, quote: null })).applied, true));
});

describe("grounding is enforced on every quote", () => {
  test("a made-up quote is rejected", () => {
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.trust", status: "covered", value: "Low", quote: "errors don't really matter" }];
    expectRejected(run(t), "/updates/0/quote", "isn't the user's words");
  });

  test("quoting the assistant's own question is rejected", () => {
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.users", status: "assumed", value: "?", quote: "Who touches this, first person to last?" }];
    expectRejected(run(t), "/updates/0/quote", "isn't the user's words");
  });

  test("a quote spliced across two user turns is rejected", () => {
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.outcome", status: "assumed", value: "?", quote: "Monday morning filter by shift" }];
    expectRejected(run(t), "/updates/0/quote", "single user message");
  });

  for (const [where, build] of [
    ["trigger_quote", (t: any) => { t.router.new_items = [{ id: "item-2", type: "broken", confidence: "low", title: "x", trigger_quote: "it's all broken", spawned_from: null }]; }],
    ["modifier quote", (t: any) => { t.router.add_modifiers = [{ item: "item-1", modifier: "integration", quote: "it syncs via EDI" }]; }],
    ["supersede quote", (t: any) => { t.router.supersede = { item: "item-1", by: "item-1", quote: "replace it" }; }],
    ["reclassify quote", (t: any) => { t.router.reclassify = { item: "item-1", to: "broken", reason: "r", quote: "it stopped working" }; }],
  ] as const) {
    test(`${where} is grounded too`, () => {
      const t = emptyTurn();
      build(t);
      expectRejected(run(t), "/", "isn't the user's words");
    });
  }

  test("a band's quote that isn't the user's words is dropped, not stored, and the band is kept", () => {
    // Found in the persona evals: the model attached its own summaries to band picks, and the
    // whole write-up turn (and so the reflect-back) failed over optional detail.
    const t = emptyTurn();
    t.facts = [
      { item: "item-1", fact: "value", band: "high", evidence: [], quote: "huge savings" },
      { item: "item-1", fact: "ways_done", band: "one", evidence: [], quote: "count by picker" },
    ];
    const r = run(t);
    assert.equal(r.applied, true);
    assert.deepEqual(r.session.items[0].facts.value, { band: "high", evidence: [], quotes: [] });
    assert.deepEqual(r.session.items[0].facts.ways_done.quotes, ["count by picker"], "a real quote is kept");
    assert.deepEqual(r.warnings, ["/facts/0/quote dropped: not the user's words"]);
  });

  test("a band name used as a coverage area gets a message saying where it belongs", () => {
    const t = emptyTurn();
    t.updates = [{ item: "item-1", area: "existing_asset", status: "covered", value: "none", quote: "count by picker" }];
    expectRejected(run(t), "/updates/0/area", 'existing_asset is a band pick, not a coverage area: record it only in "facts"');
  });

  test("an empty transcript points at the hook", () => {
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.users", status: "covered", value: "x", quote: "count by picker" }];
    expectRejected(run(t, { transcript: [] }), "/updates/0/quote", "prompt hook");
  });

  test("unverified sessions skip the check", () => {
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.users", status: "covered", value: "x", quote: "anything at all" }];
    assert.equal(run(t, { transcript: null }).applied, true);
  });
});

describe("IDs and areas", () => {
  test("unknown coverage ID", () => {
    const t = emptyTurn();
    t.updates = [{ item: "item-1", area: "data_report.colour", status: "unknown", value: null, quote: null }];
    expectRejected(run(t), "/updates/0/area", "unknown coverage ID");
  });

  test("an area from another type's module", () => {
    const t = emptyTurn();
    t.updates = [{ item: "item-1", area: "broken.symptom", status: "unknown", value: null, quote: null }];
    expectRejected(run(t), "/updates/0/area", "doesn't apply to item-1, a data_report item");
  });

  test("a modifier area once the modifier is added in the same turn", () => {
    const t = emptyTurn();
    t.router.add_modifiers = [{ item: "item-1", modifier: "integration", quote: "short picks by shift" }];
    t.updates = [{ item: "item-1", area: "mod.integration.payload", status: "unknown", value: null, quote: null }];
    assert.deepEqual(run(t).rejections, []);
  });

  test("a module area needs an item", () => {
    const t = emptyTurn();
    t.updates = [{ item: null, area: "data_report.grain", status: "unknown", value: null, quote: null }];
    expectRejected(run(t), "/updates/0/item", "item ID is required");
  });

  test("unknown item", () => {
    const t = emptyTurn();
    t.updates = [{ item: "item-7", area: "data_report.grain", status: "unknown", value: null, quote: null }];
    expectRejected(run(t), "/updates/0/item", "unknown item item-7");
  });

  test("new item IDs: format, duplicates, spawned_from", () => {
    const t = emptyTurn();
    t.router.new_items = [
      { id: "report", type: "data_report", confidence: "low", title: "x", trigger_quote: "count by picker", spawned_from: null },
      { id: "item-1", type: "data_report", confidence: "low", title: "x", trigger_quote: "count by picker", spawned_from: null },
      { id: "item-3", type: "data_report", confidence: "low", title: "x", trigger_quote: "count by picker", spawned_from: "item-9" },
    ];
    const r = run(t);
    expectRejected(r, "/router/new_items/0/id", "look like item-1");
    expectRejected(r, "/router/new_items/1/id", "already exists");
    expectRejected(r, "/router/new_items/2/spawned_from", "unknown item item-9");
  });

  test("reclassify to the same type; supersede itself", () => {
    const t = emptyTurn();
    t.router.reclassify = { item: "item-1", to: "data_report", reason: "r", quote: "count by picker" };
    t.router.supersede = { item: "item-1", by: "item-1", quote: "count by picker" };
    const r = run(t);
    expectRejected(r, "/router/reclassify/to", "already data_report");
    expectRejected(r, "/router/supersede/by", "can't supersede itself");
  });

  test("a fact band the framework doesn't define lists the allowed bands", () => {
    const t = emptyTurn();
    t.facts = [{ item: "item-1", fact: "ways_done", band: "several", evidence: ["data_report.nope"], quote: null }];
    const r = run(t);
    expectRejected(r, "/facts/0/band", "one, 2-7, 8+, unknown");
    expectRejected(r, "/facts/0/evidence/0", "unknown coverage ID");
  });

  test("prose and open questions need an item", () => {
    const t = emptyTurn();
    t.prose = [{ item: null, field: "mvp", text: "x" }];
    t.open_questions = [{ item: null, area: "core.data", question: "q", who_can_answer: null, artifact_needed: null }];
    const r = run(t);
    expectRejected(r, "/prose/0/item", "item ID is required");
    expectRejected(r, "/open_questions/0/item", "item ID is required");
  });
});

describe("code chooses each question's area (first live test, persona 7)", () => {
  const stamped = () => { const s = freshSession(); s.session.asked = {}; return s; };

  test("the turn's question is the planned primary; its area is stamped and remembered", () => {
    const s = stamped();
    const plan = planTargets(s, fw);
    assert.deepEqual(plan.primary, { item: "item-1", area: "data_report.decision", probe: false });
    const r = run(emptyTurn(), { session: s });
    assert.deepEqual(r.session.session.asked, { "item-1:data_report.decision": NOW });
    assert.deepEqual(r.session.session.last_target, { item: "item-1", area: "data_report.decision", reply: "What happens next?" });
  });

  test("when the latest message already answers the primary in full, the question is the alternate", () => {
    const s = stamped();
    const t = emptyTurn();
    t.updates = [{ item: "item-1", area: "data_report.decision", status: "covered", value: "Who to retrain", quote: "count by picker" }];
    const r = run(t, { session: s });
    assert.deepEqual(r.session.session.last_target?.area, planTargets(s, fw).alternate!.area);
  });

  test("asking about an area that already holds an answer is its one follow-up", () => {
    // The worked example: the user volunteered who catches mistakes, and the next question asked
    // about it; that question is the area's follow-up, so it's never asked a third time.
    const s = stamped();
    s.session.asked = { "item-1:data_report.decision": T0, "item-1:data_report.definition": T0, "core.outcome": T0, "core.data": T0, "core.users": T0 };
    assert.equal(planTargets(s, fw).primary?.area, "core.trust");
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.trust", status: "assumed", value: "Shift lead would catch it", quote: "count by picker" }];
    const r = run(t, { session: s });
    assert.equal(r.session.core.trust.probe_count, 1);
    assert.ok(!statusOf(r.session, fw).items[0].critical_unprobed.includes("core.trust"));
  });

  test("a critical area answered only vaguely gets one planned probe, then is never planned again", () => {
    const s = stamped();
    s.session.asked = Object.fromEntries(["item-1:data_report.decision", "item-1:data_report.definition", "core.outcome", "core.data", "core.users", "core.trust", "core.systems", "item-1:data_report.existing"].map((k) => [k, T0]));
    s.core.outcome = { status: "assumed", value: "Monday", quotes: ["it eats my whole Monday morning"], probe_count: 0, updated_at: T0 };
    assert.deepEqual(planTargets(s, fw).primary, { item: null, area: "core.outcome", probe: true });
    const r = run(emptyTurn(), { session: s });
    assert.equal(r.session.core.outcome.probe_count, 1);
    assert.notEqual(planTargets(r.session, fw).primary?.area, "core.outcome");
  });

  test("a proposal asks nothing, so nothing is stamped", () => {
    const s = stamped();
    const t = emptyTurn();
    t.reflect_back = { text: "Here's what I heard.", status: "proposed", corrections: [] };
    const r = run(t, { session: s });
    assert.deepEqual(r.session.session.asked, {});
    assert.equal(r.session.session.last_target, null);
  });
});

describe("reflect-back and scoring", () => {
  function readyItem(): Session {
    const s = makeSession([makeItem("item-1")], { confirmed: null });
    return s;
  }
  const rbTurn = (status: string, extra: object = {}) => { const t = emptyTurn(); t.reflect_back = { text: "Here's what I heard.", status, corrections: [], ...extra }; return t; };

  test("proposing records the time and leaves it unconfirmed", () => {
    const r = run(rbTurn("proposed"), { session: readyItem() });
    assert.deepEqual(r.session.session.reflect_back, { text: "Here's what I heard.", confirmed: false, corrections: [], proposed_at: NOW });
    assert.equal(r.session.items[0].scoring, null);
  });

  test("a proposal can't add an item in the same turn (first live test)", () => {
    const spawning = rbTurn("proposed");
    spawning.router.new_items = [{ id: "item-2", type: "manual_process", confidence: "med", title: "Monday spreadsheet", trigger_quote: "I build it in Excel every Monday", spawned_from: "item-1" }];
    expectRejected(run(spawning, { session: readyItem() }), "/reflect_back", "same turn as adding items");
  });

  test("confirming before proposing is rejected", () => {
    expectRejected(run(rbTurn("confirmed"), { session: readyItem() }), "/reflect_back/status", "before it has been proposed");
  });

  test("confirming with no user reply since the proposal is rejected", () => {
    const s = readyItem();
    s.session.reflect_back = { text: "x", confirmed: false, corrections: [], proposed_at: "2026-10-10T14:20:00.000Z" };
    expectRejected(run(rbTurn("confirmed"), { session: s }), "/reflect_back/status", "hasn't replied");
  });

  test("confirming after the user replies scores and gates every item", () => {
    const s = readyItem();
    s.session.reflect_back = { text: "x", confirmed: false, corrections: [], proposed_at: "2026-10-10T14:20:00.000Z" };
    const transcript = [...TRANSCRIPT, user("yes that's right", "2026-10-10T14:21:00.000Z")];
    const r = run(rbTurn("confirmed"), { session: s, transcript });
    assert.equal(r.confirmed, true);
    assert.equal(r.session.items[0].gate?.decision, "go");
    assert.deepEqual(validateSession(r.session).errors, []);
  });

  test("corrections are appended and keep it unconfirmed", () => {
    const s = readyItem();
    s.session.reflect_back = { text: "x", confirmed: false, corrections: ["earlier fix"], proposed_at: "2026-10-10T14:20:00.000Z" };
    const transcript = [...TRANSCRIPT, user("no, it's daily not weekly", "2026-10-10T14:21:00.000Z")];
    const r = run(rbTurn("corrected", { corrections: ["daily, not weekly"] }), { session: s, transcript });
    assert.deepEqual(r.session.session.reflect_back?.corrections, ["earlier fix", "daily, not weekly"]);
    assert.equal(r.session.session.reflect_back?.confirmed, false);
  });

  test("a completed intake accepts no more turns", () => {
    const s = readyItem();
    s.session.reflect_back = { text: "x", confirmed: true, corrections: [] };
    expectRejected(run(emptyTurn(), { session: s }), "/", "intake is complete");
  });
});

describe("all or nothing", () => {
  test("one bad update means none of the turn is saved", () => {
    const original = freshSession();
    const snapshot = structuredClone(original);
    const t = emptyTurn();
    t.updates = [
      { item: null, area: "core.users", status: "covered", value: "ok", quote: "count by picker" },
      { item: null, area: "core.trust", status: "covered", value: "made up", quote: "never wrong" },
    ];
    t.router.new_items = [{ id: "item-2", type: "broken", confidence: "low", title: "x", trigger_quote: "count by picker", spawned_from: null }];
    const r = run(t, { session: original });
    assert.equal(r.applied, false);
    assert.equal(r.session, original);
    assert.deepEqual(original, snapshot, "the input session must not be mutated");
  });

  test("an empty reply is rejected", () => {
    const t = emptyTurn();
    t.reply = " ";
    expectRejected(run(t), "/reply", "can't be empty");
  });
});

describe("acceptance criteria and guardrail statements", () => {
  function answered(): Session {
    const s = freshSession();
    s.core.trust = { status: "covered", value: "Shift lead checks", quotes: ["the shift leads use it Tuesday"], probe_count: 0, updated_at: T0 };
    return s;
  }
  const crit = (o: object = {}) => ({ item: "item-1", kind: "criterion", given: "a shift", when: "the report runs", then: "counts appear", evidence: ["core.trust"], ...o });
  const rail = (o: object = {}) => ({ item: "item-1", kind: "kill_criterion", text: "Stop if counts are wrong", evidence: ["core.trust"], ...o });

  test("both are stored when their evidence has the user's words", () => {
    const t = emptyTurn();
    t.acceptance = [crit()];
    t.guardrails = [rail()];
    const r = run(t, { session: answered() });
    assert.deepEqual(r.rejections, []);
    assert.equal(r.session.items[0].acceptance.length, 1);
    assert.deepEqual(r.session.items[0].guardrails, [{ kind: "kill_criterion", text: "Stop if counts are wrong", evidence: ["core.trust"] }]);
  });

  test("evidence with no quote yet is rejected", () => {
    const t = emptyTurn();
    t.acceptance = [crit()];
    t.guardrails = [rail()];
    const r = run(t);
    expectRejected(r, "/acceptance/0/evidence/0", "no answer in the user's words");
    expectRejected(r, "/guardrails/0/evidence/0", "no answer in the user's words");
  });

  test("evidence answered in the same turn counts", () => {
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.trust", status: "covered", value: "Lead checks", quote: "the shift leads use it Tuesday" }];
    t.guardrails = [rail()];
    assert.deepEqual(run(t).rejections, []);
  });

  test("no evidence, empty text, or an area from another type", () => {
    const t = emptyTurn();
    t.acceptance = [crit({ evidence: [], then: " " })];
    t.guardrails = [rail({ text: "", evidence: ["broken.cause"] })];
    const r = run(t, { session: answered() });
    expectRejected(r, "/acceptance/0/evidence", "at least one coverage ID");
    expectRejected(r, "/acceptance/0/then", "can't be empty");
    expectRejected(r, "/guardrails/0/text", "can't be empty");
    expectRejected(r, "/guardrails/0/evidence/0", "doesn't apply to item-1");
  });

  test("repeating the same line doesn't duplicate it", () => {
    const t = emptyTurn();
    t.acceptance = [crit(), crit()];
    assert.equal(run(t, { session: answered() }).session.items[0].acceptance.length, 1);
  });
});

describe("re-adding a modifier (from the persona evals)", () => {
  test("is skipped with a warning instead of failing the turn", () => {
    const t = emptyTurn();
    t.router.add_modifiers = [{ item: "item-1", modifier: "integration", quote: "short picks by shift" }];
    const first = run(t);
    assert.equal(first.applied, true);
    const again = run(emptyTurn(), { session: first.session });
    const t2 = emptyTurn();
    t2.router.add_modifiers = [{ item: "item-1", modifier: "integration", quote: "short picks by shift" }];
    const second = run(t2, { session: again.session });
    assert.equal(second.applied, true);
    assert.deepEqual(second.session.items[0].modifiers, ["integration"]);
    assert.match(second.warnings[0], /already has the integration modifier/);
  });
});

describe("answer capture (from the persona evals)", () => {
  const ANSWER = "Baseline is about 50 short picks a day across all shifts.";
  const asked = (area: string, item: string | null = null): Session => {
    const session = freshSession();
    session.session.last_target = { item, area };
    return session;
  };
  const said = [{ role: "user" as const, text: ANSWER, at: T0 }];

  test("an answer the turn didn't record is stored as the user's words, assumed and marked captured, under the area asked", () => {
    const r = run(emptyTurn(), { session: asked("core.outcome"), transcript: said });
    assert.equal(r.applied, true);
    assert.deepEqual(r.session.core.outcome, { status: "assumed", value: ANSWER, quotes: [ANSWER], probe_count: 0, updated_at: NOW, source: "captured" });
    assert.match(r.warnings.join(" "), /core\.outcome captured from the user's reply/);
  });

  test("a first attempt that doesn't record the answer is sent back naming the area and the question; nothing is captured", () => {
    const session = asked("core.outcome");
    session.session.last_target!.reply = "What number would tell you this worked?";
    const r = run(emptyTurn(), { session, transcript: said, capture: false });
    expectRejected(r, "/updates", 'your last question ("What number would tell you this worked?") was about core.outcome');
  });

  test("a follow-up on an area already answered is sent back too, but never captured over the answer", () => {
    const session = asked("core.outcome");
    session.core.outcome = { status: "covered", value: "earlier", quotes: ["count by picker"], probe_count: 0, updated_at: T0 };
    expectRejected(run(emptyTurn(), { session, transcript: said, capture: false }), "/updates", "was about core.outcome");
    assert.equal(run(emptyTurn(), { session, transcript: said }).session.core.outcome.value, "earlier");
  });

  test("nothing is captured when the stored question isn't the one the user saw", () => {
    // After a turn that couldn't be saved, the user saw that turn's reply, not the stored one.
    const session = asked("core.outcome");
    session.session.last_target!.reply = "What number would tell you this worked?";
    for (const capture of [false, true]) {
      const r = run(emptyTurn(), { session, transcript: said, lastReply: "Who signs off on it?", capture });
      assert.equal(r.applied, true);
      assert.equal(r.session.core.outcome.updated_at, undefined);
    }
    const seen = run(emptyTurn(), { session, transcript: said, lastReply: "What number would tell you this worked?" });
    assert.equal(seen.session.core.outcome.source, "captured");
  });

  test("nothing is captured when the turn recorded the reply under another area", () => {
    // Found in the first live test: a question about what makes mistakes easy was labelled
    // core.systems, and the answer was captured there.
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.trust", status: "covered", value: "Baseline counts catch it", quote: "about 50 short picks a day" }];
    const r = run(t, { session: asked("core.systems"), transcript: said, capture: false });
    assert.equal(r.applied, true);
    assert.equal(r.session.core.systems.updated_at, undefined);
  });

  test("a captured answer is replaced by the model's own record of the area", () => {
    const session = asked("core.outcome");
    session.core.outcome = { status: "assumed", value: "earlier words", quotes: ["count by picker"], probe_count: 0, updated_at: T0, source: "captured" };
    const t = emptyTurn();
    t.updates = [{ item: "item-1", area: "core.outcome", status: "covered", value: "50 a day now", quote: "about 50 short picks a day" }];
    const r = run(t, { session, transcript: said });
    assert.equal(r.session.core.outcome.status, "covered");
    assert.equal(r.session.core.outcome.source, undefined);
    assert.deepEqual(r.session.items[0].core_overrides, {}, "a captured shared answer is replaced, not overridden");
  });

  test("an item's answer replaces a shared area that was only marked unknown, rather than overriding it", () => {
    // Found in the first live test: outcome was pre-marked unknown, the item's answer became an
    // override, and the shared outcome stayed unknown.
    const session = freshSession();
    session.core.outcome = { status: "unknown", value: null, quotes: [], probe_count: 0, updated_at: T0 };
    const t = emptyTurn();
    t.updates = [{ item: "item-1", area: "core.outcome", status: "covered", value: "50 a day now", quote: "eats my whole Monday morning" }];
    const r = run(t, { session });
    assert.equal(r.session.core.outcome.status, "covered");
    assert.deepEqual(r.session.items[0].core_overrides, {});
  });

  test("an item's module area is captured on that item", () => {
    const r = run(emptyTurn(), { session: asked("data_report.decision", "item-1"), transcript: said });
    assert.equal(r.session.items[0].coverage["data_report.decision"].status, "assumed");
  });

  test("the model's own record wins, and an area already answered is never overwritten", () => {
    const t = emptyTurn();
    t.updates = [{ item: null, area: "core.outcome", status: "covered", value: "Fewer short picks", quote: "50 short picks a day" }];
    assert.equal(run(t, { session: asked("core.outcome"), transcript: said }).session.core.outcome.status, "covered");
    const answered = asked("core.outcome");
    answered.core.outcome = { status: "covered", value: "earlier", quotes: ["count by picker"], probe_count: 0, updated_at: T0 };
    assert.equal(run(emptyTurn(), { session: answered, transcript: said }).session.core.outcome.value, "earlier");
  });

  test("a short reply, or no transcript, captures nothing", () => {
    const short = [{ role: "user" as const, text: "ok, go on", at: T0 }];
    assert.equal(run(emptyTurn(), { session: asked("core.outcome"), transcript: short }).session.core.outcome.status, "unknown");
    assert.equal(run(emptyTurn(), { session: asked("core.outcome"), transcript: null }).session.core.outcome.status, "unknown");
  });

  test("an area marked unknown before it was asked is filled by the user's answer", () => {
    // Found in the persona evals: the model marked core.outcome unknown, then asked it; the
    // answer was lost because capture only filled empty areas.
    const session = asked("core.outcome");
    session.core.outcome = { status: "unknown", value: null, quotes: [], probe_count: 0, updated_at: T0 };
    const r = run(emptyTurn(), { session, transcript: said });
    assert.equal(r.session.core.outcome.status, "assumed");
    assert.equal(r.session.core.outcome.value, ANSWER);
  });

  test("a don't-know reply is captured as unknown, with their words, never as an assumption", () => {
    const dunno = [{ role: "user" as const, text: "Not sure. Maybe finance or whoever handles numbers.", at: T0 }];
    const r = run(emptyTurn(), { session: asked("core.outcome"), transcript: dunno });
    assert.equal(r.session.core.outcome.status, "unknown");
    assert.equal(r.session.core.outcome.value, null);
    assert.deepEqual(r.session.core.outcome.quotes, ["Not sure. Maybe finance or whoever handles numbers."]);
  });

  test("each applied turn remembers the question code chose for it", () => {
    assert.deepEqual(run(emptyTurn()).session.session.last_target, { item: "item-1", area: "data_report.decision", reply: "What happens next?" });
  });
});

describe("supersede direction (from the persona evals)", () => {
  test("a follow-on can't supersede the item it was spawned from", () => {
    const t = emptyTurn();
    t.router.new_items = [{ id: "item-2", type: "manual_process", confidence: "high", title: "Keying orders by hand", trigger_quote: "count by picker", spawned_from: "item-1" }];
    t.router.supersede = { item: "item-1", by: "item-2", quote: "count by picker" };
    expectRejected(run(t), "/router/supersede", 'send { "item": "item-2", "by": "item-1" }');
  });

  test("the right direction is accepted", () => {
    const t = emptyTurn();
    t.router.new_items = [{ id: "item-2", type: "manual_process", confidence: "high", title: "Keying orders by hand", trigger_quote: "count by picker", spawned_from: "item-1" }];
    t.router.supersede = { item: "item-2", by: "item-1", quote: "count by picker" };
    const r = run(t);
    assert.equal(r.applied, true);
    assert.equal(r.session.items[1].superseded_by, "item-1");
  });
});

describe("asked stamps (first live test)", () => {
  const stamped = () => { const s = freshSession(); s.session.asked = {}; return s; };

  test("each applied turn stamps the area code chose, once, and moves on", () => {
    const r = run(emptyTurn(), { session: stamped() });
    assert.deepEqual(r.session.session.asked, { "item-1:data_report.decision": NOW });
    const again = run(emptyTurn(), { session: r.session, now: "2026-10-10T15:00:00.000Z" });
    assert.equal(again.session.session.asked!["item-1:data_report.decision"], NOW);
    assert.equal(Object.keys(again.session.session.asked!).length, 2);
  });

  test("a session without stamps doesn't start getting them", () => {
    assert.equal(run(emptyTurn()).session.session.asked, undefined);
  });

  test("the stamps are valid in the session schema", () => {
    assert.equal(validateSession(run(emptyTurn(), { session: stamped() }).session).ok, true);
  });
});

describe("taking back what doesn't apply (first live test)", () => {
  const withFollowOn = () => {
    const s = freshSession();
    const t = emptyTurn();
    t.router.new_items = [{ id: "item-2", type: "manual_process", confidence: "med", title: "Monday spreadsheet", trigger_quote: "I build it in Excel every Monday", spawned_from: "item-1" }];
    return run(t, { session: s }).session;
  };

  test("an item that doesn't apply is dropped with the user's words, not superseded", () => {
    const t = emptyTurn();
    t.router.drop = { item: "item-2", reason: "the user said it's a fallback, not something they do", quote: "eats my whole Monday morning" };
    const r = run(t, { session: withFollowOn() });
    assert.equal(r.applied, true);
    assert.deepEqual(r.session.items[1].dropped, { reason: "the user said it's a fallback, not something they do", quote: "eats my whole Monday morning", at: NOW });
    assert.equal(r.session.items[1].superseded_by, null);
    assert.equal(validateSession(r.session).ok, true);
  });

  test("a drop needs a reason and the user's words, and can't be a supersede too", () => {
    const t = emptyTurn();
    t.router.drop = { item: "item-2", reason: " ", quote: "words nobody said" };
    t.router.supersede = { item: "item-2", by: "item-1", quote: "count by picker" };
    const r = run(t, { session: withFollowOn() });
    expectRejected(r, "/router/drop/reason", "say why");
    expectRejected(r, "/router/drop/quote", "isn't the user's words");
    expectRejected(r, "/router/drop", "can't be dropped and superseded");
  });

  test("a modifier can be taken back, and is remembered as removed", () => {
    const s = freshSession();
    s.items[0].modifiers = ["integration"];
    const t = emptyTurn();
    t.router.remove_modifiers = [{ item: "item-1", modifier: "integration", reason: "they said there's no API" }];
    const r = run(t, { session: s });
    assert.deepEqual(r.session.items[0].modifiers, []);
    assert.deepEqual(r.session.items[0].modifiers_removed, ["integration"]);
  });
});

describe("one question and one follow-up per area (first live test)", () => {
  test("code never plans a third question on an area", () => {
    const AREA = "data_report.decision";
    const s = freshSession();
    s.session.asked = { [`item-1:${AREA}`]: T0 };
    s.items[0].coverage[AREA] = { status: "assumed", value: "retraining, I think", quotes: ["count by picker"], probe_count: 1, updated_at: T0 };
    const plan = planTargets(s, fw);
    assert.notEqual(plan.primary?.area, AREA);
    assert.notEqual(plan.alternate?.area, AREA);
  });
});

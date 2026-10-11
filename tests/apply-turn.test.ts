import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework.ts";
import { applyTurn, type ApplyResult } from "../src/lib/apply-turn.ts";
import { normalize, findQuote, type TranscriptEntry } from "../src/lib/grounding.ts";
import { validateSession } from "../src/lib/schemas.ts";
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
    router: { new_items: [], reclassify: null, add_modifiers: [], supersede: null },
    prose: [],
    open_questions: [],
    reflect_back: null,
    next_target: { item: null, area: null, is_probe: false },
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

function run(turn: any, opts: { session?: Session; transcript?: TranscriptEntry[] | null; now?: string } = {}): ApplyResult {
  return applyTurn(opts.session ?? freshSession(), turn, {
    fw,
    transcript: opts.transcript === undefined ? TRANSCRIPT : opts.transcript,
    now: opts.now ?? NOW,
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

  test("an item's core override leaves the shared core alone", () => {
    const turn = emptyTurn();
    turn.updates = [{ item: "item-1", area: "core.data", status: "covered", value: "Has badge numbers", quote: "count by picker" }];
    const r = run(turn);
    assert.equal(r.session.items[0].core_overrides.data.value, "Has badge numbers");
    assert.equal(r.session.core.data.status, "unknown");
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
    ["fact quote", (t: any) => { t.facts = [{ item: "item-1", fact: "value", band: "high", evidence: [], quote: "huge savings" }]; }],
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

describe("probe discipline: one probe per area", () => {
  function answered(): Session {
    const s = freshSession();
    s.core.outcome = { status: "assumed", value: "Monday", quotes: ["it eats my whole Monday morning"], probe_count: 0, updated_at: T0 };
    return s;
  }
  const probe = (area = "core.outcome", item: string | null = null) => { const t = emptyTurn(); t.next_target = { item, area, is_probe: true }; return t; };

  test("the first probe is allowed and counted", () => {
    const r = run(probe(), { session: answered() });
    assert.deepEqual(r.rejections, []);
    assert.equal(r.session.core.outcome.probe_count, 1);
  });

  test("a second probe is rejected", () => {
    const s = answered();
    s.core.outcome.probe_count = 1;
    expectRejected(run(probe(), { session: s }), "/next_target/is_probe", "already been probed once");
  });

  test("probing an area never answered is a first ask, not a probe", () => {
    expectRejected(run(probe("core.trust")), "/next_target/is_probe", "first ask");
  });

  test("an area the user answered \"I don't know\" can still be probed once", () => {
    const s = freshSession();
    s.core.trust = { status: "unknown", value: null, quotes: [], probe_count: 0, updated_at: T0 };
    assert.equal(run(probe("core.trust"), { session: s }).applied, true);
  });

  test("an answer and its probe in the same turn", () => {
    const t = probe("data_report.grain", "item-1");
    t.updates = [{ item: "item-1", area: "data_report.grain", status: "assumed", value: "Usually per shift", quote: "count by picker" }];
    const r = run(t);
    assert.equal(r.session.items[0].coverage["data_report.grain"].probe_count, 1);
  });

  test("a probe with no area", () => expectRejected(run(probe(null as any)), "/next_target/is_probe", "has to target an area"));
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

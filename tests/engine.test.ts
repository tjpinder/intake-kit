// Interview engine v2 (HANDOFF.md, "Interview engine v2"): code runs the interview. One test per
// rule, especially Apply and Spawn. The model's outputs are scripted; nothing here calls a model.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { scoreAndGate } from "../src/lib/gates.ts";
import { hasNumber, usableBand } from "../src/lib/score.ts";
import { renderAll } from "../src/lib/render.ts";
import { readTemplates } from "../src/lib/framework-fs.ts";
import { validateSession } from "../src/lib/schemas.ts";
import type { Session } from "../src/lib/session.ts";
import type { TranscriptEntry } from "../src/lib/grounding.ts";
import { applyAnswer, applyCheck, entryOf } from "../src/engine/apply.ts";
import { applyOpening, keepModifier, signalCheck, TYPE_QUESTION } from "../src/engine/open.ts";
import { nextTarget, queueFor, requiredAreas } from "../src/engine/plan.ts";
import { newEngine, SEND_AGAIN, TURN_BUDGET, type Extraction, type OpeningResult, type Pending } from "../src/engine/types.ts";
import { runEngineTurn, SUMMARY_REPLY } from "../src/engine/turn.ts";
import { enterSummary } from "../src/engine/writeup.ts";
import type { Provider, TurnRequest } from "../src/llm/types.ts";

const fw = loadFramework(".");
const NOW = "2026-10-14T10:00:00.000Z";
const user = (text: string, n = 0): TranscriptEntry => ({ role: "user", text, at: `2026-10-14T09:${String(n).padStart(2, "0")}:00.000Z` });

const OPENING = "I need a report of short picks by shift and picker so my shift leads can target retraining.";
const T: TranscriptEntry[] = [
  user(OPENING, 0),
  user("So I know who to pull for retraining that week. Right now I build it in Excel every Monday by hand.", 1),
  user("It takes about four hours every Monday morning.", 2),
];

function empty(): Session {
  const seeded = () => ({ status: "unknown" as const, value: null, quotes: [], probe_count: 0 });
  return {
    schema_version: 1, framework_version: "0.1.0",
    session: { id: "2026-10-14-abcd", started_at: NOW, mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null, asked: {}, engine: newEngine() },
    core: { users: seeded(), outcome: seeded(), data: seeded(), systems: seeded(), constraints: seeded(), trust: seeded() },
    items: [],
  };
}
const opening = (over: Partial<OpeningResult> = {}): OpeningResult => ({ type: "data_report", confidence: "high", title: "Short-pick report", trigger_quote: "I need a report of short picks", modifiers: [], also_answers: [], ...over });
function started(): Session {
  const out = applyOpening(empty(), opening(), { fw, transcript: T, now: NOW }, { mayProbe: false });
  assert.equal(out.kind, "created");
  return (out as { session: Session }).session;
}
const ctx = { fw, transcript: T, now: NOW };
const x = (over: Partial<Extraction> = {}): Extraction => ({ status: "answered", value: "Who to retrain", quote: "who to pull for retraining", check: "none", wrap_up: false, also_answers: [], ...over });
const ask = (area: string, kind: Pending["kind"] = "ask", item = "item-1"): Pending => ({ item, area, kind, check: null, question: "q?" });

describe("Open", () => {
  test("a negated signal never adds a modifier; a described one does", () => {
    assert.equal(keepModifier(fw, "integration", "no database, no API and no network"), false);
    assert.equal(keepModifier(fw, "integration", "no database or external API involved"), false);
    assert.equal(keepModifier(fw, "integration", "orders come in over an API from the customer"), true);
  });

  test("an uncertain opening, or one its signal phrases don't back, gets the one type question, then is accepted", () => {
    const low = applyOpening(empty(), opening({ confidence: "low" }), ctx, { mayProbe: true });
    assert.equal(low.kind, "probe");
    assert.equal((low as { question: string }).question, TYPE_QUESTION);
    assert.equal(applyOpening(empty(), opening({ confidence: "low" }), ctx, { mayProbe: false }).kind, "created");
    // High confidence, but nothing in the words backs it (persona 7's opening, classified exploratory).
    const idea = [user("I want hiring managers to see I can do the enablement side of AI, not just the build side.")];
    assert.equal(applyOpening(empty(), opening({ type: "exploratory" }), { ...ctx, transcript: idea }, { mayProbe: true }).kind, "probe");
    // High confidence and the words agree: no question.
    assert.equal(applyOpening(empty(), opening(), ctx, { mayProbe: true }).kind, "created");
    assert.deepEqual(signalCheck(fw, OPENING, "data_report"), { agrees: true, points_to: "data_report" });
    assert.equal(signalCheck(fw, "Could AI write our SOPs?", "manual_process").agrees, false, "a known-idea signal points elsewhere");
  });

  test("areas the opening answers start covered, only with the user's words", () => {
    const out = applyOpening(empty(), opening({ also_answers: [
      { area: "data_report.grain", value: "By shift and picker", quote: "by shift and picker" },
      { area: "core.users", value: "Shift leads", quote: "words nobody said" },
    ] }), ctx, { mayProbe: false }) as { session: Session };
    assert.equal(out.session.items[0].coverage["data_report.grain"].status, "covered");
    assert.equal(out.session.core.users.updated_at, undefined, "an ungrounded pre-answer is dropped");
  });
});

describe("Plan", () => {
  test("the anchor area comes first, then required core, then the rest of the module", () => {
    const s = started();
    const q = queueFor(s.items[0], fw);
    assert.equal(q[0], "data_report.decision");
    assert.deepEqual(q.slice(1, 7), ["core.users", "core.outcome", "core.data", "core.systems", "core.constraints", "core.trust"]);
    assert.ok(q.indexOf("data_report.definition") > q.indexOf("core.trust"));
    for (const [type, anchor] of [["known_idea", "known_idea.current"], ["manual_process", "manual_process.walkthrough"], ["broken", "broken.symptom"]] as const) {
      const k = applyOpening(empty(), opening({ type }), ctx, { mayProbe: false }) as { session: Session };
      assert.equal(queueFor(k.session.items[0], fw)[0], anchor, type);
    }
  });

  test("required areas include constraints for every type and the proposal for a known idea", () => {
    for (const type of ["broken", "manual_process", "known_idea", "exploratory", "data_report"] as const) {
      const k = applyOpening(empty(), opening({ type }), ctx, { mayProbe: false }) as { session: Session };
      assert.ok(requiredAreas(k.session.items[0], fw).has("core.constraints"), type);
    }
    const idea = applyOpening(empty(), opening({ type: "known_idea" }), ctx, { mayProbe: false }) as { session: Session };
    assert.ok(requiredAreas(idea.session.items[0], fw).has("known_idea.proposal"));
  });

  test("every templated section maps to a required area, or renders as an open question", () => {
    for (const type of ["broken", "manual_process", "known_idea", "exploratory", "data_report"] as const) {
      const k = applyOpening(empty(), opening({ type }), ctx, { mayProbe: false }) as { session: Session };
      const item = k.session.items[0];
      const req = requiredAreas(item, fw);
      const areas = ["core", type].flatMap((m) => fw.modules[m].areas);
      const sections = new Set(areas.flatMap((a) => a.feeds.filter((f) => ["SPEC.md", "ACCEPTANCE.md", "GUARDRAILS.md"].includes(f.file)).map((f) => `${f.file}#${f.section}`)));
      for (const sec of sections) {
        const feeders = areas.filter((a) => a.feeds.some((f) => `${f.file}#${f.section}` === sec)).map((a) => a.id);
        assert.ok(feeders.some((id) => req.has(id)), `${type} ${sec}: no required source (${feeders.join(", ")})`);
      }
      // Forced to the summary with nothing asked, every required area becomes an open question.
      const summary = enterSummary(k.session, fw, NOW);
      for (const id of queueFor(item, fw)) assert.ok(summary.items[0].open_questions.some((q) => q.area === id), `${type}: ${id} not an open question`);
    }
  });

  test("a probe jumps the queue for its own area; a declined area never comes back", () => {
    let s = started();
    s = applyAnswer(s, ask("data_report.decision"), x({ status: "partial", value: "Retraining, I think", quote: "who to pull for retraining" }), ctx).session;
    assert.deepEqual(nextTarget(s, fw, T), { item: "item-1", area: "data_report.decision", kind: "probe", check: null });
    s = applyAnswer(s, ask("core.users"), x({ status: "declined", value: null, quote: null }), ctx).session;
    s.session.engine!.areas["item-1:data_report.decision"] = { probed: true, confirm: "none", partial: { value: "Retraining", quote: "who to pull for retraining" } };
    s = applyAnswer(s, ask("data_report.decision", "probe"), x({ status: "answered" }), ctx).session;
    assert.notEqual(nextTarget(s, fw, T)?.area, "core.users");
  });
});

describe("Apply", () => {
  test("answered with a grounded quote: covered", () => {
    const s = applyAnswer(started(), ask("data_report.decision"), x(), ctx).session;
    assert.deepEqual(entryOf(s, s.items[0], "data_report.decision"), { status: "covered", value: "Who to retrain", quotes: ["who to pull for retraining"], probe_count: 0, updated_at: NOW });
  });

  test("an answer whose quote isn't the user's words is never recorded: one probe instead", () => {
    const s = applyAnswer(started(), ask("data_report.decision"), x({ quote: "they want a daily dashboard" }), ctx).session;
    assert.equal(entryOf(s, s.items[0], "data_report.decision"), undefined);
    assert.equal(s.session.engine!.areas["item-1:data_report.decision"].partial?.quote, null);
  });

  test("partial or off-topic queues exactly one probe; the probe counts when asked", () => {
    for (const status of ["partial", "off_topic"] as const) {
      const s = applyAnswer(started(), ask("data_report.decision"), x({ status }), ctx).session;
      assert.equal(s.session.engine!.areas["item-1:data_report.decision"].probed, false, "not counted until asked");
      assert.equal(nextTarget(s, fw, T)?.kind, "probe");
    }
  });

  test("still unresolved after its probe: assumed with a quote, unknown without; never a third ask", () => {
    let s = applyAnswer(started(), ask("data_report.decision"), x({ status: "partial", value: "Retraining?", quote: "who to pull for retraining" }), ctx).session;
    s.session.engine!.areas["item-1:data_report.decision"].probed = true;
    const withQuote = applyAnswer(s, ask("data_report.decision", "probe"), x({ status: "off_topic", value: null, quote: null }), ctx).session;
    assert.equal(entryOf(withQuote, withQuote.items[0], "data_report.decision")!.status, "assumed");
    let t = applyAnswer(started(), ask("data_report.decision"), x({ status: "partial", value: null, quote: null }), ctx).session;
    t.session.engine!.areas["item-1:data_report.decision"].probed = true;
    t = applyAnswer(t, ask("data_report.decision", "probe"), x({ status: "partial", value: null, quote: null }), ctx).session;
    assert.equal(entryOf(t, t.items[0], "data_report.decision")!.status, "unknown");
    assert.notEqual(nextTarget(t, fw, T)?.area, "data_report.decision");
  });

  test("not applicable and declined are marked as such and never asked again", () => {
    for (const status of ["not_applicable", "declined"] as const) {
      const s = applyAnswer(started(), ask("core.constraints"), x({ status, value: null, quote: null }), ctx).session;
      assert.equal(s.core.constraints.status, status);
      assert.notEqual(nextTarget(s, fw, T)?.area, "core.constraints");
    }
  });

  test("an assumed critical answer gets one confirmation; yes makes it covered", () => {
    let s = started();
    s.core.users = { status: "assumed", value: "Shift leads", quotes: ["my shift leads"], probe_count: 1, updated_at: NOW };
    s.session.asked = { "item-1:data_report.decision": NOW };
    s = applyAnswer(s, ask("data_report.decision"), x(), ctx).session;
    assert.deepEqual(nextTarget(s, fw, T), { item: "item-1", area: "core.users", kind: "confirm", check: null });
    const yes = applyAnswer(s, ask("core.users", "confirm"), x({ check: "yes" }), ctx).session;
    assert.equal(yes.core.users.status, "covered");
    assert.notEqual(nextTarget(yes, fw, T)?.area, "core.users");
  });

  test("no on a confirmation discards the value and marks the area unknown", () => {
    const s = started();
    s.core.users = { status: "assumed", value: "Shift leads", quotes: ["my shift leads"], probe_count: 1, updated_at: NOW };
    const no = applyAnswer(s, ask("core.users", "confirm"), x({ check: "no" }), ctx).session;
    assert.equal(no.core.users.status, "unknown");
    assert.equal(no.core.users.value, null);
    assert.equal(no.session.engine!.areas["core.users"].confirm, "done", "asked once");
  });

  test("also_answers covers other areas only with their own grounded quote", () => {
    const s = applyAnswer(started(), ask("data_report.decision"), x({ also_answers: [
      { area: "core.outcome", value: "Four hours every Monday", quote: "about four hours every Monday morning" },
      { area: "core.data", value: "WMS", quote: "it all comes from the WMS" },
    ] }), ctx).session;
    assert.equal(s.core.outcome.status, "covered");
    assert.equal(s.core.data.updated_at, undefined);
  });

  test("the number guard: a number counts only attached to a unit or quantity", () => {
    for (const t of ["one hour", "50 orders", "20%", "$300", "3 people per week", "about 50 a day", "four hours every Monday"]) assert.ok(hasNumber(t), t);
    for (const t of ["no one", "if no one looks at the repo", "three", "if no one reports it"]) assert.ok(!hasNumber(t), t);
  });

  test("a baseline may come from any quote in the session; with none, the cost follow-up is asked", () => {
    let s = started();
    s.core.outcome = { status: "covered", value: "Fewer short picks", quotes: ["so my shift leads can target retraining"], probe_count: 0, updated_at: NOW };
    s.items[0].facts.success_metric = { band: "measurable_with_baseline", evidence: ["core.outcome"], quotes: [] };
    assert.equal(usableBand(s, s.items[0], "success_metric"), "vague");
    s.session.asked = { "item-1:data_report.decision": NOW };
    s.items[0].coverage["data_report.decision"] = { status: "covered", value: "Retraining", quotes: ["who to pull for retraining"], probe_count: 0, updated_at: NOW };
    s.core.users = { status: "covered", value: "Shift leads", quotes: ["my shift leads"], probe_count: 0, updated_at: NOW };
    const t = nextTarget(s, fw, T)!;
    assert.deepEqual([t.area, t.kind, t.purpose], ["core.outcome", "probe", "baseline"]);
    s.items[0].coverage["manual_process.volume"] = { status: "covered", value: "Four hours", quotes: ["It takes about four hours every Monday morning."], probe_count: 0, updated_at: NOW };
    s.items[0].coverage["data_report.grain"] = { status: "covered", value: "x", quotes: ["about four hours every Monday morning"], probe_count: 0, updated_at: NOW };
    assert.equal(usableBand(s, s.items[0], "success_metric"), "measurable_with_baseline");
  });
});

describe("Spawn", () => {
  const check = (): Pending => ({ item: "item-1", area: "data_report.decision", kind: "check", check: "manual_work", question: "Do you build it by hand today?" });
  const asked = (s: Session, asks: number) => { s.session.engine!.checks["item-1:manual_work"] = { asks, result: null }; return s; };

  test("yes with a grounded quote creates exactly one follow-on item, replaced by the primary", () => {
    const s = applyCheck(asked(started(), 1), check(), x({ check: "yes", value: "Monday Excel sheet", quote: "I build it in Excel every Monday by hand" }), ctx).session;
    assert.equal(s.items.length, 2);
    assert.deepEqual([s.items[1].type, s.items[1].spawned_from, s.items[1].superseded_by, s.items[1].trigger_quote], ["manual_process", "item-1", "item-1", "I build it in Excel every Monday by hand"]);
    assert.equal(validateSession(s).ok, true);
  });

  test("yes without the user's words, or with words they didn't say, creates nothing and asks once more", () => {
    for (const quote of [null, "I do it by hand every day"]) {
      const s = applyCheck(asked(started(), 1), check(), x({ check: "yes", quote }), ctx).session;
      assert.equal(s.items.length, 1);
      assert.equal(s.session.engine!.checks["item-1:manual_work"].result, null);
    }
  });

  test("no creates nothing; unclear is asked once more, then treated as no", () => {
    const no = applyCheck(asked(started(), 1), check(), x({ check: "no", quote: null }), ctx).session;
    assert.deepEqual([no.items.length, no.session.engine!.checks["item-1:manual_work"].result], [1, "no"]);
    const once = applyCheck(asked(started(), 1), check(), x({ check: "unclear", quote: null }), ctx).session;
    assert.equal(once.session.engine!.checks["item-1:manual_work"].result, null, "asked once more");
    const twice = applyCheck(asked(started(), 2), check(), x({ check: "unclear", quote: null }), ctx).session;
    assert.deepEqual([twice.items.length, twice.session.engine!.checks["item-1:manual_work"].result], [1, "no"]);
  });

  test("the manual-work check is planned only when work by hand was mentioned, not negated, after the required areas", () => {
    const s = started();
    for (const id of queueFor(s.items[0], fw)) s.session.asked![id.startsWith("core.") ? id : `item-1:${id}`] = NOW;
    for (const id of queueFor(s.items[0], fw)) {
      const e = { status: "covered" as const, value: "v", quotes: ["about four hours every Monday morning"], probe_count: 0, updated_at: NOW };
      if (id.startsWith("core.")) s.core[id.slice(5) as keyof Session["core"]] = e; else s.items[0].coverage[id] = e;
    }
    assert.deepEqual(nextTarget(s, fw, T), { item: "item-1", area: "data_report.decision", kind: "check", check: "manual_work" });
    assert.equal(nextTarget(s, fw, [user(OPENING), user("Nothing is done by hand; it's all automated.", 1)]), null);
  });

  test("a follow-on item gets only its light pass, after the primary", () => {
    const s = applyCheck(asked(started(), 1), check(), x({ check: "yes", value: "Monday sheet", quote: "I build it in Excel every Monday by hand" }), ctx).session;
    assert.deepEqual(queueFor(s.items[1], fw), ["core.users", "core.outcome", "manual_process.volume"]);
  });

  test("only the two checks can create an item: an ordinary answer never does", () => {
    const s = applyAnswer(started(), ask("data_report.decision"), x({ value: "I do it by hand in Excel", quote: "I build it in Excel every Monday by hand" }), ctx).session;
    assert.equal(s.items.length, 1);
  });
});

/** A provider that answers each call (by its format name) from a script. */
function scripted(script: Record<string, Array<unknown | Error>>): Provider & { log: string[] } {
  const log: string[] = [];
  return {
    name: "azure-openai",
    log,
    async complete(req: TurnRequest) {
      const name = req.format!.name;
      log.push(name);
      const next = script[name]?.shift();
      if (next instanceof Error) throw next;
      return { text: typeof next === "string" ? next : JSON.stringify(next ?? {}), model: "gpt-4.1", usage: { inputTokens: 10, outputTokens: 5, cachedInputTokens: 0 } };
    },
  };
}
const phrase = (q: string) => ({ question: q });
const writeUp = { facts: [], prose: [], acceptance: [], guardrails: [], open_questions: [], reflect_back_text: "A report." };

describe("the turn loop", () => {
  test("the opening creates the item and code asks the anchor area first", async () => {
    const provider = scripted({ classify_opening: [opening()], phrase: [phrase("What will you do differently with it?")] });
    const out = await runEngineTurn({ provider, fw, session: empty(), transcript: [T[0]], replies: [], now: () => NOW });
    assert.equal(out.result, "applied");
    assert.equal(out.reply, "What will you do differently with it?");
    assert.deepEqual(out.session.session.engine!.pending, { item: "item-1", area: "data_report.decision", kind: "ask", check: null, question: "What will you do differently with it?" });
  });

  test("failed calls get at most two retries per turn, then 'send again' and nothing is recorded", async () => {
    const s = started();
    s.session.engine!.pending = ask("data_report.decision");
    const provider = scripted({ extract: ["not json", { status: "nonsense" }, "still not json"] });
    const out = await runEngineTurn({ provider, fw, session: s, transcript: T.slice(0, 2), replies: ["q?"], now: () => NOW });
    assert.equal(out.result, "send_again");
    assert.equal(out.reply, SEND_AGAIN);
    assert.equal(out.session, s, "nothing recorded");
    assert.equal(provider.log.length, 3);
  });

  test("the turn budget always ends the interview in the summary, with open areas unknown", async () => {
    const s = started();
    s.session.engine!.pending = ask("data_report.decision");
    const many = Array.from({ length: TURN_BUDGET }, (_, i) => user(i === 0 ? OPENING : "who to pull for retraining", i));
    const provider = scripted({ extract: [x()], write_up: [writeUp] });
    const out = await runEngineTurn({ provider, fw, session: s, transcript: many, replies: [], now: () => NOW });
    assert.equal(out.reply, SUMMARY_REPLY);
    assert.equal(out.session.session.engine!.phase, "summary");
    assert.equal(out.session.core.constraints.status, "unknown");
    assert.ok(out.session.session.reflect_back!.text.length > 0, "the summary renders");
  });

  test("a wrap-up request goes straight to the summary; a failed write-up still renders it", async () => {
    const s = started();
    s.session.engine!.pending = ask("data_report.decision");
    const provider = scripted({ extract: [x({ wrap_up: true })], write_up: ["bad", "bad", "bad"] });
    const out = await runEngineTurn({ provider, fw, session: s, transcript: T.slice(0, 2), replies: ["q?"], now: () => NOW });
    assert.equal(out.session.session.engine!.phase, "summary");
    assert.ok(out.session.session.reflect_back!.text.includes("Short-pick report"));
  });

  test("Confirm scores and gates; a typed correction updates the area and re-renders", async () => {
    let s = started();
    s.session.engine!.pending = ask("data_report.decision");
    s = (await runEngineTurn({ provider: scripted({ extract: [x({ wrap_up: true })], write_up: [writeUp] }), fw, session: s, transcript: T.slice(0, 2), replies: ["q?"], now: () => NOW })).session;
    const corrected = await runEngineTurn({
      provider: scripted({ extract: [x({ check: "no", also_answers: [{ area: "core.outcome", value: "Four hours a week", quote: "about four hours every Monday morning" }] })], write_up: [writeUp] }),
      fw, session: s, transcript: T, replies: ["q?", SUMMARY_REPLY], now: () => NOW,
    });
    assert.equal(corrected.session.core.outcome.value, "Four hours a week");
    assert.deepEqual(corrected.session.session.reflect_back!.corrections, ["core.outcome: Four hours a week"]);
    const confirmed = await runEngineTurn({ provider: scripted({}), fw, session: corrected.session, transcript: T, replies: ["q?", SUMMARY_REPLY], now: () => NOW, action: "confirm" });
    assert.equal(confirmed.confirmed, true);
    assert.ok(confirmed.session.items.every((i) => i.gate));
    assert.equal(validateSession(confirmed.session).ok, true, validateSession(confirmed.session).errors.join("; "));
    assert.ok(renderAll(confirmed.session, fw, readTemplates("."), null).size > 0, "the spec pack renders");
  });
});

void scoreAndGate;

describe("the summary can't loop (first v2 gate)", () => {
  async function atSummary(): Promise<Session> {
    const s = started();
    s.session.engine!.pending = ask("data_report.decision");
    return (await runEngineTurn({ provider: scripted({ extract: [x({ wrap_up: true })], write_up: [writeUp] }), fw, session: s, transcript: T.slice(0, 2), replies: ["q?"], now: () => NOW })).session;
  }
  const note = [{ area: "core.constraints", value: "Ready by 7am every day", quote: "about four hours every Monday morning" }];

  test("yes plus a note applies the note and confirms", async () => {
    const out = await runEngineTurn({ provider: scripted({ extract: [x({ check: "yes", also_answers: note })], write_up: [writeUp] }), fw, session: await atSummary(), transcript: T, replies: ["q?", SUMMARY_REPLY], now: () => NOW });
    assert.equal(out.confirmed, true);
    assert.equal(out.session.core.constraints.value, "Ready by 7am every day");
  });

  test("after two correction rounds the summary is confirmed with the notes attached", async () => {
    let s = await atSummary();
    for (const round of [1, 2, 3]) {
      const out = await runEngineTurn({ provider: scripted({ extract: [x({ check: "no", also_answers: note })], write_up: [writeUp] }), fw, session: s, transcript: T, replies: ["q?", SUMMARY_REPLY], now: () => NOW });
      assert.equal(out.confirmed, round === 3, `round ${round}`);
      s = out.session;
    }
    assert.ok(s.session.reflect_back!.corrections.length >= 3);
  });

  test("the turn budget ends the interview at the summary too", async () => {
    const many = Array.from({ length: TURN_BUDGET }, (_, i) => user(i === 0 ? OPENING : "who to pull for retraining", i));
    const out = await runEngineTurn({ provider: scripted({ extract: [x({ check: "no" })] }), fw, session: await atSummary(), transcript: many, replies: [], now: () => NOW });
    assert.equal(out.confirmed, true);
  });
});

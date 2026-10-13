// Status hints and light passes, added after the first persona eval baseline.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { guide, routingHint, statusOf, structureHints } from "../src/lib/guide.ts";
import type { Item, Session } from "../src/lib/session.ts";


describe("status hints and light passes (from the persona evals)", () => {
  const fwH = loadFramework(".");
  const base = (): Session => ({
    schema_version: 1,
    framework_version: "0.1.0",
    session: { id: "2026-10-11-abcd", started_at: "2026-10-11T00:00:00.000Z", mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null },
    core: Object.fromEntries(["users", "outcome", "data", "systems", "constraints", "trust"].map((k) => [k, { status: "unknown", value: null, quotes: [], probe_count: 0 }])) as unknown as Session["core"],
    items: [],
  });
  const item = (id: string, type: Item["type"], spawned_from: string | null = null): Item => ({
    id, title: id, type, confidence: "high", trigger_quote: "x", modifiers: [], spawned_from, superseded_by: null,
    type_history: [{ from: null, to: type, reason: "opening", quote: "x", at: "t" }],
    core_overrides: {}, coverage: {}, facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [],
  });
  const said = (...texts: string[]) => texts.map((text, i) => ({ role: "user" as const, text, at: `t${i}` }));

  test("a manual workaround is hinted only once the primary item's own interview is done", () => {
    const s = base();
    s.items = [item("item-1", "data_report")];
    const t = said("Today I paste it into Excel by hand every Monday.");
    assert.ok(!structureHints(s, fwH, t).some((h) => h.includes("manual_process")), "not while still interviewing");
    const hints = structureHints(s, fwH, t, { primaryInterviewed: true });
    assert.ok(hints.some((h) => h.includes('"by hand"') && h.includes("`manual_process` item")));
  });

  test("an integration signal is hinted until the modifier is on an item", () => {
    const s = base();
    s.items = [item("item-1", "broken")];
    const t = said("EDI orders stopped coming in.");
    assert.ok(structureHints(s, fwH, t).some((h) => h.includes("`integration` modifier")));
    s.items[0].modifiers = ["integration"];
    assert.ok(!structureHints(s, fwH, t).some((h) => h.includes("integration")));
  });

  test("signals match whole words only, and descriptive signals never match", () => {
    const s = base();
    s.items = [item("item-1", "manual_process")];
    assert.deepEqual(structureHints(s, fwH, said("Thanks for the feedback, a metric noun.")), []);
  });

  test("items spawned from an exploratory item get a light pass: no critical areas or acceptance needed", () => {
    const s = base();
    s.items = [item("item-1", "exploratory"), item("item-2", "manual_process", "item-1")];
    const st = statusOf(s, fwH, []);
    const spawned = st.items.find((i) => i.id === "item-2")!;
    assert.equal(spawned.light_pass, true);
    assert.deepEqual(spawned.critical_unasked, []);
    assert.ok(st.hints.some((h) => h.includes("exploratory intake")));
  });

  test("hints are passed on in next_step while interviewing", () => {
    const s = base();
    s.items = [item("item-1", "broken")];
    assert.match(statusOf(s, fwH, said("The EDI feed broke.")).next_step, /Also check: .*"EDI"/);
  });
});

describe("the write-up asks for bands only where they're scored", () => {
  test("light-pass and exploratory items need no bands to be ready", () => {
    const fwB = loadFramework(".");
    const s: Session = {
      schema_version: 1,
      framework_version: "0.1.0",
      session: { id: "2026-10-11-abce", started_at: "2026-10-11T00:00:00.000Z", mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null },
      core: Object.fromEntries(["users", "outcome", "data", "systems", "constraints", "trust"].map((k) => [k, { status: "covered", value: "v", quotes: ["q"], probe_count: 0, updated_at: "t" }])) as unknown as Session["core"],
      items: ["exploratory", "manual_process"].map((type, n) => ({
        id: `item-${n + 1}`, title: "t", type: type as Item["type"], confidence: "high" as const, trigger_quote: "q", modifiers: [], spawned_from: n ? "item-1" : null, superseded_by: null,
        type_history: [{ from: null, to: type as Item["type"], reason: "r", quote: "q", at: "t" }],
        core_overrides: {}, coverage: { "exploratory.instances": { status: "covered" as const, value: "v", quotes: ["q"], probe_count: 0, updated_at: "t" } }, facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [],
      })),
    };
    const st = statusOf(s, fwB, []);
    assert.equal(st.interview_complete, true);
    assert.equal(st.ready_for_reflect_back, true);
    assert.doesNotMatch(st.next_step, /facts_missing|for no item/, "no band clause when no item needs bands");
  });
});

describe("band sources (from the persona evals)", () => {
  test("a scored item isn't interviewed until each scored band has a source area asked", () => {
    const fwS = loadFramework(".");
    const answered = { status: "covered" as const, value: "v", quotes: ["q"], probe_count: 0, updated_at: "t" };
    const s: Session = {
      schema_version: 1,
      framework_version: "0.1.0",
      session: { id: "2026-10-12-abcd", started_at: "2026-10-12T00:00:00.000Z", mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null },
      core: Object.fromEntries(["users", "outcome", "data", "systems", "constraints", "trust"].map((k) => [k, k === "systems" ? { status: "unknown", value: null, quotes: [], probe_count: 0 } : answered])) as unknown as Session["core"],
      items: [{
        id: "item-1", title: "Report", type: "data_report", confidence: "high", trigger_quote: "q", modifiers: [], spawned_from: null, superseded_by: null,
        type_history: [{ from: null, to: "data_report", reason: "opening", quote: "q", at: "t" }],
        core_overrides: {}, coverage: { "data_report.decision": answered, "data_report.definition": answered, "data_report.existing": answered },
        facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [],
      }],
    };
    let st = statusOf(s, fwS, []);
    assert.deepEqual(st.items[0].band_sources_unasked, ["core.systems"]);
    assert.equal(st.interview_complete, false);
    assert.match(st.next_step, /then ask about core.systems: find out/);
    s.core.systems = answered;
    st = statusOf(s, fwS, []);
    assert.deepEqual(st.items[0].band_sources_unasked, []);
    assert.equal(st.interview_complete, true);
  });

  test("the guide explains what counts as a baseline", () => {
    assert.match(guide(loadFramework(".")), /success_metric.*"four hours every Monday".*is a baseline/);
  });
});

describe("routing hint (from the persona evals)", () => {
  const fwR = loadFramework(".");
  const opening = (text: string) => [{ role: "user" as const, text, at: "t" }];
  test("an idea-first opening points at known_idea", () => {
    assert.match(routingHint(fwR, opening("Could AI write our standard operating procedures? Ours are a mess."))!, /"could AI".*`known_idea`/);
  });
  test("the most specific signal wins: where could AI help is exploratory", () => {
    assert.match(routingHint(fwR, opening("Where could AI help us in our warehouse operation?"))!, /"where could AI help".*`exploratory`/);
  });
  test("no signal, no hint; and it only shows before the first item", () => {
    assert.equal(routingHint(fwR, opening("Hello there.")), null);
  });
});

describe("readiness counts what was asked, not what was recorded (first live test)", () => {
  const fw = loadFramework(".");
  const AT = "2026-10-13T15:30:00.000Z";
  const seeded = () => ({ status: "unknown" as const, value: null, quotes: [] as string[], probe_count: 0 });
  const knownIdea = (): Session => ({
    schema_version: 1,
    framework_version: "0.1.0",
    session: { id: "2026-10-13-abcd", started_at: AT, mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null, asked: {} },
    core: { users: seeded(), outcome: seeded(), data: seeded(), systems: seeded(), constraints: seeded(), trust: seeded() },
    items: [{
      id: "item-1", title: "Show the rollout side", type: "known_idea", confidence: "high", trigger_quote: "x", modifiers: [], spawned_from: null, superseded_by: null,
      type_history: [{ from: null, to: "known_idea", reason: "opening", quote: "x", at: AT }],
      core_overrides: {}, coverage: {}, facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [],
    }],
  });
  const ALL = ["core.users", "core.outcome", "core.data", "core.systems", "core.constraints", "core.trust",
    "item-1:known_idea.current", "item-1:known_idea.proposal", "item-1:known_idea.push", "item-1:known_idea.pull",
    "item-1:known_idea.adoption", "item-1:known_idea.prior", "item-1:known_idea.existing"];

  test("an answer inferred from the opening, or an unknown marked before asking, isn't asked", () => {
    const s = knownIdea();
    s.core.users = { status: "assumed", value: "Hiring managers", quotes: ["hiring managers"], probe_count: 0, updated_at: AT };
    s.core.outcome = { status: "unknown", value: null, quotes: [], probe_count: 0, updated_at: AT };
    const st = statusOf(s, fw);
    assert.ok(st.items[0].critical_unasked.includes("core.users"));
    assert.ok(st.items[0].critical_unasked.includes("core.outcome"));
    assert.equal(st.core.find((c) => c.area === "core.users")!.asked, false);
  });

  test("a full answer counts even unasked; a stamped ask counts whatever the answer", () => {
    const s = knownIdea();
    s.core.trust = { status: "covered", value: "Tests catch it", quotes: ["tests"], probe_count: 0, updated_at: AT };
    s.session.asked = { "core.outcome": AT };
    const st = statusOf(s, fw);
    assert.ok(!st.items[0].critical_unasked.includes("core.trust"));
    assert.ok(!st.items[0].critical_unasked.includes("core.outcome"));
  });

  test("a known idea always asks push, pull, adoption, prior and constraints, and the proposal is critical", () => {
    const st = statusOf(knownIdea(), fw);
    for (const id of ["known_idea.push", "known_idea.pull", "known_idea.adoption", "known_idea.prior", "known_idea.existing", "core.constraints"]) {
      assert.ok(st.items[0].always_ask_pending.includes(id), id);
    }
    assert.ok(st.items[0].critical_unasked.includes("known_idea.proposal"));
  });

  test("a critical area answered only vaguely needs its probe before the interview is complete", () => {
    const s = knownIdea();
    s.session.asked = Object.fromEntries(ALL.map((k) => [k, AT]));
    s.core.outcome = { status: "assumed", value: "I'd send a link", quotes: ["send a link"], probe_count: 0, updated_at: AT };
    let st = statusOf(s, fw);
    assert.deepEqual(st.items[0].critical_unprobed, ["core.outcome"]);
    assert.equal(st.interview_complete, false);
    assert.match(st.next_step, /then ask about core.outcome: they answered vaguely, so ask once about the last time/);
    s.core.outcome.probe_count = 1;
    st = statusOf(s, fw);
    assert.equal(st.interview_complete, true);
  });

  test("sessions from before the stamps existed keep the old rule", () => {
    const s = knownIdea();
    delete s.session.asked;
    s.core.users = { status: "assumed", value: "Hiring managers", quotes: ["hiring managers"], probe_count: 0, updated_at: AT };
    assert.ok(!statusOf(s, fw).items[0].critical_unasked.includes("core.users"));
  });
});

describe("hints after the first live test", () => {
  const fw = loadFramework(".");
  const AT = "2026-10-13T15:30:00.000Z";
  const seeded = () => ({ status: "unknown" as const, value: null, quotes: [] as string[], probe_count: 0 });
  const session = (items: Item[]): Session => ({
    schema_version: 1, framework_version: "0.1.0",
    session: { id: "2026-10-13-abcd", started_at: AT, mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null },
    core: { users: seeded(), outcome: seeded(), data: seeded(), systems: seeded(), constraints: seeded(), trust: seeded() },
    items,
  });
  const item = (id: string, type: Item["type"], extra: Partial<Item> = {}): Item => ({
    id, title: id, type, confidence: "high", trigger_quote: "x", modifiers: [], spawned_from: null, superseded_by: null,
    type_history: [{ from: null, to: type, reason: "opening", quote: "x", at: AT }],
    core_overrides: {}, coverage: {}, facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [], ...extra,
  });
  const said = (text: string) => [{ role: "user" as const, text, at: AT }];

  test("a negated signal doesn't hint a modifier", () => {
    const s = session([item("item-1", "known_idea")]);
    assert.ok(!structureHints(s, fw, said("The scripts read files locally, with no database, no API and no network.")).some((h) => h.includes("integration")));
    assert.ok(!structureHints(s, fw, said("Scripts read the committed files locally, with no database or external API involved.")).some((h) => h.includes("integration")));
    assert.ok(structureHints(s, fw, said("The orders come in over an API from the customer.")).some((h) => h.includes("integration")));
  });

  test("a removed modifier isn't hinted again", () => {
    const s = session([item("item-1", "known_idea", { modifiers_removed: ["integration"] })]);
    assert.ok(!structureHints(s, fw, said("The orders come in over an API.")).some((h) => h.includes("integration")));
  });

  test("the manual-work hint asks before adding, and never comes back after a drop", () => {
    const s = session([item("item-1", "data_report")]);
    const t = said("If it stops, people go back to doing the task by hand.");
    const hint = structureHints(s, fw, t, { primaryInterviewed: true }).find((h) => h.includes("manual_process"))!;
    assert.match(hint, /ask whether it happens today/);
    assert.match(hint, /router\.drop/);
    s.items.push(item("item-2", "manual_process", { spawned_from: "item-1", dropped: { reason: "a fallback", quote: "by hand", at: AT } }));
    assert.ok(!structureHints(s, fw, t, { primaryInterviewed: true }).some((h) => h.includes("manual_process")));
  });

  test("a dropped item needs nothing more and isn't the primary item", () => {
    const s = session([item("item-1", "manual_process", { dropped: { reason: "doesn't apply", quote: "x", at: AT } }), item("item-2", "data_report")]);
    const st = statusOf(s, fw);
    assert.equal(st.items[0].dropped, true);
    assert.deepEqual(st.items[0].critical_unasked, []);
    assert.deepEqual(st.items[0].always_ask_pending, []);
  });
});

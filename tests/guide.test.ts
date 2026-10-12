// Status hints and light passes, added after the first persona eval baseline.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { guide, statusOf, structureHints } from "../src/lib/guide.ts";
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
    assert.match(st.next_step, /facts_missing for no item/);
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
    assert.match(st.next_step, /Still to ask.*core\.systems/);
    s.core.systems = answered;
    st = statusOf(s, fwS, []);
    assert.deepEqual(st.items[0].band_sources_unasked, []);
    assert.equal(st.interview_complete, true);
  });

  test("the guide explains what counts as a baseline", () => {
    assert.match(guide(loadFramework(".")), /success_metric.*"four hours every Monday".*is a baseline/);
  });
});

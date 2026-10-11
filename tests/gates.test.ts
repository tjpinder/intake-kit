import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { scoreAndGate, criticalAreas, gateItem, GateError } from "../src/lib/gates.ts";
import { validateSession } from "../src/lib/schemas.ts";
import { scoreItem } from "../src/lib/score.ts";
import type { Gate, Item, Session } from "../src/lib/session.ts";
import { makeItem, makeSession, unknown, assumed, covered, type ItemOptions } from "./helpers.ts";

const fw = loadFramework(".");

function gateOf(opts: ItemOptions, session: { confirmed?: boolean; core?: Partial<Session["core"]> } = {}): Gate {
  const result = scoreAndGate(makeSession([makeItem("item-1", opts)], session), fw);
  assert.equal(result.scored, true);
  return result.session.items[0].gate!;
}

function expectGate(gate: Gate, decision: Gate["decision"], ...reasonFragments: string[]) {
  assert.equal(gate.decision, decision, `reasons: ${gate.reasons.join(" | ")}`);
  for (const f of reasonFragments) {
    assert.ok(gate.reasons.some((r) => r.includes(f)), `expected a reason containing "${f}", got: ${gate.reasons.join(" | ")}`);
  }
}

describe("nothing is scored before the reflect-back is confirmed", () => {
  for (const confirmed of [false, null]) {
    test(`reflect-back ${confirmed === null ? "missing" : "unconfirmed"}`, () => {
      const session = makeSession([makeItem("item-1")], { confirmed });
      const result = scoreAndGate(session, fw);
      assert.equal(result.scored, false);
      assert.equal(result.session.items[0].scoring, null);
      assert.equal(result.session.items[0].gate, null);
    });
  }

  test("gated directly, an assumed critical area doesn't count without a confirmed reflect-back", () => {
    const session = makeSession([], { confirmed: false, core: { trust: assumed() } });
    const item = makeItem("item-1");
    item.scoring = scoreItem(item, fw);
    expectGate(gateItem(session, item, fw), "gather_more", "core.trust isn't covered");
  });

  test("gating an unscored item throws", () => {
    assert.throws(() => gateItem(makeSession([]), makeItem("item-1"), fw), GateError);
  });
});

describe("Go", () => {
  test("Prioritize with everything covered", () => {
    expectGate(gateOf({}), "go", "Prioritize quadrant", "Reflect-back confirmed");
  });

  test("Review with a written mitigation", () => {
    expectGate(gateOf({ facts: { documentation: "none", steps_apps: "over_100" }, mitigation: "Pilot on one shift first" }), "go", "Review quadrant");
  });

  test("an assumed critical area counts once the reflect-back is confirmed", () => {
    expectGate(gateOf({}, { core: { trust: assumed() } }), "go");
  });

  test("Defer rescued by the AI overlay is an AI candidate", () => {
    const facts = {
      rule_clarity: "judgment", input_structured: "under_40", ways_done: "8+", documentation: "none",
      steps_apps: "over_100", stability: "some",
      ai_applies: "yes", eval_ability: "pass", error_cost: "pass", human_review: "pass", simpler_option: "pass", fallback: "pass", sensitive_data: "pass",
    };
    const result = scoreAndGate(makeSession([makeItem("item-1", { facts })]), fw);
    assert.equal(result.session.items[0].scoring!.quadrant, "defer");
    expectGate(result.session.items[0].gate!, "go", "AI candidate");
  });
});

describe("Fix, not build (broken items only)", () => {
  for (const cause of ["config", "data", "vendor", "training"]) {
    test(`${cause} cause`, () => expectGate(gateOf({ type: "broken", facts: { broken_cause: cause } }), "fix_not_build", `${cause} cause`));
  }

  test("a code cause is not a fix", () => {
    assert.notEqual(gateOf({ type: "broken", facts: { broken_cause: "code" } }).decision, "fix_not_build");
  });

  test("a permanent workaround", () => {
    expectGate(gateOf({ type: "broken", facts: { broken_cause: "code", workaround_permanent: "yes" } }), "fix_not_build", "permanent");
  });

  test("other types never get fix_not_build", () => {
    assert.equal(gateOf({ type: "data_report", facts: { broken_cause: "config" } }).decision, "go");
  });
});

describe("Don't build, definitive reasons", () => {
  test("an existing asset covers it", () => {
    const g = gateOf({ facts: { existing_asset: "covers" } });
    expectGate(g, "dont_build", "already covers it");
    assert.match(g.revisit_trigger!, /stops covering/);
  });

  test("a partial existing asset doesn't stop the build", () => {
    assert.equal(gateOf({ facts: { existing_asset: "partial" } }).decision, "go");
  });

  test("no decision depends on it", () => expectGate(gateOf({ facts: { decision_depends: "no" } }), "dont_build", "No decision depends"));

  test("trivial value", () => expectGate(gateOf({ facts: { value: "trivial" } }), "dont_build", "trivial"));

  test("every Don't build has a revisit trigger", () => {
    const cases: Array<Record<string, string>> = [
      { existing_asset: "covers" },
      { decision_depends: "no" },
      { value: "trivial" },
      { rule_clarity: "judgment", input_structured: "under_40", ways_done: "8+", documentation: "none", steps_apps: "over_100" },
    ];
    for (const facts of cases) {
      const g = gateOf({ facts });
      assert.equal(g.decision, "dont_build");
      assert.ok(g.revisit_trigger && g.revisit_trigger.startsWith("Revisit if "), JSON.stringify(facts));
    }
  });
});

describe("supersession", () => {
  test("superseded by a Go item -> Don't build", () => {
    const session = makeSession([makeItem("item-1"), makeItem("item-2", { type: "manual_process", superseded_by: "item-1" })]);
    const out = scoreAndGate(session, fw).session;
    expectGate(out.items[1].gate!, "dont_build", "Superseded by item-1, which reaches Go");
    assert.match(out.items[1].gate!.revisit_trigger!, /item-1 isn't built/);
  });

  test("the superseding item is gated first, whatever the order", () => {
    const session = makeSession([makeItem("item-2", { type: "manual_process", superseded_by: "item-1" }), makeItem("item-1")]);
    expectGate(scoreAndGate(session, fw).session.items[0].gate!, "dont_build", "Superseded by item-1");
  });

  test("superseded by an item that doesn't reach Go -> gated on its own merits", () => {
    const session = makeSession([
      makeItem("item-1", { facts: { success_metric: "vague" } }),
      makeItem("item-2", { type: "manual_process", superseded_by: "item-1" }),
    ]);
    const out = scoreAndGate(session, fw).session;
    assert.equal(out.items[0].gate!.decision, "gather_more");
    assert.equal(out.items[1].gate!.decision, "go");
  });

  test("a supersession cycle is ignored", () => {
    const session = makeSession([
      makeItem("item-1", { superseded_by: "item-2" }),
      makeItem("item-2", { superseded_by: "item-1" }),
    ]);
    const out = scoreAndGate(session, fw).session;
    assert.deepEqual(out.items.map((i) => i.gate!.decision), ["go", "go"]);
  });

  test("superseded by an item that doesn't exist throws", () => {
    assert.throws(() => scoreAndGate(makeSession([makeItem("item-1", { superseded_by: "item-9" })]), fw), GateError);
  });
});

describe("Gather more discovery", () => {
  test("a critical core area unknown", () => {
    expectGate(gateOf({}, { core: { outcome: unknown() } }), "gather_more", "core.outcome isn't covered");
  });

  test("a critical module area unknown", () => {
    expectGate(gateOf({ coverage: { "data_report.decision": unknown() } }), "gather_more", "data_report.decision");
  });

  test("a critical module area never asked about", () => {
    const item = makeItem("item-1");
    delete item.coverage["data_report.definition"];
    const out = scoreAndGate(makeSession([item]), fw).session;
    expectGate(out.items[0].gate!, "gather_more", "data_report.definition");
  });

  test("an item override counts instead of the shared core", () => {
    expectGate(gateOf({ core_overrides: { data: unknown() } }), "gather_more", "core.data");
    expectGate(gateOf({ core_overrides: { data: covered() } }, { core: { data: unknown() } }), "go");
  });

  test("a modifier's critical area is required", () => {
    expectGate(gateOf({ modifiers: ["compliance"] }), "gather_more", "mod.compliance.requirement_source");
    expectGate(gateOf({ modifiers: ["compliance"], coverage: { "mod.compliance.requirement_source": covered() } }), "go");
  });

  test("major change expected within six months", () => expectGate(gateOf({ facts: { stability: "major" } }), "gather_more", "major change"));

  test("Review without a mitigation", () => {
    expectGate(gateOf({ facts: { documentation: "none", steps_apps: "over_100" } }), "gather_more", "no written mitigation");
  });

  test("migration modifier", () => {
    expectGate(gateOf({ modifiers: ["migration"] }), "gather_more", "migration modifier");
  });

  test("too few known criteria", () => {
    expectGate(gateOf({ facts: { stability: "unknown", documentation: "unknown" } }), "gather_more", "Too few known criteria to score ease");
  });

  test("AI overlay check unknown", () => {
    const g = gateOf({ facts: { ai_applies: "yes", eval_ability: "pass", error_cost: "pass", human_review: "pass", simpler_option: "pass", fallback: "pass" } });
    expectGate(g, "gather_more", "sensitive_data is unknown");
  });

  test("AI overlay non-decisive check failed", () => {
    const g = gateOf({ facts: { ai_applies: "yes", eval_ability: "pass", error_cost: "pass", human_review: "fail", simpler_option: "pass", fallback: "pass", sensitive_data: "pass" } });
    expectGate(g, "gather_more", "human_review failed");
  });
});

describe("Don't build: Defer quadrant or decisive AI failure", () => {
  // automation: 1, 5, 1, 1 -> 2 (low); ease: 5, 1, 1, 5 -> 3 (medium) -> Defer
  const deferFacts = { rule_clarity: "judgment", input_structured: "under_40", ways_done: "8+", documentation: "none", steps_apps: "over_100" };

  test("Defer with no critical unknowns", () => {
    const g = gateOf({ facts: deferFacts });
    expectGate(g, "dont_build", "Defer quadrant");
    assert.match(g.revisit_trigger!, /leave Defer/);
  });

  for (const check of ["eval_ability", "error_cost"]) {
    test(`AI overlay ${check} failed`, () => {
      const facts = { ai_applies: "yes", eval_ability: "pass", error_cost: "pass", human_review: "pass", simpler_option: "pass", fallback: "pass", sensitive_data: "pass", [check]: "fail" };
      expectGate(gateOf({ facts }), "dont_build", `${check} failed`);
    });
  }
});

describe("precedence: first match wins, every match is recorded", () => {
  test("fix_not_build beats a definitive Don't build", () => {
    const g = gateOf({ type: "broken", facts: { broken_cause: "config", existing_asset: "covers" } });
    expectGate(g, "fix_not_build", "(also matched dont_build) An existing report or feature already covers it");
  });

  test("a definitive Don't build beats Gather more", () => {
    const g = gateOf({ facts: { existing_asset: "covers" } }, { core: { outcome: unknown() } });
    expectGate(g, "dont_build", "already covers it", "(also matched gather_more) Critical area core.outcome");
  });

  test("Gather more beats a Defer Don't build when a critical area is unknown", () => {
    const g = gateOf({ facts: { rule_clarity: "judgment", input_structured: "under_40", ways_done: "8+", documentation: "none", steps_apps: "over_100" } }, { core: { trust: unknown() } });
    expectGate(g, "gather_more", "Scored Defer while a critical area is still unknown", "(also matched dont_build) Defer quadrant");
  });

  test("Gather more beats a decisive AI failure when other checks are unknown", () => {
    expectGate(gateOf({ facts: { ai_applies: "yes", eval_ability: "fail" } }), "gather_more", "is unknown", "(also matched dont_build) AI overlay check eval_ability failed");
  });
});

describe("fall-through to Gather more", () => {
  test("no gate matches but Go isn't met: the unmet requirements are the reasons", () => {
    const g = gateOf({ facts: { success_metric: "measurable_no_baseline" } });
    expectGate(g, "gather_more", "No measurable success metric with a baseline");
    assert.equal(g.revisit_trigger, null);
  });
});

describe("critical areas", () => {
  test("core four plus the type's critical areas plus modifiers'", () => {
    assert.deepEqual(criticalAreas(makeItem("item-1", { type: "broken", modifiers: ["compliance"] }), fw).sort(), [
      "broken.cause", "broken.symptom", "core.data", "core.outcome", "core.trust", "core.users", "mod.compliance.requirement_source",
    ]);
  });
});

describe("the worked-example fixture is exactly what the code produces", () => {
  const fixture: Session = parseYaml(readFileSync("tests/fixtures/session/pick-exception-scored.yaml", "utf8"));
  const unscored: Session = structuredClone(fixture);
  for (const item of unscored.items as Item[]) { item.scoring = null; item.gate = null; }
  const out = scoreAndGate(unscored, fw).session;

  test("item-1 reaches Go; item-2 is superseded", () => {
    assert.equal(out.items[0].gate!.decision, "go");
    assert.equal(out.items[1].gate!.decision, "dont_build");
  });

  test("scoring and gates match the fixture", () => {
    for (const [i, item] of out.items.entries()) {
      assert.deepEqual(item.scoring, fixture.items[i].scoring, `${item.id} scoring`);
      assert.deepEqual(item.gate, fixture.items[i].gate, `${item.id} gate`);
    }
  });

  test("the code's output is a valid session", () => {
    assert.deepEqual(validateSession(out).errors, []);
  });
});

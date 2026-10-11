import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadFramework } from "../src/lib/framework.ts";
import { levelOf, quadrantOf, scoreItem, adoptionRisks, ScoringError, type Level } from "../src/lib/score.ts";
import { makeItem } from "./helpers.ts";

const fw = loadFramework(".");

describe("criterion scores come from scoring.yaml bands", () => {
  test("top bands score 5 everywhere; composites are 5", () => {
    const s = scoreItem(makeItem("item-1", { facts: { documentation: "sop_and_examples" } }), fw);
    for (const [name, c] of Object.entries(s.criteria)) assert.equal(c.score, 5, name);
    assert.equal(s.automation_potential, 5);
    assert.equal(s.ease, 5);
    assert.equal(s.quadrant, "prioritize");
  });

  test("bands map to 5 / 3 / 1 and unknown to null", () => {
    const s = scoreItem(makeItem("item-1", { facts: { rule_clarity: "mixed", input_digital: "paper_or_phone", access: "unknown" } }), fw);
    assert.equal(s.criteria.rule_clarity.score, 3);
    assert.equal(s.criteria.input_digital.score, 1);
    assert.equal(s.criteria.access.score, null);
  });

  test("a missing fact counts as unknown", () => {
    const s = scoreItem(makeItem("item-1", { onlyFacts: true, facts: { rule_clarity: "written" } }), fw);
    assert.equal(s.criteria.ways_done.band, "unknown");
    assert.equal(s.criteria.ways_done.score, null);
  });

  test("evidence is carried from the fact", () => {
    const item = makeItem("item-1");
    item.facts.rule_clarity.evidence = ["data_report.definition"];
    assert.deepEqual(scoreItem(item, fw).criteria.rule_clarity.evidence, ["data_report.definition"]);
  });

  test("a band the framework doesn't define throws", () => {
    assert.throws(() => scoreItem(makeItem("item-1", { facts: { rule_clarity: "kinda" } }), fw), ScoringError);
  });
});

describe("composites", () => {
  test("mean of the four criteria, Value excluded", () => {
    // automation: 5, 3, 1, 5 -> 3.5 ; ease: 5, 3, 5, 5 -> 4.5 ; value trivial doesn't move either
    const s = scoreItem(makeItem("item-1", { facts: { input_digital: "partly", input_structured: "under_40", documentation: "partial", value: "trivial" } }), fw);
    assert.equal(s.automation_potential, 3.5);
    assert.equal(s.ease, 4.5);
  });

  test("unknown criteria are left out of the mean", () => {
    // automation: 5, 1, 5, unknown -> 11 / 3 = 3.67
    const s = scoreItem(makeItem("item-1", { facts: { input_digital: "paper_or_phone", ways_done: "unknown" } }), fw);
    assert.equal(s.automation_potential, 3.67);
  });

  test("fewer known criteria than min_known_per_composite gives null and no quadrant", () => {
    const s = scoreItem(makeItem("item-1", { facts: { ways_done: "unknown", input_structured: "unknown" } }), fw);
    assert.equal(s.automation_potential, null);
    assert.equal(s.quadrant, null);
  });
});

describe("levels: (mean - 1) / 4 against 65% and 35%", () => {
  const cases: Array<[number, Level]> = [
    [5, "high"], [3.6, "high"], [3.59, "medium"], [3, "medium"], [2.4, "medium"], [2.39, "low"], [1, "low"],
  ];
  for (const [mean, level] of cases) test(`${mean} is ${level}`, () => assert.equal(levelOf(mean, fw), level));
});

describe("quadrant for every level pair", () => {
  const table: Array<[Level, Level, string]> = [
    ["high", "high", "prioritize"],
    ["high", "medium", "review"],
    ["medium", "high", "review"],
    ["medium", "medium", "review"],
    ["high", "low", "review"],
    ["low", "high", "review"],
    ["medium", "low", "defer"],
    ["low", "medium", "defer"],
    ["low", "low", "defer"],
  ];
  for (const [a, e, q] of table) test(`automation ${a}, ease ${e} -> ${q}`, () => assert.equal(quadrantOf(a, e), q));
});

describe("AI overlay and adoption", () => {
  test("overlay doesn't apply when ai_applies is no or unknown", () => {
    assert.deepEqual(scoreItem(makeItem("item-1"), fw).ai_overlay, { applies: false, checks: {} });
    assert.equal(scoreItem(makeItem("item-1", { facts: { ai_applies: "unknown" } }), fw).ai_overlay.applies, false);
  });

  test("when it applies, all six checks are listed and missing ones are unknown", () => {
    const s = scoreItem(makeItem("item-1", { facts: { ai_applies: "yes", eval_ability: "pass", error_cost: "fail" } }), fw);
    assert.equal(s.ai_overlay.applies, true);
    assert.deepEqual(s.ai_overlay.checks, {
      eval_ability: "pass", error_cost: "fail", human_review: "unknown", simpler_option: "unknown", fallback: "unknown", sensitive_data: "unknown",
    });
  });

  test("adoption is rated for known_idea and exploratory only", () => {
    assert.equal(scoreItem(makeItem("item-1", { type: "data_report" }), fw).adoption, null);
    const s = scoreItem(makeItem("item-1", { type: "known_idea", facts: { push: "low", habit: "high" } }), fw);
    assert.deepEqual(s.adoption, { push: "low", pull: "unknown", anxiety: "unknown", habit: "high" });
    assert.deepEqual(adoptionRisks(s, fw), ["push", "habit"]);
  });
});

describe("tuning scoring.yaml changes scores with no code or skill edits", () => {
  const dirs: string[] = [];
  after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

  function tuned(from: string, to: string) {
    const root = mkdtempSync(join(tmpdir(), "intake-kit-score-"));
    dirs.push(root);
    cpSync("skills/intake", join(root, "skills/intake"), { recursive: true });
    cpSync("templates/sections.yaml", join(root, "templates/sections.yaml"));
    const path = join(root, "skills/intake/scoring.yaml");
    const text = readFileSync(path, "utf8");
    assert.ok(text.includes(from));
    writeFileSync(path, text.replace(from, to));
    return loadFramework(root);
  }

  const item = makeItem("item-1", { facts: { rule_clarity: "judgment" } }); // automation: 1, 5, 5, 5

  test("changing a weight changes the composite", () => {
    assert.equal(scoreItem(item, fw).automation_potential, 4);
    const heavier = tuned("rule_clarity: 1, input_digital: 1", "rule_clarity: 3, input_digital: 1");
    assert.equal(scoreItem(item, heavier).automation_potential, 3); // (3*1 + 5 + 5 + 5) / 6
  });

  test("changing a band score changes the criterion", () => {
    const softer = tuned("written: 5, mixed: 3, judgment: 1,", "written: 5, mixed: 3, judgment: 2,");
    assert.equal(scoreItem(item, softer).criteria.rule_clarity.score, 2);
  });

  test("changing a threshold changes the level", () => {
    assert.equal(levelOf(3.4, fw), "medium");
    assert.equal(levelOf(3.4, tuned("high_min_pct: 0.65", "high_min_pct: 0.6")), "high");
  });
});

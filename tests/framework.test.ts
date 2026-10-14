import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { FrameworkError, type Framework } from "../src/lib/framework.ts";
import { loadFramework } from "../src/lib/framework-fs.ts";

const fw: Framework = loadFramework(".");

describe("framework loads and matches the spec", () => {
  test("five entry types and three modifiers", () => {
    assert.deepEqual(Object.keys(fw.router.types).sort(), ["broken", "data_report", "exploratory", "known_idea", "manual_process"]);
    assert.deepEqual(Object.keys(fw.router.modifiers).sort(), ["compliance", "integration", "migration"]);
    assert.equal(Object.keys(fw.modules).length, 9);
  });

  test("low-confidence probes are the spec's wording", () => {
    assert.equal(fw.router.types.broken.low_confidence_probe, "Did this used to work? When did you first notice?");
    assert.equal(fw.router.types.manual_process.low_confidence_probe, "Walk me through the last time, start to finish.");
    assert.equal(fw.router.types.known_idea.low_confidence_probe, "What happens today when this gets done?");
    assert.equal(fw.router.types.exploratory.low_confidence_probe, "What work does nobody value but someone has to do?");
    assert.equal(fw.router.types.data_report.low_confidence_probe, "What will you do differently when you see this number?");
  });

  test("the spec's always-asked areas are marked always_ask", () => {
    const always = [...fw.areas.values()].filter((a) => a.always_ask).map((a) => a.id).sort();
    assert.deepEqual(always, ["broken.workaround", "core.constraints", "data_report.decision", "data_report.existing", "known_idea.adoption", "known_idea.existing", "known_idea.prior", "known_idea.pull", "known_idea.push"]);
    assert.deepEqual(fw.modules.known_idea.asks_core, ["core.constraints"]);
  });

  test("Go requires users, outcome, data and trust", () => {
    assert.deepEqual(fw.scoring.gates.go_requires_core, ["core.users", "core.outcome", "core.data", "core.trust"]);
  });

  test("Value is in neither composite; Access is in Ease", () => {
    const used = Object.values(fw.scoring.composites).flatMap((c) => Object.keys(c.criteria));
    assert.ok(!used.includes("value"));
    assert.ok("access" in fw.scoring.composites.ease.criteria);
  });

  test("thresholds map to means of 3.6 and 2.4", () => {
    const toMean = (pct: number) => 1 + pct * 4;
    assert.equal(Number(toMean(fw.scoring.thresholds.high_min_pct).toFixed(2)), 3.6);
    assert.equal(Number(toMean(fw.scoring.thresholds.low_below_pct).toFixed(2)), 2.4);
  });

  test("migration routes to Gather more; compliance sets risk tier high", () => {
    assert.equal(fw.router.modifiers.migration.effects?.gate, "gather_more");
    assert.equal(fw.router.modifiers.compliance.effects?.risk_tier, "high");
  });
});

describe("session fixtures only use IDs and bands the framework defines", () => {
  for (const file of ["pick-exception-scored.yaml", "mid-interview.yaml"]) {
    test(file, () => {
      const s = parseYaml(readFileSync(`tests/fixtures/session/${file}`, "utf8"));
      for (const item of s.items) {
        for (const id of Object.keys(item.coverage)) assert.ok(fw.areas.has(id), `${item.id}: unknown coverage ID ${id}`);
        for (const [fact, entry] of Object.entries<any>(item.facts)) {
          assert.ok(fw.factBands.get(fact)?.includes(entry.band), `${item.id}: ${fact} has undefined band "${entry.band}"`);
          for (const ev of entry.evidence) assert.ok(fw.areas.has(ev), `${item.id}: ${fact} cites unknown area ${ev}`);
        }
        for (const q of item.open_questions) assert.ok(fw.areas.has(q.area), `${item.id}: open question cites unknown area ${q.area}`);
      }
    });
  }
});

describe("a bad edit fails loudly", () => {
  const dirs: string[] = [];
  after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

  // Copies the framework to a temp root, applies an edit, and returns the load error's issues.
  function issuesAfter(edit: (root: string) => void): string[] {
    const root = mkdtempSync(join(tmpdir(), "intake-kit-fw-"));
    dirs.push(root);
    cpSync("skills/intake", join(root, "skills/intake"), { recursive: true });
    cpSync("templates/sections.yaml", join(root, "templates/sections.yaml"));
    edit(root);
    try {
      loadFramework(root);
    } catch (err) {
      assert.ok(err instanceof FrameworkError, `expected FrameworkError, got ${err}`);
      return err.issues;
    }
    assert.fail("expected the framework to fail to load");
  }

  function replaceIn(root: string, rel: string, from: string, to: string) {
    const path = join(root, rel);
    const text = readFileSync(path, "utf8");
    assert.ok(text.includes(from), `test setup: "${from}" not found in ${rel}`);
    writeFileSync(path, text.replace(from, to));
  }

  const has = (issues: string[], fragment: string) =>
    assert.ok(issues.some((i) => i.includes(fragment)), `expected an issue containing "${fragment}", got:\n  ${issues.join("\n  ")}`);

  test("duplicate coverage ID", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/modules/data_report.yaml", "id: data_report.grain", "id: data_report.definition")),
      "duplicate coverage ID data_report.definition");
  });

  test("area outside its module's namespace", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/modules/broken.yaml", "id: broken.impact", "id: data_report.impact")),
      'area data_report.impact must be "broken.<snake_case>"');
  });

  test("feed into a section no template has", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/modules/core.yaml", "section: users", "section: people")),
      "feeds unknown section SPEC.md#people");
  });

  test("gate config naming a band the fact doesn't define", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/scoring.yaml", "when_cause: [config, data, vendor, training]", "when_cause: [config, gremlins]")),
      'names band "gremlins", which broken_cause doesn\'t define');
  });

  test("a fact in scoring.yaml that the turn schema doesn't allow", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/scoring.yaml", "gate_facts:\n", "gate_facts:\n  mood: [good, bad, unknown]\n")),
      "don't match the write-up schema");
  });

  test("criterion band scored outside 1-5", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/scoring.yaml", "written: 5,", "written: 7,")),
      "scoring.yaml: /criteria/rule_clarity/bands/written");
  });

  test("composite using a criterion that doesn't exist", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/scoring.yaml", "access: 1 }", "acess: 1 }")),
      "composite ease uses unknown criterion acess");
  });

  test("criterion missing its unknown band", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/scoring.yaml", "programmatic: 5, ui_only: 3, none: 1, unknown: null", "programmatic: 5, ui_only: 3, none: 1")),
      "must have required property 'unknown'");
  });

  test("reordering gate precedence is rejected", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/scoring.yaml", "    - fix_not_build\n    - dont_build_definitive\n", "    - dont_build_definitive\n    - fix_not_build\n")),
      "/gates/precedence must be equal to constant");
  });

  test("module file renamed away from its module name", () => {
    has(issuesAfter((r) => renameSync(join(r, "skills/intake/modules/broken.yaml"), join(r, "skills/intake/modules/broke.yaml"))),
      'module "broken" doesn\'t match its file name');
  });

  test("router and module disagreeing on modifier effects", () => {
    has(issuesAfter((r) => replaceIn(r, "skills/intake/modules/mod.migration.yaml", "effects: { gate: gather_more }\n", "")),
      "disagree on effects for migration");
  });
});

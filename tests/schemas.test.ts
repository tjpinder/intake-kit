import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { validateExtract, validateOpening, validatePhrase, validateSession, validateWriteUp } from "../src/lib/schemas.ts";
import { extractSchema, openingSchema, phraseSchema, writeupSchema } from "../src/llm/v2.ts";

type Json = any;

const sessionFixtures = readdirSync("tests/fixtures/session").filter((f) => f.endsWith(".yaml"));
const loadSession = (f: string): Json => parseYaml(readFileSync(`tests/fixtures/session/${f}`, "utf8"));
/** Every model output in the v2 worked example, by call. */
const CALLS: Array<{ call: string; output: Json }> = JSON.parse(readFileSync("tests/fixtures/conversations/pick-exception.json", "utf8")).steps.flatMap((s: Json) => s.model);
const VALIDATORS: Record<string, (d: unknown) => { ok: boolean; errors: string[] }> = { classify_opening: validateOpening, phrase: validatePhrase, extract: validateExtract, write_up: validateWriteUp };
const first = (call: string): Json => structuredClone(CALLS.find((c) => c.call === call)!.output);

function expectInvalid(result: { ok: boolean; errors: string[] }, fragment: string) {
  assert.equal(result.ok, false, "expected validation to fail");
  assert.ok(
    result.errors.some((e) => e.includes(fragment)),
    `expected an error containing "${fragment}", got:\n  ${result.errors.join("\n  ")}`,
  );
}

describe("valid fixtures", () => {
  assert.ok(sessionFixtures.length >= 2 && CALLS.length >= 20, "fixtures missing");
  for (const f of sessionFixtures) {
    test(`session ${f}`, () => assert.deepEqual(validateSession(loadSession(f)).errors, []));
  }
  test("every model output in the worked example fits its call's schema", () => {
    for (const [i, c] of CALLS.entries()) assert.deepEqual(VALIDATORS[c.call](c.output).errors, [], `${c.call} #${i}`);
  });
});

describe("session status rules", () => {
  const base = () => loadSession("pick-exception-scored.yaml");

  test("covered with no quote is rejected", () => {
    const s = base();
    s.core.users.quotes = [];
    expectInvalid(validateSession(s), "/core/users/quotes must NOT have fewer than 1 items");
  });

  test("covered with no value is rejected", () => {
    const s = base();
    s.items[0].coverage["data_report.grain"].value = null;
    expectInvalid(validateSession(s), "/items/0/coverage/data_report.grain/value must be string");
  });

  test("assumed with no quote is rejected", () => {
    const s = base();
    s.core.trust.quotes = [];
    expectInvalid(validateSession(s), "/core/trust/quotes must NOT have fewer than 1 items");
  });

  test("unknown with a value is rejected", () => {
    const s = base();
    s.items[0].coverage["data_report.truth"].value = "WMS";
    expectInvalid(validateSession(s), "/items/0/coverage/data_report.truth/value must be null");
  });

  test("a second probe on one area is rejected", () => {
    const s = base();
    s.core.outcome.probe_count = 2;
    expectInvalid(validateSession(s), "/core/outcome/probe_count must be <= 1");
  });

  test("coverage IDs must be namespaced", () => {
    const s = base();
    s.items[0].coverage["grain"] = s.items[0].coverage["data_report.grain"];
    expectInvalid(validateSession(s), "property name must be valid");
  });

  test("shared-core areas can't be stored as item coverage", () => {
    const s = base();
    s.items[0].coverage["core.users"] = s.core.users;
    expectInvalid(validateSession(s), "property name must be valid");
  });

  test("a gate without scoring is rejected", () => {
    const s = base();
    s.items[0].scoring = null;
    expectInvalid(validateSession(s), "/items/0/scoring must be object");
  });

  test("Don't build needs a revisit trigger", () => {
    const s = base();
    s.items[1].gate.revisit_trigger = null;
    expectInvalid(validateSession(s), "/items/1/gate/revisit_trigger must be string");
  });

  test("criterion scores stay within 1-5", () => {
    const s = base();
    s.items[0].scoring.criteria.access.score = 6;
    expectInvalid(validateSession(s), "/items/0/scoring/criteria/access/score must be <= 5");
  });

  test("unknown fact names are rejected", () => {
    const s = base();
    s.items[0].facts.vibes = { band: "good", evidence: [], quotes: [] };
    expectInvalid(validateSession(s), "property name must be valid");
  });
});

describe("model contract v2: the model can't steer the interview, score or gate", () => {
  test("an extraction can't name the next question, create an item or end the interview", () => {
    for (const extra of ["next_target", "new_items", "reflect_back", "ready"]) {
      expectInvalid(validateExtract({ ...first("extract"), [extra]: null }), "must NOT have additional properties");
    }
  });

  test("a numeric score on a band pick is rejected", () => {
    const w = first("write_up");
    w.facts[0].score = 5;
    expectInvalid(validateWriteUp(w), "/facts/0 must NOT have additional properties");
  });

  test("a write-up can't set a gate or a quadrant", () => {
    expectInvalid(validateWriteUp({ ...first("write_up"), gate: "go" }), "must NOT have additional properties");
    const w = first("write_up");
    w.facts[0].fact = "gate";
    expectInvalid(validateWriteUp(w), "/facts/0/fact must be equal to one of the allowed values");
  });

  test("every field is required, so omissions fail", () => {
    const x = first("extract");
    delete x.also_answers;
    expectInvalid(validateExtract(x), "must have required property 'also_answers'");
    expectInvalid(validatePhrase({}), "must have required property 'question'");
  });
});

// Azure OpenAI strict structured output (and Claude's) accept only a subset of JSON Schema.
// This walks each call's schema and fails on anything outside it.
describe("every model schema fits the strict structured-output subset", () => {
  const allowed = new Set([
    "$schema", "$id", "$defs", "$ref", "title", "description",
    "type", "properties", "required", "additionalProperties", "items", "enum", "anyOf",
  ]);

  function walk(node: Json, path: string, problems: string[]) {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}/${i}`, problems));
    if (node === null || typeof node !== "object") return;
    for (const key of Object.keys(node)) {
      if (!allowed.has(key)) problems.push(`${path}: keyword "${key}" isn't in the strict subset`);
    }
    if (node.type === "object" || node.properties) {
      if (node.additionalProperties !== false) problems.push(`${path}: additionalProperties must be false`);
      const props = Object.keys(node.properties ?? {});
      const req = new Set(node.required ?? []);
      for (const p of props) if (!req.has(p)) problems.push(`${path}: property "${p}" must be required`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "properties" || key === "$defs") {
        for (const [name, sub] of Object.entries(value as object)) walk(sub, `${path}/${key}/${name}`, problems);
      } else if (key !== "enum" && key !== "required" && key !== "type") {
        walk(value, `${path}/${key}`, problems);
      }
    }
  }

  for (const [name, schema] of Object.entries({ opening: openingSchema, phrase: phraseSchema, extract: extractSchema, writeup: writeupSchema })) {
    test(`${name}: a plain object; only allowed keywords; every object closed with all properties required`, () => {
      assert.equal((schema as Json).type, "object");
      assert.equal((schema as Json).anyOf, undefined);
      const problems: string[] = [];
      walk(schema, "#", problems);
      assert.deepEqual(problems, []);
    });
  }
});

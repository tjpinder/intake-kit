import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { validateSession, validateTurn, turnSchema } from "../src/lib/schemas.ts";

type Json = any;

const sessionFixtures = readdirSync("tests/fixtures/session").filter((f) => f.endsWith(".yaml"));
const turnFixtures = readdirSync("tests/fixtures/turn").filter((f) => f.endsWith(".json"));

const loadSession = (f: string): Json => parseYaml(readFileSync(`tests/fixtures/session/${f}`, "utf8"));
const loadTurn = (f: string): Json => JSON.parse(readFileSync(`tests/fixtures/turn/${f}`, "utf8"));

function expectInvalid(result: { ok: boolean; errors: string[] }, fragment: string) {
  assert.equal(result.ok, false, "expected validation to fail");
  assert.ok(
    result.errors.some((e) => e.includes(fragment)),
    `expected an error containing "${fragment}", got:\n  ${result.errors.join("\n  ")}`,
  );
}

describe("valid fixtures", () => {
  assert.ok(sessionFixtures.length >= 2 && turnFixtures.length >= 3, "fixtures missing");
  for (const f of sessionFixtures) {
    test(`session ${f}`, () => assert.deepEqual(validateSession(loadSession(f)).errors, []));
  }
  for (const f of turnFixtures) {
    test(`turn ${f}`, () => assert.deepEqual(validateTurn(loadTurn(f)).errors, []));
  }
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

describe("turn contract: the model can't set scoring or gates", () => {
  const base = () => loadTurn("reflect-back-with-facts.json");

  for (const field of ["scoring", "gate", "quadrant"]) {
    test(`top-level "${field}" is rejected`, () => {
      const t = base();
      t[field] = field === "gate" ? { decision: "go" } : {};
      expectInvalid(validateTurn(t), "must NOT have additional properties");
    });
  }

  test("a numeric score on a fact is rejected", () => {
    const t = base();
    t.facts[0].score = 5;
    expectInvalid(validateTurn(t), "/facts/0 must NOT have additional properties");
  });

  test("a gate on an update is rejected", () => {
    const t = loadTurn("coverage-and-new-item.json");
    t.updates[0].gate = "go";
    expectInvalid(validateTurn(t), "/updates/0 must NOT have additional properties");
  });

  test("gate-like fact names are rejected", () => {
    const t = base();
    t.facts[0].fact = "gate";
    expectInvalid(validateTurn(t), "/facts/0/fact must be equal to one of the allowed values");
  });

  test("every field is required, so omissions fail", () => {
    const t = base();
    delete t.next_target;
    expectInvalid(validateTurn(t), "must have required property 'next_target'");
  });
});

// Azure OpenAI strict structured output (and Claude's) accept only a subset of JSON Schema.
// This walks the turn schema and fails on anything outside it.
describe("turn schema fits the strict structured-output subset", () => {
  const allowed = new Set([
    "$schema", "$id", "$defs", "$ref", "title", "description",
    "type", "properties", "required", "additionalProperties", "items", "enum", "anyOf",
  ]);
  const problems: string[] = [];

  function walk(node: Json, path: string) {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}/${i}`));
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
        for (const [name, sub] of Object.entries(value as object)) walk(sub, `${path}/${key}/${name}`);
      } else if (key !== "enum" && key !== "required" && key !== "type") {
        walk(value, `${path}/${key}`);
      }
    }
  }

  test("root is a plain object, not anyOf", () => {
    assert.equal((turnSchema as Json).type, "object");
    assert.equal((turnSchema as Json).anyOf, undefined);
  });

  test("only allowed keywords; every object closed with all properties required", () => {
    walk(turnSchema, "#");
    assert.deepEqual(problems, []);
  });
});

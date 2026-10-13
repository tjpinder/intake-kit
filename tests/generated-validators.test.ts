// The build-time validators (src/lib/generated/) must behave exactly like Ajv compiling the
// schemas at runtime, and the hand-written runtime helpers like the Ajv ones they replace.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { fullFormats } from "ajv-formats/dist/formats.js";
import { validateSession } from "../src/lib/generated/session-validator.js";
import { validateExtract, validateWriteUp } from "../src/lib/generated/v2-validators.js";
import { formats } from "../src/lib/schema-runtime.ts";

const addFormats = ((addFormatsModule as any).default ?? addFormatsModule) as (a: Ajv2020) => void;
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const runtimeSession = (() => { const a = new Ajv2020({ strict: true, allErrors: true }); addFormats(a); return a.compile(json("schema/session.schema.json")); })();
const runtime = (file: string) => { const a = new Ajv2020({ strict: true, allErrors: true }); addFormats(a); return a.compile(json(file)); };
const runtimeExtract = runtime("schema/v2/extract.schema.json");
const runtimeWriteUp = runtime("schema/v2/writeup.schema.json");
const errs = (fn: { errors?: Array<{ instancePath: string; keyword: string }> | null }) => (fn.errors ?? []).map((e) => `${e.instancePath} ${e.keyword}`).sort();

describe("generated validators", () => {
  test("are up to date with the schemas", () => {
    execFileSync(process.execPath, ["scripts/build-validators.mjs", "--check"], { stdio: "pipe" });
  });

  const session = parseYaml(readFileSync("tests/fixtures/session/pick-exception-scored.yaml", "utf8"));
  const sessions: Array<[string, unknown]> = [
    ["the worked example", session],
    ["a bad timestamp", { ...session, session: { ...session.session, started_at: "2026-02-30T10:00:00Z" } }],
    ["a missing field", { ...session, items: undefined }],
    ["an extra field", { ...session, surprise: true }],
    ["a wrong band", { ...session, items: [{ ...session.items[0], confidence: "certain" }] }],
  ];
  for (const [name, data] of sessions) {
    test(`session: ${name} gets the same verdict and errors`, () => {
      assert.equal(validateSession(data), runtimeSession(data));
      assert.deepEqual(errs(validateSession), errs(runtimeSession));
    });
  }

  const steps = json("tests/fixtures/conversations/pick-exception.json").steps;
  const extract = steps[1].model[0].output;
  const writeUp = steps.at(-2).model.find((m: { call: string }) => m.call === "write_up").output;
  const cases: Array<[string, (d: unknown) => boolean, { (d: unknown): boolean; errors?: any }, unknown]> = [
    ["a recorded extraction", validateExtract, runtimeExtract, extract],
    ["an extraction with a bad status", validateExtract, runtimeExtract, { ...extract, status: "maybe" }],
    ["an extraction missing a field", validateExtract, runtimeExtract, { ...extract, also_answers: undefined }],
    ["a recorded write-up", validateWriteUp, runtimeWriteUp, writeUp],
    ["a write-up with a scored fact", validateWriteUp, runtimeWriteUp, { ...writeUp, facts: [{ ...writeUp.facts[0], score: 5 }] }],
  ];
  for (const [name, generated, compiled, data] of cases) {
    test(`v2: ${name} gets the same verdict and errors`, () => {
      assert.equal(generated(data), compiled(data));
      assert.deepEqual(errs(generated as never), errs(compiled as never));
    });
  }
});

describe("schema runtime helpers", () => {
  test("date-time agrees with ajv-formats' full mode", () => {
    const ajvDateTime = (fullFormats as any)["date-time"].validate as (s: string) => boolean;
    for (const s of [
      "2026-10-12T13:30:05.759Z", "2026-10-12T13:30:05Z", "2026-10-12t13:30:05z", "2026-10-12 13:30:05+02:00",
      "2024-02-29T00:00:00Z", "2026-02-29T00:00:00Z", "2026-02-30T10:00:00Z", "2026-13-01T00:00:00Z",
      "2026-10-12T24:00:00Z", "2026-10-12T23:60:00Z", "2026-10-12T13:30:05", "2026-10-12", "not a date",
      "2016-12-31T23:59:60Z", "2016-12-31T18:59:60-05:00", "2026-10-12T13:30:60Z", "2026-10-12T13:30:05+24:00",
    ]) {
      assert.equal(formats.fullFormats["date-time"].validate(s), ajvDateTime(s), s);
    }
  });
});

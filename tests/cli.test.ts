// End to end: the bundled hook and CLI, run as Claude Code runs them, against a temp repo.
// Needs `npm run build` first (the test script does it).

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { validateSession } from "../src/lib/schemas.ts";

const DIST = resolve("dist");
const dirs: string[] = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function repo(): string {
  const dir = mkdtempSync(join(tmpdir(), "intake-kit-cli-"));
  dirs.push(dir);
  return dir;
}

function prompt(dir: string, text: string | object) {
  const payload = typeof text === "string" ? JSON.stringify({ prompt: text, cwd: dir, session_id: "s1", hook_event_name: "UserPromptSubmit" }) : JSON.stringify(text);
  return spawnSync(process.execPath, [join(DIST, "hook-prompt.mjs")], { input: payload, encoding: "utf8" });
}

function intake(dir: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [join(DIST, "intake.mjs"), ...args, "--dir", dir], { encoding: "utf8" });
  let body: any = null;
  try { body = JSON.parse(r.stdout); } catch { /* left null; asserted by callers */ }
  return { status: r.status, body, stderr: r.stderr };
}

function turn(dir: string, t: object) {
  writeFileSync(join(dir, ".intake-kit", "turn.json"), JSON.stringify(t));
  return intake(dir, "apply-turn");
}

const session = (dir: string) => parseYaml(readFileSync(join(dir, "intake-answers.yaml"), "utf8"));
const transcript = (dir: string) => readFileSync(join(dir, ".intake-kit", "transcript.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function base(overrides: object = {}) {
  return {
    reply: "Next question?",
    updates: [],
    facts: [],
    router: { new_items: [], reclassify: null, add_modifiers: [], supersede: null },
    prose: [],
    acceptance: [],
    guardrails: [],
    open_questions: [],
    reflect_back: null,
    next_target: { item: null, area: null, is_probe: false },
    ...overrides,
  };
}

describe("prompt hook", () => {
  test("ignores prompts when no intake is active, and creates nothing", () => {
    const dir = repo();
    const r = prompt(dir, "just a normal question");
    assert.equal(r.status, 0);
    assert.equal(existsSync(join(dir, ".intake-kit")), false);
  });

  test("the intake command starts recording, including the opening statement", () => {
    const dir = repo();
    assert.equal(prompt(dir, "/intake-kit:intake I need a report of short picks").status, 0);
    assert.equal(prompt(dir, "it eats my Monday").status, 0);
    assert.ok(existsSync(join(dir, ".intake-kit", "active")));
    assert.match(readFileSync(join(dir, ".intake-kit", ".gitignore"), "utf8"), /^\*$/m);
    const t = transcript(dir);
    assert.deepEqual(t.map((e) => [e.text, e.command ?? false]), [["/intake-kit:intake I need a report of short picks", true], ["it eats my Monday", false]]);
  });

  test("the bare /intake form also starts recording", () => {
    const dir = repo();
    prompt(dir, "/intake our orders aren't integrating");
    assert.equal(transcript(dir).length, 1);
  });

  test("a malformed payload exits 1 (non-blocking) with a message, never 2", () => {
    const r = spawnSync(process.execPath, [join(DIST, "hook-prompt.mjs")], { input: "not json", encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /wasn't recorded/);
  });

  test("a payload without a prompt is ignored", () => {
    assert.equal(prompt(repo(), { cwd: "x" }).status, 0);
  });
});

describe("start", () => {
  test("creates a valid, empty session", () => {
    const dir = repo();
    prompt(dir, "/intake-kit:intake I need a report");
    const r = intake(dir, "start");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.body.result, "started");
    assert.deepEqual(r.body.warnings, []);
    const s = session(dir);
    assert.deepEqual(validateSession(s).errors, []);
    assert.equal(s.session.grounding, "transcript");
    assert.equal(s.items.length, 0);
  });

  test("warns when no transcript has been recorded (hook missing)", () => {
    const dir = repo();
    const r = intake(dir, "start");
    assert.equal(r.status, 0);
    assert.match(r.body.warnings[0], /prompt hook/);
  });

  test("unverified grounding for tools without the hook", () => {
    const dir = repo();
    const r = intake(dir, "start", "--provider", "codex", "--grounding", "unverified");
    assert.deepEqual(r.body.warnings, []);
    assert.equal(session(dir).session.grounding, "unverified");
    assert.equal(existsSync(join(dir, ".intake-kit", "active")), false);
  });

  test("an intake in progress needs a decision; --resume keeps it", () => {
    const dir = repo();
    prompt(dir, "/intake-kit:intake I need a report");
    intake(dir, "start");
    const id = session(dir).session.id;
    const again = intake(dir, "start");
    assert.equal(again.status, 4);
    assert.match(again.body.message, /resume/);
    const resumed = intake(dir, "start", "--resume");
    assert.equal(resumed.status, 0);
    assert.equal(resumed.body.session_id, id);
  });

  test("--new archives the old session and the old part of the transcript, deleting nothing", () => {
    const dir = repo();
    prompt(dir, "/intake-kit:intake first ask");
    prompt(dir, "first answer");
    intake(dir, "start");
    const oldId = session(dir).session.id;
    prompt(dir, "/intake-kit:intake second ask");
    const r = intake(dir, "start", "--new");
    assert.equal(r.status, 0);
    assert.notEqual(session(dir).session.id, oldId);
    const archived = readdirSync(join(dir, ".intake-kit", "archive")).sort();
    assert.deepEqual(archived, [`intake-answers-${oldId}.yaml`, `transcript-${oldId}.jsonl`]);
    assert.deepEqual(transcript(dir).map((e) => e.text), ["/intake-kit:intake second ask"]);
  });

  test("bad options exit 4", () => {
    assert.equal(intake(repo(), "start", "--mode", "chaos").status, 4);
    assert.equal(intake(repo(), "launch").status, 4);
  });
});

describe("apply-turn", () => {
  function started() {
    const dir = repo();
    prompt(dir, "/intake-kit:intake I need a report of short picks by shift and picker");
    intake(dir, "start");
    return dir;
  }
  const newItem = { id: "item-1", type: "data_report", confidence: "high", title: "Pick-exception report", trigger_quote: "I need a report of short picks", spawned_from: null };

  test("a good turn is saved", () => {
    const dir = started();
    const r = turn(dir, base({ router: { new_items: [newItem], reclassify: null, add_modifiers: [], supersede: null } }));
    assert.equal(r.status, 0, JSON.stringify(r.body));
    assert.equal(session(dir).items[0].title, "Pick-exception report");
  });

  test("rejected once: exit 2, nothing saved, logged; rejected again: exit 3; then the counter resets", () => {
    const dir = started();
    const before = readFileSync(join(dir, "intake-answers.yaml"), "utf8");
    const bad = base({ updates: [{ item: null, area: "core.users", status: "covered", value: "x", quote: "words nobody said" }] });

    const first = turn(dir, bad);
    assert.equal(first.status, 2);
    assert.equal(first.body.retry, true);
    assert.equal(readFileSync(join(dir, "intake-answers.yaml"), "utf8"), before);

    const second = turn(dir, bad);
    assert.equal(second.status, 3);
    assert.equal(second.body.retry, false);
    assert.equal(readFileSync(join(dir, ".intake-kit", "rejections.jsonl"), "utf8").trim().split("\n").length, 2);

    assert.equal(turn(dir, bad).status, 2, "a fresh rejection after the second one gets a retry again");
    assert.equal(turn(dir, base()).status, 0);
    assert.equal(turn(dir, bad).status, 2, "a success resets the count");
  });

  test("full flow: propose, user confirms, items are gated and recording stops", () => {
    const dir = started();
    prompt(dir, "so I know who to pull for retraining. short picks and wrong-location scans, not the cancelled lines");
    prompt(dir, "I build it, the shift leads use it. It eats four hours every Monday. It all comes out of the WMS. If it's wrong the shift lead checks it.");
    const q = (s: string) => s;
    const core = (area: string, quote: string) => ({ item: null, area, status: "covered", value: quote, quote });
    assert.equal(turn(dir, base({
      router: { new_items: [newItem], reclassify: null, add_modifiers: [], supersede: null },
      updates: [
        core("core.users", q("I build it, the shift leads use it")),
        core("core.outcome", q("It eats four hours every Monday")),
        core("core.data", q("It all comes out of the WMS")),
        core("core.trust", q("If it's wrong the shift lead checks it")),
        { item: "item-1", area: "data_report.decision", status: "covered", value: "Retraining", quote: "so I know who to pull for retraining" },
        { item: "item-1", area: "data_report.definition", status: "covered", value: "Short picks and mislocations", quote: "short picks and wrong-location scans" },
      ],
      facts: [
        ["rule_clarity", "written"], ["input_digital", "fully"], ["input_structured", "80+"], ["ways_done", "one"],
        ["stability", "none"], ["documentation", "partial"], ["steps_apps", "under_20"], ["access", "api_or_db"],
        ["value", "high"], ["ai_applies", "no"], ["existing_asset", "none"], ["decision_depends", "yes"], ["success_metric", "measurable_with_baseline"],
      ].map(([fact, band]) => ({ item: "item-1", fact, band, evidence: ["core.data"], quote: null })),
    })).status, 0);

    assert.equal(turn(dir, base({ reflect_back: { text: "Daily exceptions by picker.", status: "proposed", corrections: [] } })).status, 0);

    const early = turn(dir, base({ reflect_back: { text: "Daily exceptions by picker.", status: "confirmed", corrections: [] } }));
    assert.equal(early.status, 2, "can't confirm before the user replies");

    sleep(5);
    prompt(dir, "yes, that's it");
    const done = turn(dir, base({ reflect_back: { text: "Daily exceptions by picker.", status: "confirmed", corrections: [] } }));
    assert.equal(done.status, 0, JSON.stringify(done.body));
    assert.equal(done.body.scored, true);
    assert.equal(done.body.gates[0].decision, "go");

    const s = session(dir);
    assert.deepEqual(validateSession(s).errors, []);
    assert.equal(s.items[0].gate.decision, "go");
    assert.equal(existsSync(join(dir, ".intake-kit", "active")), false);

    const lines = transcript(dir).length;
    prompt(dir, "unrelated follow-up");
    assert.equal(transcript(dir).length, lines, "recording stops after confirmation");
    assert.equal(turn(dir, base()).status, 2, "a completed intake takes no more turns");
  });

  test("no session or no turn file exits 4", () => {
    const dir = repo();
    assert.equal(intake(dir, "apply-turn").status, 4);
    intake(dir, "start");
    assert.equal(intake(dir, "apply-turn", "--turn", join(dir, "missing.json")).status, 4);
  });

  test("an unparseable turn file is a rejection, not a crash", () => {
    const dir = started();
    writeFileSync(join(dir, ".intake-kit", "turn.json"), "{ not json");
    assert.equal(intake(dir, "apply-turn").status, 2);
  });
});

describe("session file", () => {
  test("is written without YAML anchors or aliases, even when arrays are shared", async () => {
    const { writeSession } = await import("../src/lib/state.ts");
    const { makeItem, makeSession } = await import("./helpers.ts");
    const { scoreAndGate } = await import("../src/lib/gates.ts");
    const { loadFramework } = await import("../src/lib/framework-fs.ts");
    const item = makeItem("item-1");
    item.facts.rule_clarity.evidence = ["data_report.definition"];
    const scored = scoreAndGate(makeSession([item]), loadFramework(".")).session; // scoring reuses the facts' evidence arrays
    assert.equal(scored.items[0].scoring!.criteria.rule_clarity.evidence, scored.items[0].facts.rule_clarity.evidence, "test setup: arrays should be shared");
    const dir = repo();
    writeSession(dir, scored);
    const text = readFileSync(join(dir, "intake-answers.yaml"), "utf8");
    assert.doesNotMatch(text, /[&*]a\d/);
    assert.deepEqual(parseYaml(text), JSON.parse(JSON.stringify(scored)));
  });
});

// End to end: the bundled hook and CLI, run as Claude Code runs them, against a temp repo.
// Needs `npm run build` first (the test script does it).

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

const session = (dir: string) => parseYaml(readFileSync(join(dir, "intake-answers.yaml"), "utf8"));
const transcript = (dir: string) => readFileSync(join(dir, ".intake-kit", "transcript.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);


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

describe("turn (interview engine v2, with Claude as the model)", () => {
  const OPENING = { type: "data_report", confidence: "high", title: "Short-pick report", trigger_quote: "I need a report of short picks", modifiers: [], also_answers: [] };
  function started() {
    const dir = repo();
    prompt(dir, "/intake-kit:intake I need a report of short picks by shift and picker");
    assert.equal(intake(dir, "start").status, 0);
    return dir;
  }
  const answer = (dir: string, call: string, outputs: unknown[]) => {
    mkdirSync(join(dir, ".intake-kit", "calls"), { recursive: true });
    writeFileSync(join(dir, ".intake-kit", "calls", `${call}.json`), JSON.stringify(outputs));
  };

  test("asks for each model call it needs, one at a time, with its instructions", () => {
    const dir = started();
    const r = intake(dir, "turn");
    assert.equal(r.status, 6);
    assert.equal(r.body.result, "needs");
    assert.equal(r.body.call, "classify_opening");
    assert.equal(r.body.write_to, join(".intake-kit", "calls", "classify_opening.json"));
    assert.match(r.body.instructions, /Classify the opening statement/);
    answer(dir, "classify_opening", [OPENING]);
    const r2 = intake(dir, "turn");
    assert.equal(r2.status, 6);
    assert.equal(r2.body.call, "phrase");
    assert.match(r2.body.input, /data_report\.decision/, "code chose the first question's area");
    assert.ok(!existsSync(join(dir, "intake-answers.yaml")) || session(dir).items.length === 0, "nothing saved until the turn completes");
  });

  test("a completed turn is saved, its reply recorded, and its call files cleared", () => {
    const dir = started();
    answer(dir, "classify_opening", [OPENING]);
    answer(dir, "phrase", [{ question: "What will you do differently with it?" }]);
    const r = intake(dir, "turn");
    assert.equal(r.status, 0, JSON.stringify(r.body));
    assert.equal(r.body.reply, "What will you do differently with it?");
    const s = session(dir);
    assert.deepEqual(validateSession(s).errors, []);
    assert.equal(s.session.engine.pending.area, "data_report.decision");
    assert.equal(existsSync(join(dir, ".intake-kit", "calls")), false);
    assert.match(readFileSync(join(dir, ".intake-kit", "replies.jsonl"), "utf8"), /What will you do differently/);
    assert.equal(intake(dir, "turn").body.result, "waiting", "nothing new from the user");
  });

  test("an output that doesn't fit its schema exits 2 and saves nothing", () => {
    const dir = started();
    answer(dir, "classify_opening", [{ ...OPENING, type: "report" }]);
    const r = intake(dir, "turn");
    assert.equal(r.status, 2);
    assert.equal(r.body.result, "invalid");
    assert.equal(r.body.call, "classify_opening");
    assert.equal(session(dir).items.length, 0);
  });

  test("no session exits 4", () => {
    assert.equal(intake(repo(), "turn").status, 4);
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

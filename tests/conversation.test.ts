// Recorded conversations replayed through the real hook and CLI: what the user typed goes
// through the prompt hook, the model's turn through apply-turn. Proves the full path works and
// that every quote in the resulting session is grounded in the recorded transcript.

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { findQuote, type TranscriptEntry } from "../src/lib/grounding.ts";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { guide, statusOf } from "../src/lib/guide.ts";
import { validateSession } from "../src/lib/schemas.ts";
import type { Session } from "../src/lib/session.ts";

const DIST = resolve("dist");
const fw = loadFramework(".");
const dirs: string[] = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const node = (script: string, args: string[], input?: string) =>
  spawnSync(process.execPath, [join(DIST, script), ...args], { input, encoding: "utf8" });

/** Every quote stored anywhere in a session, with where it came from. */
function quotesIn(s: Session): Array<[string, string]> {
  const found: Array<[string, string]> = [];
  const entry = (where: string, e: { quotes: string[] }) => e.quotes.forEach((q) => found.push([where, q]));
  for (const [k, e] of Object.entries(s.core)) entry(`core.${k}`, e);
  for (const item of s.items) {
    found.push([`${item.id}.trigger_quote`, item.trigger_quote]);
    item.type_history.forEach((h, i) => found.push([`${item.id}.type_history.${i}`, h.quote]));
    for (const [k, e] of Object.entries(item.core_overrides)) entry(`${item.id}.core.${k}`, e);
    for (const [k, e] of Object.entries(item.coverage)) entry(`${item.id}.${k}`, e);
    for (const [k, e] of Object.entries(item.facts)) entry(`${item.id}.facts.${k}`, e);
  }
  return found;
}

for (const file of readdirSync("tests/fixtures/conversations").filter((f) => f.endsWith(".json"))) {
  describe(`conversation ${file}`, () => {
    const convo = JSON.parse(readFileSync(`tests/fixtures/conversations/${file}`, "utf8"));
    const dir = mkdtempSync(join(tmpdir(), "intake-kit-convo-"));
    dirs.push(dir);
    const results: Array<{ reply: string; summary?: string; events: string[] }> = [];

    test("every step completes through the plugin's turn command", () => {
      convo.steps.forEach((step: { user: string; model: Array<{ call: string; output: unknown }> }, i: number) => {
        sleep(3); // keep transcript timestamps strictly after the previous turn's
        const hook = node("hook-prompt.mjs", [], JSON.stringify({ prompt: step.user, cwd: dir }));
        assert.equal(hook.status, 0, hook.stderr);
        if (i === 0) assert.equal(node("intake.mjs", ["start", "--dir", dir]).status, 0);
        // Claude answers the engine's calls one at a time: run turn, get "needs <call>", answer it, run again.
        const answers = new Map<string, unknown[]>();
        for (const m of step.model) answers.set(m.call, [...(answers.get(m.call) ?? []), m.output]);
        for (let guard = 0; ; guard++) {
          assert.ok(guard < 10, `step ${i}: turn never finished`);
          const r = node("intake.mjs", ["turn", "--dir", dir]);
          const body = JSON.parse(r.stdout);
          if (r.status === 0) { results.push(body); break; }
          assert.equal(r.status, 6, `step ${i}: ${r.stdout}`);
          const queue = answers.get(body.call) ?? [];
          assert.ok(queue.length, `step ${i}: the engine asked for ${body.call}, which the script doesn't have`);
          const file = join(dir, body.write_to);
          const sofar = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
          mkdirSync(join(dir, ".intake-kit", "calls"), { recursive: true });
          writeFileSync(file, JSON.stringify([...sofar, queue.shift()]));
        }
      });
    });

    test("the summary is rendered by code before the user confirms it", () => {
      const summaryTurn = results.at(-2)!;
      assert.ok(summaryTurn.summary && summaryTurn.summary.includes("Daily pick-exception report"), JSON.stringify(summaryTurn));
      assert.ok(summaryTurn.events.includes("summary"));
    });

    test("the session is valid and gated as expected", () => {
      const s: Session = parseYaml(readFileSync(join(dir, "intake-answers.yaml"), "utf8"));
      assert.deepEqual(validateSession(s).errors, []);
      assert.deepEqual(s.items.map((i) => [i.id, i.gate?.decision]), [["item-1", "go"], ["item-2", "dont_build"]]);
      assert.equal(s.items[0].scoring?.quadrant, "prioritize");
      assert.equal(s.core.trust.probe_count, 1, "the vague trust answer got its one probe");
      assert.equal(s.items[1].spawned_from, "item-1", "the manual-work check created the follow-on item");
    });

    test("the confirmed session renders its spec pack, every requirement cited", () => {
      const r = node("intake.mjs", ["render", "--dir", dir]);
      assert.equal(r.status, 0, r.stdout);
      const files = JSON.parse(r.stdout).files.map((f: { file: string }) => f.file).sort();
      assert.deepEqual(files, ["ACCEPTANCE.md", "CLAUDE.md", "DECISIONS.md", "FIRST_PROMPT.md", "GUARDRAILS.md", "PROCESS_MAP.md", "SOW_DRAFT.md", "SPEC.md"]);
      for (const file of ["SPEC.md", "ACCEPTANCE.md"]) {
        let section = "";
        for (const line of readFileSync(join(dir, file), "utf8").split("\n")) {
          if (line.startsWith("## ")) section = line.slice(3);
          if (line.startsWith("- ") && section !== "Open questions") assert.match(line, /\[[a-z0-9_.]+\] ".+"$/, `${file}: ${line}`);
        }
      }
      assert.match(readFileSync(join(dir, "GUARDRAILS.md"), "utf8"), /## Kill criteria\n\n- Stop using it for retraining/);
    });

    test("grounding: every stored quote is in a single recorded user message", () => {
      const s: Session = parseYaml(readFileSync(join(dir, "intake-answers.yaml"), "utf8"));
      const transcript: TranscriptEntry[] = readFileSync(join(dir, ".intake-kit", "transcript.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
      assert.equal(transcript.length, convo.steps.length);
      const ungrounded = quotesIn(s).filter(([, q]) => !findQuote(q, transcript));
      assert.deepEqual(ungrounded, []);
    });
  });
}

describe("status", () => {
  const empty = (): Session => ({
    schema_version: 1, framework_version: "0.1.0",
    session: { id: "2026-10-10-abcd", started_at: "2026-10-10T10:00:00Z", mode: "stakeholder", provider: "claude", grounding: "transcript", reflect_back: null },
    core: Object.fromEntries(["users", "outcome", "data", "systems", "constraints", "trust"].map((k) => [k, { status: "unknown", value: null, quotes: [], probe_count: 0 }])) as unknown as Session["core"],
    items: [],
  });

  test("no items: not ready, nothing asked", () => {
    const st = statusOf(empty(), fw);
    assert.equal(st.ready_for_reflect_back, false);
    assert.ok(st.core.every((c) => !c.asked));
  });

  test("a new broken item lists its areas, critical gaps, always-ask and its extra facts", () => {
    const s = empty();
    s.items.push({
      id: "item-1", title: "x", type: "broken", confidence: "high", trigger_quote: "q", modifiers: ["integration"], spawned_from: null, superseded_by: null,
      type_history: [], core_overrides: {}, coverage: {}, facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [],
    });
    const st = statusOf(s, fw).items[0];
    assert.ok(st.unasked.includes("broken.symptom") && st.unasked.includes("mod.integration.payload"));
    assert.deepEqual(st.always_ask_pending, ["broken.workaround"]);
    assert.ok(st.critical_unasked.includes("broken.cause") && st.critical_unasked.includes("core.trust"));
    assert.ok(st.facts_missing.includes("broken_cause") && st.facts_missing.includes("workaround_permanent"));
    assert.ok(!st.facts_missing.includes("eval_ability"), "overlay checks only once ai_applies is yes");
  });
});

describe("guide", () => {
  const text = guide(fw);

  test("names every coverage ID and the spec's low-confidence probes", () => {
    for (const id of fw.areas.keys()) assert.ok(text.includes(`\`${id}\``), id);
    assert.ok(text.includes("What will you do differently when you see this number?"));
  });

  test("lists every band of every fact", () => {
    for (const [fact, bands] of fw.factBands) for (const b of bands) assert.ok(text.includes(`\`${b}\``), `${fact}: ${b}`);
  });
});

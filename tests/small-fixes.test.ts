// The four small fixes before the feature freeze (docs/evals/2026-10-14-findings.md, §9 #1 #2 #3 #7),
// and the packet wording change.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { shortTitle } from "../src/lib/title.ts";
import { buildPacket, packetEmail } from "../src/lib/packet.ts";
import { applyWriteUp } from "../src/engine/writeup.ts";
import { runIngest, startAsync } from "../src/engine/ingest.ts";
import { findGaps, followUpEmail } from "../src/engine/gaps.ts";
import type { Session } from "../src/lib/session.ts";
import type { Provider, TurnRequest } from "../src/llm/types.ts";

const fw = loadFramework(".");
const NOW = "2026-10-14T12:00:00.000Z";
const triaged = (request = "A daily short-pick report per picker for the shift leads"): Session => startAsync(fw, { id: "2026-10-14-5f1e", request, type: "data_report", from: "Sam", provider: "azure-openai", now: NOW });
const writeUp = (band: string) => ({ facts: [{ item: "item-1", fact: "existing_asset", band, evidence: ["data_report.existing"], quote: null }], prose: [], acceptance: [], guardrails: [], open_questions: [], reflect_back_text: "" });

describe("#1 a follow-on item's follow-up asks its critical walkthrough", () => {
  test("the manual-work follow-up questions include the walkthrough", () => {
    assert.deepEqual(fw.router.checks!.manual_work.light_pass, ["manual_process.walkthrough", "core.users", "core.outcome", "manual_process.volume"]);
  });
});

describe("#2 the existing-asset band can't contradict its check", () => {
  for (const [check, given, want] of [["yes", "none", "partial"], ["yes", "unknown", "partial"], ["yes", "covers", "covers"], ["yes", "partial", "partial"], ["no", "partial", "none"], ["no", "covers", "none"], [null, "none", "none"]] as const) {
    test(`check ${check ?? "not asked"}, write-up ${given}: ${want}`, () => {
      const s = triaged();
      if (check) s.session.engine!.checks["item-1:existing_asset"] = { asks: 1, result: check };
      applyWriteUp(s, "item-1", writeUp(given), fw, []);
      assert.equal(s.items[0].facts.existing_asset.band, want);
    });
  }
});

describe("#3 terms are contested words, not names of things", () => {
  test("the ingest prompt rules out names of deliverables, tools and systems", async () => {
    const reqs: TurnRequest[] = [];
    const p: Provider = { name: "azure-openai", async complete(r) { reqs.push(r); return { text: JSON.stringify({ answers: [], checks: [], terms: [], definitions: [] }), usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 }, model: "x" }; } };
    await runIngest({ provider: p, fw, session: triaged(), source: { kind: "reply", from: "x", text: "hello" }, now: NOW });
    assert.match(reqs[0].system, /Not the name of something being built or already in use \(a script, a template, a report, a tool, a program\)/);
  });
});

describe("#7 short titles", () => {
  test("a long request becomes a short title cut at a word, not mid-word", () => {
    const t = shortTitle("Use-case ranking and rollout planning are often done by hand in spreadsheets or slide decks, which are not shared publicly.");
    assert.ok(t.length <= 61, t);
    assert.match(t, /…$/);
    assert.doesNotMatch(t, /\s(or|and)…$/);
    assert.equal(shortTitle("A daily short-pick report. Shift leads use it."), "A daily short-pick report");
  });
  test("triage uses it for the item title", () => {
    assert.ok(triaged("I want hiring managers to see I can do the enablement side of AI, not just the build side, with a public kit.").items[0].title.length <= 61);
  });
});

describe("packet wording", () => {
  test("no numbers in the outcome example, and \"If you don't know, say so\" in the packet and the follow-up", () => {
    assert.doesNotMatch(fw.areas.get("core.outcome")!.packet.example, /\d/);
    const email = packetEmail(buildPacket(fw, { request: "r", type: "data_report" }));
    assert.match(email, /If you don't know, say so\. That's a useful answer\./);
    const s = triaged();
    assert.match(followUpEmail(s, findGaps(s, fw)), /If you don't know, say so\. That's a useful answer\./);
  });
});

describe("ingest prompt: a contradiction is flagged on every area holding the fact; values add nothing", () => {
  test("the prompt says so", async () => {
    const reqs: TurnRequest[] = [];
    const p: Provider = { name: "azure-openai", async complete(r) { reqs.push(r); return { text: JSON.stringify({ answers: [], checks: [], terms: [], definitions: [] }), usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 }, model: "x" }; } };
    await runIngest({ provider: p, fw, session: triaged(), source: { kind: "reply", from: "x", text: "hello" }, now: NOW });
    assert.match(reqs[0].system, /return an answer with conflict true for every area where that fact is recorded/);
    assert.match(reqs[0].system, /Never add a detail it doesn't say/);
  });
});

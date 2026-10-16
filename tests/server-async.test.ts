// /api/async: the two async steps that need a model (ingest a pasted source, write the summary),
// behind the same protections as /api/turn. Model output is scripted.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { readServerConfig } from "../src/server/config.ts";
import { MemoryStore, keys, fromMicros } from "../src/server/store.ts";
import { handleAsync, type ApiRequest, type ServerDeps } from "../src/server/handler.ts";
import { startAsync } from "../src/engine/ingest.ts";
import type { Provider } from "../src/llm/types.ts";
import type { Session } from "../src/lib/session.ts";

const fw = loadFramework(".");
const NOW = new Date("2026-10-15T10:00:00.000Z");
const ENV = { AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com", AZURE_OPENAI_API_KEY: "kit-key", IP_HASH_SALT: "a-test-salt-of-sufficient-length", TURNSTILE_SECRET_KEY: "ts-secret", TURNSTILE_SITE_KEY: "ts-site" };
const TEXT = "We'd use it to pick who gets retraining each week.";
const INGEST = { answers: [{ item: "item-1", area: "data_report.decision", status: "answered", value: "Pick who to retrain", quotes: ["pick who gets retraining each week"], conflict: false }], checks: [], terms: [], definitions: [] };
const WRITE_UP = { facts: [], prose: [], acceptance: [], guardrails: [], open_questions: [], reflect_back_text: "A report." };

const triaged = (): Session => { const s = startAsync(fw, { id: "2026-10-15-a51c", request: "A daily short-pick report", type: "data_report", from: "Sam", provider: "azure-openai", now: NOW.toISOString() }); s.session.engine!.request_read = true; return s; };

function harness(outputs: unknown[], env: Record<string, string> = {}) {
  const store = new MemoryStore();
  const queue = outputs.map((o) => JSON.stringify(o));
  const verifications: string[] = [];
  const kit: Provider = { name: "azure-openai", async complete() { const t = queue.shift(); if (t === undefined) throw new Error("no output left"); return { text: t, model: "gpt-4.1", usage: { inputTokens: 5000, outputTokens: 500, cachedInputTokens: 0 } }; } };
  const deps: ServerDeps = { config: readServerConfig({ ...ENV, ...env }), store, fw, skill: "", now: () => NOW, makeAzure: () => kit, verify: async (t) => { verifications.push(t); return { ok: true, errors: [] }; } };
  return { deps, store, verifications };
}
const req = (body: Record<string, unknown>): ApiRequest => ({ method: "POST", headers: { "x-forwarded-for": "203.0.113.9" }, body: JSON.stringify({ provider: "kit", turnstileToken: "tok", ...body }) });

describe("/api/async", () => {
  test("ingest reads a pasted source and returns the updated session, cost and debug", async () => {
    const h = harness([INGEST]);
    const res = await handleAsync(req({ action: "ingest", session: triaged(), source: { kind: "reply", from: "Sam", text: TEXT } }), h.deps);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const s = res.body.session as Session;
    assert.equal(s.items[0].coverage["data_report.decision"].status, "covered");
    assert.equal(s.session.sources!.length, 2);
    assert.ok((res.body.usage as { costUSD: number }).costUSD > 0);
    assert.ok(fromMicros(await h.store.get(keys.sessionSpend("2026-10-15-a51c"))) > 0, "spend recorded");
    assert.deepEqual(h.verifications, ["tok"], "Turnstile checked once for the session");
  });

  test("summary writes up the items and lists the Don't-build reasons to confirm", async () => {
    const h = harness([WRITE_UP]);
    const res = await handleAsync(req({ action: "summary", session: triaged() }), h.deps);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((res.body.session as Session).session.engine!.phase, "summary");
    assert.deepEqual(res.body.confirm, []);
  });

  test("a live session, a signed-off one, or a bad source is refused before any model call", async () => {
    const h = harness([]);
    const live = triaged();
    live.session.channel = "live";
    const signed = triaged();
    signed.session.engine!.phase = "confirmed";
    for (const [body, msg] of [
      [{ action: "ingest", session: live, source: { kind: "reply", from: "Sam", text: TEXT } }, /isn't an async intake/],
      [{ action: "summary", session: signed }, /signed off/],
      [{ action: "ingest", session: triaged(), source: { kind: "email", from: "Sam", text: TEXT } }, /source.kind/],
      [{ action: "ingest", session: triaged(), source: { kind: "reply", from: "", text: TEXT } }, /source.from/],
      [{ action: "ingest", session: triaged(), source: { kind: "reply", from: "Sam", text: "x".repeat(30_001) } }, /limited to 30000 characters/],
      [{ action: "rewrite", session: triaged() }, /action must be/],
    ] as const) {
      const res = await handleAsync(req(body as Record<string, unknown>), h.deps);
      assert.equal(res.status, 400, JSON.stringify(res.body));
      assert.match(String(res.body.message), msg);
    }
  });

  test("the pause switch refuses async steps too", async () => {
    const h = harness([INGEST], { LIVE_INTAKE_NOTE: "Paused for an upgrade." });
    const res = await handleAsync(req({ action: "ingest", session: triaged(), source: { kind: "reply", from: "Sam", text: TEXT } }), h.deps);
    assert.equal(res.status, 503);
    assert.equal(res.body.error, "live_paused");
  });

  test("spend caps apply: the session budget refuses before calling", async () => {
    const h = harness([INGEST], { SESSION_BUDGET_USD: "0.01" });
    const res = await handleAsync(req({ action: "ingest", session: triaged(), source: { kind: "reply", from: "Sam", text: TEXT } }), h.deps);
    assert.equal(res.status, 429);
    assert.equal(res.body.error, "session_budget");
  });

  test("calls that fail three times record nothing: the session comes back unchanged", async () => {
    const h = harness(["nope", "nope", "nope"].map((x) => ({ x })));
    const s = triaged();
    const res = await handleAsync(req({ action: "ingest", session: s, source: { kind: "reply", from: "Sam", text: TEXT } }), h.deps);
    assert.equal(res.status, 200);
    assert.equal(res.body.result, "failed");
    assert.deepEqual(res.body.session, s);
  });
});

describe("/api/async: the source rule on the web path (live test: notes went in as the requester's reply)", () => {
  const NOTES = "Call w/ Mike (controller)\n- variance = absolute value per SKU\n- anything over $250 goes to him";
  const fromNotes = {
    answers: [{ item: "item-1", area: "core.constraints", status: "answered", value: "Over $250 goes to the controller", quotes: ["anything over $250 goes to him"], conflict: false }],
    checks: [], terms: [{ term: "variance", quote: "variance", kind: "metric" }],
    definitions: [{ term: "variance", definition: "Absolute value per SKU", quotes: ["variance = absolute value per SKU"], certain: true, measurable: "yes", examples: [], conflict: false }],
  };

  test("notes sent through the web API stay assumed, and a definition from them stays a draft", async () => {
    const h = harness([fromNotes]);
    const res = await handleAsync(req({ action: "ingest", session: triaged(), source: { kind: "notes", from: "Mike (controller)", text: NOTES } }), h.deps);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const s = res.body.session as Session;
    assert.equal(s.core.constraints.status, "assumed");
    assert.equal(s.terms![0].status, "unconfirmed");
    assert.equal(s.terms![0].draft?.definition, "Absolute value per SKU");
    assert.equal(s.session.sources!.at(-1)!.kind, "notes");
  });

  test("the source type and the speaker are required: nothing is assumed", async () => {
    const h = harness([fromNotes]);
    for (const source of [{ from: "Mike", text: NOTES }, { kind: "notes", text: NOTES }, { kind: "notes", from: "  ", text: NOTES }]) {
      const res = await handleAsync(req({ action: "ingest", session: triaged(), source }), h.deps);
      assert.equal(res.status, 400, JSON.stringify(source));
    }
  });
});

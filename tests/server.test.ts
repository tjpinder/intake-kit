// Web phase 3: the API handler. In-memory counters, scripted providers, fake Turnstile.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { readServerConfig, type ServerConfig } from "../src/server/config.ts";
import { MemoryStore, keys, fromMicros } from "../src/server/store.ts";
import { handleTurn, configResponse, clientIp, type ApiRequest, type ServerDeps } from "../src/server/handler.ts";
import { verifyTurnstile } from "../src/server/turnstile.ts";
import { ProviderError, type Provider } from "../src/llm/types.ts";
import type { AzureConfig } from "../src/llm/azure.ts";
import type { ClaudeConfig } from "../src/llm/anthropic.ts";
import type { Session } from "../src/lib/session.ts";

const fw = loadFramework(".");
const SKILL = readFileSync("skills/intake/SKILL.md", "utf8");
const CONVO = JSON.parse(readFileSync("tests/fixtures/conversations/pick-exception.json", "utf8"));
const NOW = new Date("2026-10-11T15:20:00.000Z");

const ENV = {
  AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
  AZURE_OPENAI_API_KEY: "kit-key",
  IP_HASH_SALT: "a-test-salt-of-sufficient-length",
  TURNSTILE_SECRET_KEY: "ts-secret",
  TURNSTILE_SITE_KEY: "ts-site",
};

function emptySession(id = "2026-10-11-beef"): Session {
  return {
    schema_version: 1,
    framework_version: "0.1.0",
    session: { id, started_at: NOW.toISOString(), mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null },
    core: Object.fromEntries(["users", "outcome", "data", "systems", "constraints", "trust"].map((k) => [k, { status: "unknown", value: null, quotes: [], probe_count: 0 }])) as unknown as Session["core"],
    items: [],
  };
}

interface Harness {
  deps: ServerDeps;
  store: MemoryStore;
  azureConfigs: AzureConfig[];
  claudeConfigs: ClaudeConfig[];
  verifications: string[];
}

/** Each provider call returns the next scripted output with the given token usage. */
function harness(opts: { env?: Record<string, string>; outputs?: string[]; error?: ProviderError; usage?: { inputTokens: number; outputTokens: number }; verifyOk?: boolean } = {}): Harness {
  const store = new MemoryStore();
  const azureConfigs: AzureConfig[] = [];
  const claudeConfigs: ClaudeConfig[] = [];
  const verifications: string[] = [];
  const outputs = [...(opts.outputs ?? [JSON.stringify(CONVO.steps[0].turn)])];
  const scripted = (name: Provider["name"]): Provider => ({
    name,
    async complete() {
      if (opts.error) throw opts.error;
      const text = outputs.shift();
      if (text === undefined) throw new Error("no scripted output left");
      return { text, model: "gpt-4.1-mini", usage: { inputTokens: opts.usage?.inputTokens ?? 10_000, outputTokens: opts.usage?.outputTokens ?? 500, cachedInputTokens: 0 } };
    },
  });
  const deps: ServerDeps = {
    config: readServerConfig({ ...ENV, ...opts.env }),
    store,
    fw,
    skill: SKILL,
    now: () => NOW,
    makeAzure: (c) => { azureConfigs.push(c); return scripted("azure-openai"); },
    makeClaude: (c) => { claudeConfigs.push(c); return scripted("claude"); },
    verify: async (token) => { verifications.push(token); return { ok: opts.verifyOk ?? true, errors: opts.verifyOk === false ? ["invalid-input-response"] : [] }; },
  };
  return { deps, store, azureConfigs, claudeConfigs, verifications };
}

function request(body: Record<string, unknown>, headers: Record<string, string> = {}): ApiRequest {
  return {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7", ...headers },
    body: JSON.stringify({
      session: emptySession(),
      transcript: [{ role: "user", text: CONVO.steps[0].user, at: "1999-01-01T00:00:00.000Z" }],
      replies: [],
      provider: "kit",
      turnstileToken: "tok",
      ...body,
    }),
  };
}

describe("a good turn", () => {
  test("runs the turn server-side and returns the new session, stamped transcript and cost", async () => {
    const h = harness();
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.result, "applied");
    assert.equal(res.body.reply, CONVO.steps[0].turn.reply);
    assert.equal((res.body.session as Session).items[0].id, "item-1");
    assert.equal((res.body.transcript as Array<{ at: string }>)[0].at, NOW.toISOString(), "the server stamps the new message");
    const usage = res.body.usage as { calls: number; costUSD: number };
    assert.equal(usage.calls, 1);
    // 10k input at $0.40/M + 500 output at $1.60/M
    assert.equal(Number(usage.costUSD.toFixed(6)), 0.0048);
    assert.equal(fromMicros(h.store.values.get(keys.monthSpend(NOW))!), 0.0048);
    assert.equal(fromMicros(h.store.values.get(keys.sessionSpend("2026-10-11-beef"))!), 0.0048);
  });

  test("the kit's provider gets the configured deployment and an output ceiling", async () => {
    const h = harness();
    await handleTurn(request({}), h.deps);
    assert.deepEqual(
      { ...h.azureConfigs[0] },
      { endpoint: "https://example.openai.azure.com", apiKey: "kit-key", deployment: "intake-kit-turn", model: "gpt-4.1-mini", maxCompletionTokens: 8000 },
    );
  });

  test("a rejected first attempt still counts toward spend", async () => {
    const bad = structuredClone(CONVO.steps[0].turn);
    bad.router.new_items[0].trigger_quote = "never said this";
    const h = harness({ outputs: [JSON.stringify(bad), JSON.stringify(CONVO.steps[0].turn)] });
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.body.result, "applied");
    assert.equal((res.body.usage as { calls: number }).calls, 2);
    assert.equal(fromMicros(h.store.values.get(keys.monthSpend(NOW))!), 0.0096);
  });
});

describe("input validation", () => {
  const cases: Array<[string, Record<string, unknown>, RegExp]> = [
    ["unknown provider", { provider: "openai" }, /provider must be/],
    ["invalid session", { session: { nope: true } }, /session isn't valid/],
    ["empty transcript", { transcript: [] }, /transcript must list/],
    ["reply count mismatch", { replies: ["extra"] }, /one reply for every earlier/],
    ["message too long", { transcript: [{ role: "user", text: "x".repeat(4001), at: "a" }] }, /limited to 4000 characters/],
    ["assistant text smuggled in as the user", { transcript: [{ role: "assistant", text: "hi", at: "a" }] }, /role: "user"/],
    ["unknown Claude model", { provider: "claude", claudeModel: "claude-2" }, /claudeModel must be one of/],
  ];
  for (const [name, body, message] of cases) {
    test(name, async () => {
      const res = await handleTurn(request(body), harness().deps);
      assert.equal(res.status, 400);
      assert.match(res.body.message as string, message);
    });
  }

  test("not POST, too large, or not JSON", async () => {
    const h = harness();
    assert.equal((await handleTurn({ method: "GET", headers: {}, body: "" }, h.deps)).status, 405);
    assert.equal((await handleTurn({ method: "POST", headers: {}, body: "x".repeat(1_000_001) }, h.deps)).status, 413);
    assert.equal((await handleTurn({ method: "POST", headers: {}, body: "{" }, h.deps)).status, 400);
  });
});

describe("rate limits", () => {
  test("per IP per hour, with Retry-After until the next hour", async () => {
    const h = harness({ env: { IP_TURNS_PER_HOUR: "2" }, outputs: Array(3).fill(JSON.stringify(CONVO.steps[0].turn)) });
    assert.equal((await handleTurn(request({ session: emptySession("2026-10-11-0001") }), h.deps)).status, 200);
    assert.equal((await handleTurn(request({ session: emptySession("2026-10-11-0002") }), h.deps)).status, 200);
    const third = await handleTurn(request({ session: emptySession("2026-10-11-0003") }), h.deps);
    assert.equal(third.status, 429);
    assert.equal(third.body.error, "rate_limited");
    assert.equal(third.headers?.["retry-after"], String(40 * 60), "15:20 -> 16:00");
  });

  test("different IPs are counted separately, and raw IPs are never stored", async () => {
    const h = harness({ env: { IP_TURNS_PER_HOUR: "1" }, outputs: Array(2).fill(JSON.stringify(CONVO.steps[0].turn)) });
    assert.equal((await handleTurn(request({}, { "x-forwarded-for": "198.51.100.1" }), h.deps)).status, 200);
    assert.equal((await handleTurn(request({ session: emptySession("2026-10-11-0004") }, { "x-forwarded-for": "198.51.100.2" }), h.deps)).status, 200);
    assert.ok([...h.store.values.keys()].every((k) => !k.includes("198.51.100")));
  });

  test("per session turn ceiling", async () => {
    const h = harness({ env: { SESSION_MAX_TURNS: "60" } });
    h.store.values.set(keys.sessionTurns("2026-10-11-beef"), 60);
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 429);
    assert.equal(res.body.error, "session_limit");
  });
});

describe("Turnstile", () => {
  test("verified once per session, then not asked again", async () => {
    const h = harness({ outputs: [JSON.stringify(CONVO.steps[0].turn), JSON.stringify(CONVO.steps[0].turn)] });
    assert.equal((await handleTurn(request({ turnstileToken: "first" }), h.deps)).status, 200);
    assert.equal((await handleTurn(request({ turnstileToken: undefined }), h.deps)).status, 200);
    assert.deepEqual(h.verifications, ["first"]);
  });

  test("a failed check refuses before any model call", async () => {
    const h = harness({ verifyOk: false });
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "verification_failed");
    assert.equal(h.azureConfigs.length, 1, "provider built");
    assert.equal(h.store.values.get(keys.monthSpend(NOW)), undefined, "but never called");
  });

  test("off when not configured", async () => {
    const h = harness({ env: { TURNSTILE_SECRET_KEY: "" } });
    assert.equal((await handleTurn(request({ turnstileToken: undefined }), h.deps)).status, 200);
    assert.deepEqual(h.verifications, []);
  });
});

describe("spend caps on the kit's key", () => {
  test("monthly budget: refused before calling when the worst case would exceed it", async () => {
    const h = harness();
    h.store.values.set(keys.monthSpend(NOW), 99_990_000); // $99.99 of $100
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 503);
    assert.equal(res.body.error, "budget_exhausted");
    assert.match(res.body.message as string, /monthly budget/);
  });

  test("daily budget", async () => {
    const h = harness();
    h.store.values.set(keys.daySpend(NOW), 9_999_000);
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 503);
    assert.match(res.body.message as string, /today's budget/);
  });

  test("per-session budget", async () => {
    const h = harness();
    h.store.values.set(keys.sessionSpend("2026-10-11-beef"), 1_499_000);
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 429);
    assert.equal(res.body.error, "session_budget");
  });

  test("bring-your-own-key turns don't touch the budget", async () => {
    const h = harness();
    h.store.values.set(keys.monthSpend(NOW), 100_000_000);
    const res = await handleTurn(request({ provider: "claude" }, { "x-intake-claude-key": "sk-visitor" }), h.deps);
    assert.equal(res.status, 200);
    assert.equal((res.body.usage as { costUSD: number | null }).costUSD, null);
    assert.equal(h.store.values.get(keys.monthSpend(NOW)), 100_000_000);
    assert.equal(h.claudeConfigs[0].apiKey, "sk-visitor");
    assert.equal(h.claudeConfigs[0].model, "claude-opus-5-5");
  });
});

describe("bring your own key", () => {
  test("Azure endpoints must be real Azure OpenAI hosts", async () => {
    const h = harness();
    for (const endpoint of ["https://evil.example.com", "http://x.openai.azure.com", "https://x.openai.azure.com.evil.io", "not a url"]) {
      const res = await handleTurn(request({ provider: "azure" }, { "x-intake-azure-endpoint": endpoint, "x-intake-azure-deployment": "d", "x-intake-azure-key": "k" }), h.deps);
      assert.equal(res.status, 400, endpoint);
    }
    const ok = await handleTurn(request({ provider: "azure" }, { "x-intake-azure-endpoint": "https://mine.openai.azure.com/some/path", "x-intake-azure-deployment": "d", "x-intake-azure-key": "k" }), h.deps);
    assert.equal(ok.status, 200);
    assert.equal(h.azureConfigs[0].endpoint, "https://mine.openai.azure.com", "path dropped; only the host is used");
  });

  test("missing keys, or BYOK switched off", async () => {
    assert.equal((await handleTurn(request({ provider: "claude" }), harness().deps)).status, 400);
    const off = harness({ env: { ALLOW_BYOK: "false" } });
    assert.equal((await handleTurn(request({ provider: "claude" }, { "x-intake-claude-key": "k" }), off.deps)).status, 403);
  });

  test("a key is never echoed back", async () => {
    const res = await handleTurn(request({ provider: "claude" }, { "x-intake-claude-key": "sk-secret-123" }), harness().deps);
    assert.doesNotMatch(JSON.stringify(res), /sk-secret-123/);
  });
});

describe("failures", () => {
  test("a counter store failure refuses the request (fail closed)", async () => {
    const h = harness();
    h.store.failing = true;
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 503);
    assert.equal(res.body.error, "unavailable");
  });

  test("no IP salt: everything refused; no kit key: kit refused, BYOK still works", async () => {
    assert.equal((await handleTurn(request({}), harness({ env: { IP_HASH_SALT: "" } }).deps)).status, 503);
    const noKit = harness({ env: { AZURE_OPENAI_API_KEY: "" } });
    assert.equal((await handleTurn(request({}), noKit.deps)).body.error, "kit_unavailable");
    assert.equal((await handleTurn(request({ provider: "claude" }, { "x-intake-claude-key": "k" }), noKit.deps)).status, 200);
  });

  test("provider errors come back as 502 with what's retryable", async () => {
    const h = harness({ error: new ProviderError("Azure OpenAI returned 429", { kind: "http", status: 429, retryable: true }) });
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 502);
    assert.equal(res.body.retryable, true);
  });
});

describe("config endpoint and helpers", () => {
  test("tells the UI what's available, without secrets", () => {
    const res = configResponse(harness().deps);
    assert.deepEqual(res.body, {
      ready: true, kitModel: "gpt-4.1-mini", byok: true,
      claudeModels: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"], defaultClaudeModel: "claude-opus-5-5",
      turnstileSiteKey: "ts-site", sessionMaxTurns: 60, maxMessageChars: 4000, liveIntakeNote: null,
    });
    assert.doesNotMatch(JSON.stringify(res.body), /kit-key|ts-secret|salt/);
  });

  test("LIVE_INTAKE_NOTE pauses live intakes: turns are refused with the note, before any model call", async () => {
    const note = "Live intakes are paused while intake-kit is being upgraded.";
    const h = harness({ env: { LIVE_INTAKE_NOTE: note } });
    assert.equal(configResponse(h.deps).body.liveIntakeNote, note);
    const res = await handleTurn(request({}), h.deps);
    assert.equal(res.status, 503);
    assert.equal(res.body.error, "live_paused");
    assert.equal(res.body.message, note);
    assert.equal(h.azureConfigs.length, 0, "no provider built");
  });

  test("config warnings name what's switched off", () => {
    const c: ServerConfig = readServerConfig({});
    assert.equal(c.azure, null);
    assert.equal(c.turnstile, null);
    assert.equal(c.ipHashSalt, null);
    assert.equal(c.warnings.length, 3);
    assert.equal(readServerConfig({ MONTHLY_BUDGET_USD: "lots" }).monthlyBudgetUSD, 100);
  });

  test("client IP from Azure's headers, with ports stripped", () => {
    assert.equal(clientIp({ "x-azure-clientip": "203.0.113.9" }), "203.0.113.9");
    assert.equal(clientIp({ "x-forwarded-for": "203.0.113.9:51234, 10.0.0.1" }), "203.0.113.9");
    assert.equal(clientIp({ "x-forwarded-for": "[2001:db8::1]:443" }), "2001:db8::1");
    assert.equal(clientIp({}), null);
  });

  test("Turnstile siteverify call", async () => {
    let sent: URLSearchParams | null = null;
    const fake = (async (_url: string, init: RequestInit) => { sent = init.body as URLSearchParams; return new Response(JSON.stringify({ success: true })); }) as unknown as typeof fetch;
    assert.deepEqual(await verifyTurnstile("tok", "203.0.113.9", "secret", fake), { ok: true, errors: [] });
    assert.equal(sent!.get("secret"), "secret");
    assert.equal(sent!.get("remoteip"), "203.0.113.9");
    assert.deepEqual(await verifyTurnstile("", null, "secret", fake), { ok: false, errors: ["missing-input-response"] });
  });
});

// The browser's API client (web/src/api.ts): what it sends and how it reports errors.

import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ApiError, sendTurn, type ProviderSettings } from "../web/src/api.ts";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function capture(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers });
  }) as typeof fetch;
  return calls;
}

const args = (provider: ProviderSettings) => ({
  session: { session: { id: "x" } } as never,
  transcript: [{ role: "user" as const, text: "hello", at: "t" }],
  replies: [],
  provider,
});

describe("sendTurn", () => {
  test("the built-in model sends no key headers", async () => {
    const calls = capture(200, { result: "applied" });
    await sendTurn({ ...args({ kind: "kit" }), turnstileToken: "tok" });
    const headers = calls[0].init.headers as Record<string, string>;
    assert.deepEqual(Object.keys(headers), ["content-type"]);
    assert.deepEqual(JSON.parse(calls[0].init.body as string).provider, "kit");
    assert.equal(JSON.parse(calls[0].init.body as string).turnstileToken, "tok");
  });

  test("bring-your-own keys go in headers, never in the body", async () => {
    const calls = capture(200, { result: "applied" });
    await sendTurn(args({ kind: "azure", endpoint: "https://r.openai.azure.com", deployment: "d", key: "az-secret" }));
    await sendTurn(args({ kind: "claude", key: "sk-secret", model: "claude-sonnet-5-5" }));
    assert.equal((calls[0].init.headers as Record<string, string>)["x-intake-azure-key"], "az-secret");
    assert.equal((calls[1].init.headers as Record<string, string>)["x-intake-claude-key"], "sk-secret");
    assert.doesNotMatch(String(calls[0].init.body), /az-secret/);
    assert.doesNotMatch(String(calls[1].init.body), /sk-secret/);
    assert.equal(JSON.parse(calls[1].init.body as string).claudeModel, "claude-sonnet-5-5");
  });

  test("errors carry the server's code, message and Retry-After", async () => {
    capture(429, { error: "rate_limited", message: "Slow down." }, { "retry-after": "120" });
    const err = await sendTurn(args({ kind: "kit" })).catch((e) => e);
    assert.ok(err instanceof ApiError);
    assert.equal(err.code, "rate_limited");
    assert.equal(err.message, "Slow down.");
    assert.equal(err.retryAfterSeconds, 120);
    assert.equal(err.suggestsOwnKey, true);
  });

  test("budget errors suggest the visitor's own key; a rejected key doesn't", async () => {
    capture(503, { error: "budget_exhausted", message: "Monthly budget used." });
    assert.equal((await sendTurn(args({ kind: "kit" })).catch((e) => e)).suggestsOwnKey, true);
    capture(502, { error: "provider_error", message: "That Claude API key was rejected." });
    assert.equal((await sendTurn(args({ kind: "claude", key: "k", model: "m" })).catch((e) => e)).suggestsOwnKey, false);
  });

  test("a network failure is reported plainly", async () => {
    globalThis.fetch = (async () => { throw new TypeError("fetch failed"); }) as typeof fetch;
    const err = await sendTurn(args({ kind: "kit" })).catch((e) => e);
    assert.equal(err.code, "network");
    assert.match(err.message, /Couldn't reach the server/);
  });
});

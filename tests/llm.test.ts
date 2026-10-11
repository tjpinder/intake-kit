// Web phase 2: prompt, provider schemas, Azure and Claude adapters, pricing and the turn loop.
// Providers run against mocked transports; nothing here calls a real API.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadFramework } from "../src/lib/framework-fs.ts";
import { buildSystemPrompt, buildContext, buildHistory, SHARED_SECTIONS, PromptError } from "../src/llm/prompt.ts";
import { azureTurnSchema, claudeTurnSchema } from "../src/llm/schema.ts";
import { createAzureProvider, retryDelayMs, AZURE_API_VERSION } from "../src/llm/azure.ts";
import { createClaudeProvider } from "../src/llm/anthropic.ts";
import { costUSD, priceOf, UnknownModelError } from "../src/llm/pricing.ts";
import { runTurn, FALLBACK_REPLY } from "../src/llm/turn-loop.ts";
import { ProviderError, type Provider, type TurnRequest } from "../src/llm/types.ts";
import type { TranscriptEntry } from "../src/lib/grounding.ts";
import type { Session } from "../src/lib/session.ts";

const fw = loadFramework(".");
const SKILL = readFileSync("skills/intake/SKILL.md", "utf8");
const CONVO = JSON.parse(readFileSync("tests/fixtures/conversations/pick-exception.json", "utf8"));
const REQUEST: TurnRequest = { system: "SYSTEM", history: [{ role: "user", content: "hi" }], context: "CONTEXT" };

function emptySession(): Session {
  return {
    schema_version: 1,
    framework_version: "0.1.0",
    session: { id: "2026-10-11-c0de", started_at: "2026-10-11T12:00:00.000Z", mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null },
    core: Object.fromEntries(["users", "outcome", "data", "systems", "constraints", "trust"].map((k) => [k, { status: "unknown", value: null, quotes: [], probe_count: 0 }])) as unknown as Session["core"],
    items: [],
  };
}

describe("system prompt", () => {
  const prompt = buildSystemPrompt(SKILL, fw);

  test("reuses the skill's shared sections and the generated guide", () => {
    for (const heading of SHARED_SECTIONS) assert.ok(prompt.includes(`## ${heading}`), heading);
    assert.ok(prompt.includes("## Guide"));
    for (const id of fw.areas.keys()) assert.ok(prompt.includes(`\`${id}\``), id);
    assert.ok(prompt.includes("One question per message."), "interview rules carried over");
  });

  test("has no plugin-only instructions", () => {
    assert.doesNotMatch(prompt, /apply-turn|turn\.json|CLAUDE_PLUGIN_ROOT|intake\.mjs|\/intake-kit:|node "/);
    assert.ok(!prompt.includes("`the app`"), "the app is named in plain text, not as code");
  });

  test("is identical every time, so providers can cache it", () => {
    assert.equal(buildSystemPrompt(SKILL, fw), prompt);
  });

  test("a SKILL.md missing a shared section fails loudly", () => {
    assert.throws(() => buildSystemPrompt(SKILL.replace("## Quotes", "## Citations"), fw), PromptError);
  });
});

describe("context and history", () => {
  test("context carries the session snapshot and status, without quotes", () => {
    const session = emptySession();
    session.core.users = { status: "covered", value: "Supervisor", quotes: ["a secret-ish quote"], probe_count: 0, updated_at: "2026-10-11T12:00:00.000Z" };
    const context = buildContext(session, fw);
    assert.match(context, /"core\.users":\{"status":"covered","value":"Supervisor","probe_count":0\}/);
    assert.match(context, /"ready_for_reflect_back":false/);
    assert.doesNotMatch(context, /secret-ish/);
  });

  test("history alternates the user's exact words and the replies shown", () => {
    const transcript: TranscriptEntry[] = [
      { role: "user", text: "one", at: "a" },
      { role: "user", text: "two", at: "b" },
    ];
    assert.deepEqual(buildHistory(transcript, ["reply one"]), [
      { role: "user", content: "one" },
      { role: "assistant", content: "reply one" },
      { role: "user", content: "two" },
    ]);
  });
});

describe("provider schemas", () => {
  test("Azure: meta keys stripped, otherwise the strict turn schema", () => {
    const s = azureTurnSchema();
    assert.equal(s.$schema, undefined);
    assert.equal(s.$id, undefined);
    assert.equal(s.additionalProperties, false);
    assert.deepEqual(s.$defs.update.properties.item.type, ["string", "null"]);
  });

  test("Claude: no type arrays anywhere; nullable fields become anyOf", () => {
    const s = claudeTurnSchema();
    assert.doesNotMatch(JSON.stringify(s), /"type":\[/);
    assert.deepEqual(s.$defs.update.properties.item.anyOf, [{ type: "string" }, { type: "null" }]);
    assert.equal(s.$defs.update.additionalProperties, false);
  });
});

describe("Azure OpenAI provider", () => {
  type Call = { url: string; init: RequestInit };
  function mock(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> } | Error>) {
    const calls: Call[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const r = responses.shift()!;
      if (r instanceof Error) throw r;
      return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? {}), { status: r.status, headers: r.headers });
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  }
  const ok = (content: string, extra: object = {}) => ({
    status: 200,
    body: { choices: [{ finish_reason: "stop", message: { content } }], usage: { prompt_tokens: 1000, completion_tokens: 50, prompt_tokens_details: { cached_tokens: 800 } }, ...extra },
  });
  const sleeps: number[] = [];
  const provider = (fetchImpl: typeof fetch, extra: object = {}) =>
    createAzureProvider({ endpoint: "https://res.openai.azure.com/", deployment: "intake-kit-turn", apiKey: "k", model: "gpt-4.1-mini", fetch: fetchImpl, sleep: async (ms) => { sleeps.push(ms); }, random: () => 0, ...extra });

  test("sends a strict json_schema request to the deployment, with the context last", async () => {
    const { calls, fetchImpl } = mock([ok('{"reply":"x"}')]);
    const r = await provider(fetchImpl).complete(REQUEST);
    assert.equal(calls[0].url, `https://res.openai.azure.com/openai/deployments/intake-kit-turn/chat/completions?api-version=${AZURE_API_VERSION}`);
    assert.equal((calls[0].init.headers as Record<string, string>)["api-key"], "k");
    const body = JSON.parse(calls[0].init.body as string);
    assert.deepEqual(body.messages.map((m: { role: string }) => m.role), ["system", "user", "system"]);
    assert.equal(body.messages[2].content, "CONTEXT");
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.response_format.json_schema.schema.$schema, undefined);
    assert.deepEqual(r.usage, { inputTokens: 1000, outputTokens: 50, cachedInputTokens: 800 });
    assert.equal(r.model, "gpt-4.1-mini");
  });

  test("retries 429 and 503, honouring Retry-After", async () => {
    sleeps.length = 0;
    const { calls, fetchImpl } = mock([{ status: 429, headers: { "retry-after": "3" } }, { status: 503 }, ok('{"reply":"x"}')]);
    await provider(fetchImpl).complete(REQUEST);
    assert.equal(calls.length, 3);
    assert.deepEqual(sleeps, [3000, 2000]);
  });

  test("gives up after maxRetries and reports a retryable error", async () => {
    const { fetchImpl } = mock([{ status: 429 }, { status: 429 }, { status: 429 }]);
    await assert.rejects(provider(fetchImpl, { maxRetries: 2 }).complete(REQUEST), (e: ProviderError) => e.status === 429 && e.retryable);
  });

  test("a 400 isn't retried", async () => {
    const { calls, fetchImpl } = mock([{ status: 400, body: "bad schema" }]);
    await assert.rejects(provider(fetchImpl).complete(REQUEST), (e: ProviderError) => e.status === 400 && !e.retryable && /bad schema/.test(e.message));
    assert.equal(calls.length, 1);
  });

  test("a cut-off or refused turn is an error, not a turn", async () => {
    const { fetchImpl: cut } = mock([{ status: 200, body: { choices: [{ finish_reason: "length", message: { content: '{"rep' } }] } }]);
    await assert.rejects(provider(cut).complete(REQUEST), (e: ProviderError) => e.kind === "truncated");
    const { fetchImpl: refused } = mock([{ status: 200, body: { choices: [{ finish_reason: "stop", message: { content: null, refusal: "no" } }] } }]);
    await assert.rejects(provider(refused).complete(REQUEST), (e: ProviderError) => e.kind === "refused");
  });

  test("times out", async () => {
    const hanging = (async (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new Error("aborted"))))) as unknown as typeof fetch;
    await assert.rejects(provider(hanging, { timeoutMs: 20 }).complete(REQUEST), (e: ProviderError) => e.kind === "timeout");
  });

  test("Retry-After is capped at 60s; backoff otherwise", () => {
    assert.equal(retryDelayMs(0, "120"), 60_000);
    assert.equal(retryDelayMs(2, null, () => 0), 4000);
    assert.equal(retryDelayMs(10, null, () => 0), 30_000);
  });

  test("refuses to start without config", () => {
    assert.throws(() => createAzureProvider({ endpoint: "", deployment: "d", apiKey: "k", model: "gpt-4.1-mini" }), (e: ProviderError) => e.kind === "config");
  });
});

describe("Claude provider", () => {
  function fakeClient(response: object) {
    const calls: Array<{ body: any; opts: any }> = [];
    const client = { beta: { messages: { create: async (body: unknown, opts: unknown) => { calls.push({ body, opts }); return response; } } } };
    return { calls, client: client as never };
  }
  const message = (extra: object = {}) => ({
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    content: [{ type: "text", text: '{"reply":"hi"}' }],
    usage: { input_tokens: 200, output_tokens: 40, cache_read_input_tokens: 5000, cache_creation_input_tokens: 0 },
    ...extra,
  });

  test("structured output, cached system prompt, context as a trailing system message, fallbacks on", async () => {
    const { calls, client } = fakeClient(message());
    const r = await createClaudeProvider({ apiKey: "k", client }).complete(REQUEST);
    const b = calls[0].body;
    assert.equal(b.model, "claude-opus-5-5");
    assert.deepEqual(b.system, [{ type: "text", text: "SYSTEM", cache_control: { type: "ephemeral" } }]);
    assert.deepEqual(b.messages.at(-1), { role: "system", content: "CONTEXT" });
    assert.equal(b.output_config.format.type, "json_schema");
    assert.doesNotMatch(JSON.stringify(b.output_config.format.schema), /"type":\[/);
    assert.equal(b.output_config.effort, "medium");
    assert.equal(b.fallbacks, "default");
    assert.deepEqual(b.betas, ["server-side-fallback-2026-07-01"]);
    assert.deepEqual(r.usage, { inputTokens: 5200, outputTokens: 40, cachedInputTokens: 5000, cacheWriteTokens: 0 });
  });

  test("Haiku gets no server-side fallback", async () => {
    const { calls, client } = fakeClient(message({ model: "claude-haiku-5-5" }));
    await createClaudeProvider({ apiKey: "k", model: "claude-haiku-5-5", client }).complete(REQUEST);
    assert.equal(calls[0].body.fallbacks, undefined);
    assert.equal(calls[0].body.betas, undefined);
  });

  test("a refusal or a cut-off turn is an error", async () => {
    const refused = fakeClient(message({ stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber" }, content: [] }));
    await assert.rejects(createClaudeProvider({ apiKey: "k", client: refused.client }).complete(REQUEST), (e: ProviderError) => e.kind === "refused" && /cyber/.test(e.message));
    const cut = fakeClient(message({ stop_reason: "max_tokens" }));
    await assert.rejects(createClaudeProvider({ apiKey: "k", client: cut.client }).complete(REQUEST), (e: ProviderError) => e.kind === "truncated");
  });

  test("only the listed models are accepted", () => {
    assert.throws(() => createClaudeProvider({ apiKey: "k", model: "claude-2" as never }), (e: ProviderError) => e.kind === "config");
  });
});

describe("pricing", () => {
  test("gpt-4.1-mini: cached input charged at the full rate, conservatively", () => {
    assert.equal(costUSD("gpt-4.1-mini", { inputTokens: 1_000_000, outputTokens: 1_000_000, cachedInputTokens: 500_000 }), 2.0);
  });

  test("Claude: cache reads cheap, cache writes at 1.25x", () => {
    // 1M fresh input at $4 + 1M cache reads at $0.20 + 1M cache writes at $5 + 1M output at $20
    const cost = costUSD("claude-opus-5-5", { inputTokens: 3_000_000, outputTokens: 1_000_000, cachedInputTokens: 1_000_000, cacheWriteTokens: 1_000_000 });
    assert.equal(Number(cost.toFixed(6)), 29.2);
  });

  test("an unknown model throws instead of costing zero", () => {
    assert.throws(() => priceOf("gpt-9"), UnknownModelError);
  });
});

describe("turn loop", () => {
  /** A provider that returns scripted outputs and records what it was sent. */
  function scripted(outputs: string[]) {
    const requests: TurnRequest[] = [];
    const provider: Provider = {
      name: "azure-openai",
      async complete(request) {
        requests.push(structuredClone(request));
        const text = outputs.shift();
        if (text === undefined) throw new Error("no more scripted outputs");
        return { text, model: "gpt-4.1-mini", usage: { inputTokens: 100, outputTokens: 10, cachedInputTokens: 0 } };
      },
    };
    return { provider, requests };
  }
  let clock = 0;
  const now = () => new Date(Date.UTC(2026, 9, 11, 13, 0, clock++)).toISOString();

  test("replays the worked example to Go through the loop", async () => {
    let session = emptySession();
    const transcript: TranscriptEntry[] = [];
    const replies: string[] = [];
    for (const step of CONVO.steps) {
      transcript.push({ role: "user", text: step.user, at: now() });
      const { provider } = scripted([JSON.stringify(step.turn)]);
      const out = await runTurn({ provider, fw, skill: SKILL, session, transcript, replies, now });
      assert.equal(out.result, "applied", JSON.stringify(out.attempts.at(-1)?.rejections));
      session = out.session;
      replies.push(out.reply);
    }
    assert.deepEqual(session.items.map((i) => i.gate?.decision), ["go", "dont_build"]);
  });

  test("a rejected turn is retried once with the reasons; the transcript stays the user's own", async () => {
    const transcript: TranscriptEntry[] = [{ role: "user", text: CONVO.steps[0].user, at: now() }];
    const bad = structuredClone(CONVO.steps[0].turn);
    bad.router.new_items[0].trigger_quote = "words the user never typed";
    const { provider, requests } = scripted([JSON.stringify(bad), JSON.stringify(CONVO.steps[0].turn)]);
    const out = await runTurn({ provider, fw, skill: SKILL, session: emptySession(), transcript, replies: [], now });
    assert.equal(out.result, "applied");
    assert.equal(out.attempts.length, 2);
    const retry = requests[1].history;
    assert.equal(retry.at(-2)!.role, "assistant");
    assert.match(retry.at(-1)!.content, /trigger_quote: "words the user never typed" isn't the user's words/);
    assert.equal(transcript.length, 1, "feedback never enters the transcript");
  });

  test("rejected twice: nothing saved, but the last reply is still shown", async () => {
    const transcript: TranscriptEntry[] = [{ role: "user", text: CONVO.steps[0].user, at: now() }];
    const bad = structuredClone(CONVO.steps[0].turn);
    bad.router.new_items[0].trigger_quote = "invented";
    const session = emptySession();
    const { provider } = scripted([JSON.stringify(bad), JSON.stringify(bad)]);
    const out = await runTurn({ provider, fw, skill: SKILL, session, transcript, replies: [], now });
    assert.equal(out.result, "rejected");
    assert.equal(out.session, session);
    assert.equal(out.reply, bad.reply);
  });

  test("output that never parses gets a neutral fallback reply", async () => {
    const transcript: TranscriptEntry[] = [{ role: "user", text: "hello", at: now() }];
    const { provider } = scripted(["not json", "{still not"]);
    const out = await runTurn({ provider, fw, skill: SKILL, session: emptySession(), transcript, replies: [], now });
    assert.equal(out.result, "invalid");
    assert.equal(out.reply, FALLBACK_REPLY);
  });

  test("provider errors propagate for the caller to handle", async () => {
    const provider: Provider = { name: "azure-openai", complete: async () => { throw new ProviderError("down", { kind: "http", status: 503, retryable: true }); } };
    await assert.rejects(runTurn({ provider, fw, skill: SKILL, session: emptySession(), transcript: [{ role: "user", text: "x", at: now() }], replies: [], now }), ProviderError);
  });
});

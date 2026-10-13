// The web app's API, independent of Azure: /api/turn runs one user turn server-side, behind
// rate limits, Turnstile and spend caps; /api/config tells the UI what's available. The server
// builds the prompt itself, so the kit's key can only ever run the intake interview.

import { createHash } from "node:crypto";
import type { Framework } from "../lib/framework.ts";
import type { TranscriptEntry } from "../lib/grounding.ts";
import { validateSession } from "../lib/schemas.ts";
import type { Session } from "../lib/session.ts";
import { createAzureProvider, type AzureConfig } from "../llm/azure.ts";
import { CLAUDE_MODELS, DEFAULT_CLAUDE_MODEL, createClaudeProvider, type ClaudeConfig, type ClaudeModel } from "../llm/anthropic.ts";
import { costUSD } from "../llm/pricing.ts";
import { buildRequest } from "../llm/prompt.ts";
import { runTurn } from "../llm/turn-loop.ts";
import { ProviderError, type Provider, type ProviderResult } from "../llm/types.ts";
import type { ServerConfig } from "./config.ts";
import { fromMicros, keys, toMicros, type CounterStore } from "./store.ts";
import { verifyTurnstile } from "./turnstile.ts";

export interface ApiRequest {
  method: string;
  /** Header names in lower case. */
  headers: Record<string, string | undefined>;
  body: string;
}

export interface ApiResponse {
  status: number;
  headers?: Record<string, string>;
  body: Record<string, unknown>;
}

export interface ServerDeps {
  config: ServerConfig;
  store: CounterStore;
  fw: Framework;
  skill: string;
  now?: () => Date;
  makeAzure?: (config: AzureConfig) => Provider;
  makeClaude?: (config: ClaudeConfig) => Provider;
  verify?: typeof verifyTurnstile;
  log?: (message: string, data?: Record<string, unknown>) => void;
}

type ProviderChoice = "kit" | "azure" | "claude";

interface TurnBody {
  session: Session;
  transcript: TranscriptEntry[];
  replies: string[];
  provider: ProviderChoice;
  claudeModel?: string;
  turnstileToken?: string;
}

/** Hosts a bring-your-own Azure endpoint may point at. Anything else could turn the API into an open proxy. */
const AZURE_HOST = /^[a-z0-9-]+\.(openai\.azure\.com|cognitiveservices\.azure\.com|services\.ai\.azure\.com)$/i;

/** Output tokens the kit's provider may spend per call; also the worst case the budget check assumes. */
const MAX_OUTPUT_TOKENS = 8000;

const json = (status: number, body: Record<string, unknown>, headers?: Record<string, string>): ApiResponse => ({ status, body, headers });
const fail = (status: number, error: string, message: string, extra: Record<string, unknown> = {}, headers?: Record<string, string>) =>
  json(status, { error, message, ...extra }, headers);

export function clientIp(headers: ApiRequest["headers"]): string | null {
  const raw = headers["x-azure-clientip"] || headers["x-forwarded-for"]?.split(",")[0] || headers["x-client-ip"] || "";
  const ip = raw.trim().replace(/^\[|\](:\d+)?$/g, "").replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1");
  return ip || null;
}

function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function secondsUntil(next: Date, now: Date): string {
  return String(Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000)));
}

function parseBody(raw: string, config: ServerConfig): TurnBody | string {
  let body: Partial<TurnBody>;
  try {
    body = JSON.parse(raw);
  } catch {
    return "The request body isn't valid JSON.";
  }
  if (!body || typeof body !== "object") return "The request body must be an object.";
  if (!["kit", "azure", "claude"].includes(body.provider as string)) return 'provider must be "kit", "azure" or "claude".';
  const v = validateSession(body.session);
  if (!v.ok) return `session isn't valid: ${v.errors.slice(0, 3).join("; ")}`;
  if (!Array.isArray(body.transcript) || body.transcript.length === 0) return "transcript must list the user's messages, including the new one.";
  if (body.transcript.length > config.sessionMaxTurns) return `This intake has reached its limit of ${config.sessionMaxTurns} messages.`;
  for (const [i, e] of body.transcript.entries()) {
    if (!e || e.role !== "user" || typeof e.text !== "string" || typeof e.at !== "string") return `transcript[${i}] must be { role: "user", text, at }.`;
    if (!e.text.trim()) return `transcript[${i}] is empty.`;
    if (e.text.length > config.maxMessageChars) return `Messages are limited to ${config.maxMessageChars} characters.`;
  }
  if (!Array.isArray(body.replies) || body.replies.length !== body.transcript.length - 1 || !body.replies.every((r) => typeof r === "string")) {
    return "replies must hold one reply for every earlier user message.";
  }
  if (body.claudeModel !== undefined && !CLAUDE_MODELS.includes(body.claudeModel as ClaudeModel)) return `claudeModel must be one of ${CLAUDE_MODELS.join(", ")}.`;
  return body as TurnBody;
}

/** Wraps a provider so every successful call is recorded, even if the turn fails afterwards. */
function metered(provider: Provider, calls: ProviderResult[]): Provider {
  return {
    name: provider.name,
    async complete(request, signal) {
      const result = await provider.complete(request, signal);
      calls.push(result);
      return result;
    },
  };
}

export function configResponse(deps: Pick<ServerDeps, "config">): ApiResponse {
  const c = deps.config;
  return json(200, {
    ready: c.ipHashSalt !== null,
    kitModel: c.azure?.model ?? null,
    byok: c.allowByok,
    claudeModels: [...CLAUDE_MODELS],
    defaultClaudeModel: DEFAULT_CLAUDE_MODEL,
    turnstileSiteKey: c.turnstile?.siteKey ?? null,
    sessionMaxTurns: c.sessionMaxTurns,
    maxMessageChars: c.maxMessageChars,
  });
}

export async function handleTurn(req: ApiRequest, deps: ServerDeps): Promise<ApiResponse> {
  const { config, store } = deps;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => {});
  const started = now();

  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");
  if (Buffer.byteLength(req.body, "utf8") > config.maxBodyBytes) return fail(413, "too_large", "This conversation is too long to send.");
  if (!config.ipHashSalt) return fail(503, "not_configured", "The service isn't fully configured yet.");

  const body = parseBody(req.body, config);
  if (typeof body === "string") return fail(400, "bad_request", body);
  const sessionId = body.session.session.id;
  const ip = clientIp(req.headers);
  const ipHash = hashIp(ip ?? "unknown", config.ipHashSalt);

  // Pick the provider before touching any counters, so a misconfigured request costs nothing.
  let provider: Provider;
  let kitModel: string | null = null;
  try {
    if (body.provider === "kit") {
      if (!config.azure) return fail(503, "kit_unavailable", "The built-in model isn't available right now. You can use your own API key instead.");
      provider = (deps.makeAzure ?? createAzureProvider)({ ...config.azure, maxCompletionTokens: MAX_OUTPUT_TOKENS });
      kitModel = config.azure.model;
    } else {
      if (!config.allowByok) return fail(403, "byok_disabled", "Bringing your own key is turned off on this deployment.");
      if (body.provider === "azure") {
        const endpoint = req.headers["x-intake-azure-endpoint"] ?? "";
        const deployment = req.headers["x-intake-azure-deployment"] ?? "";
        const apiKey = req.headers["x-intake-azure-key"] ?? "";
        let host = "";
        try {
          const url = new URL(endpoint);
          host = url.protocol === "https:" ? url.hostname : "";
        } catch { /* invalid URL: host stays empty */ }
        if (!AZURE_HOST.test(host)) return fail(400, "bad_request", "The Azure endpoint must be an https://<resource>.openai.azure.com (or Azure AI) address.");
        if (!deployment || !apiKey) return fail(400, "bad_request", "Your Azure deployment name and key are both required.");
        provider = (deps.makeAzure ?? createAzureProvider)({ endpoint: `https://${host}`, deployment, apiKey, model: "byok", maxCompletionTokens: MAX_OUTPUT_TOKENS });
      } else {
        const apiKey = req.headers["x-intake-claude-key"] ?? "";
        if (!apiKey) return fail(400, "bad_request", "Your Claude API key is required.");
        provider = (deps.makeClaude ?? createClaudeProvider)({ apiKey, model: (body.claudeModel as ClaudeModel) ?? DEFAULT_CLAUDE_MODEL });
      }
    }
  } catch (err) {
    if (err instanceof ProviderError) return fail(400, "bad_request", err.message);
    throw err;
  }

  // Counters. Any store failure refuses the request: a public endpoint can't fail open.
  try {
    const hour = await store.add(keys.ipHour(ipHash, started), 1);
    if (hour > config.ipTurnsPerHour) {
      const next = new Date(started); next.setUTCMinutes(60, 0, 0);
      return fail(429, "rate_limited", "You're sending messages faster than this demo allows. Please wait a little and try again.", {}, { "retry-after": secondsUntil(next, started) });
    }
    const day = await store.add(keys.ipDay(ipHash, started), 1);
    if (day > config.ipTurnsPerDay) {
      const next = new Date(started); next.setUTCHours(24, 0, 0, 0);
      return fail(429, "rate_limited", "You've reached today's limit for this demo. Please come back tomorrow, or use your own API key.", {}, { "retry-after": secondsUntil(next, started) });
    }
    const turns = await store.add(keys.sessionTurns(sessionId), 1);
    if (turns > config.sessionMaxTurns) return fail(429, "session_limit", `This intake has reached its limit of ${config.sessionMaxTurns} turns. Start a new one to continue.`);

    if (config.turnstile && (await store.get(keys.sessionVerified(sessionId))) < 1) {
      const result = await (deps.verify ?? verifyTurnstile)(body.turnstileToken ?? "", ip, config.turnstile.secretKey);
      if (!result.ok) return fail(403, "verification_failed", "We couldn't confirm you're a person. Refresh the page and try again.", { codes: result.errors });
      await store.add(keys.sessionVerified(sessionId), 1);
    }

    if (kitModel) {
      // Worst case for this turn: two attempts, a generous token estimate, full output each time.
      const request = buildRequest({ skill: deps.skill, fw: deps.fw, session: body.session, transcript: body.transcript, replies: body.replies });
      const inputTokens = Math.ceil((request.system.length + request.context.length + request.history.reduce((n, m) => n + m.content.length, 0)) / 3);
      const worst = 2 * costUSD(kitModel, { inputTokens, outputTokens: MAX_OUTPUT_TOKENS, cachedInputTokens: 0 });
      const [month, dayS, sessionS] = await Promise.all([
        store.get(keys.monthSpend(started)), store.get(keys.daySpend(started)), store.get(keys.sessionSpend(sessionId)),
      ]);
      if (fromMicros(month) + worst > config.monthlyBudgetUSD) {
        log("monthly budget reached", { month: fromMicros(month) });
        return fail(503, "budget_exhausted", "This demo has used its monthly budget. You can keep going with your own API key.");
      }
      if (fromMicros(dayS) + worst > config.dailyBudgetUSD) return fail(503, "budget_exhausted", "This demo has used today's budget. Please come back tomorrow, or use your own API key.");
      if (fromMicros(sessionS) + worst > config.sessionBudgetUSD) return fail(429, "session_budget", "This intake has used its share of the demo budget. Start a new one, or continue with your own API key.");
    }
  } catch (err) {
    log("counter store failed", { error: (err as Error).message });
    return fail(503, "unavailable", "The service is temporarily unavailable. Please try again shortly.");
  }

  // The server stamps the new message, so the reflect-back check never depends on the visitor's clock.
  const transcript = body.transcript.map((e, i) => (i === body.transcript.length - 1 ? { ...e, at: started.toISOString() } : e));
  let tick = 1;
  const turnNow = () => new Date(started.getTime() + tick++).toISOString();

  const calls: ProviderResult[] = [];
  try {
    const outcome = await runTurn({ provider: metered(provider, calls), fw: deps.fw, skill: deps.skill, session: body.session, transcript, replies: body.replies, now: turnNow });
    return json(200, {
      result: outcome.result,
      reply: outcome.reply,
      confirmed: outcome.confirmed,
      session: outcome.session,
      transcript,
      usage: summarize(calls, kitModel),
      // The model's raw output for each attempt, what the checks rejected and what was captured,
      // so a visitor's debug log can explain a turn. Nothing here is stored on the server.
      debug: { attempts: outcome.attempts.map((a) => ({ model: a.model, text: a.text, rejections: a.rejections, warnings: a.warnings })) },
    });
  } catch (err) {
    if (err instanceof ProviderError) {
      log("provider error", { kind: err.kind, status: err.status });
      return fail(502, "provider_error", err.message, { kind: err.kind, retryable: err.retryable, usage: summarize(calls, kitModel) });
    }
    log("turn failed", { error: (err as Error).message });
    return fail(500, "internal_error", "Something went wrong on our side. Please try again.");
  } finally {
    if (kitModel && calls.length) {
      const micros = toMicros(calls.reduce((usd, c) => usd + costUSD(kitModel!, c.usage), 0));
      try {
        await Promise.all([store.add(keys.monthSpend(started), micros), store.add(keys.daySpend(started), micros), store.add(keys.sessionSpend(sessionId), micros)]);
      } catch (err) {
        log("couldn't record spend", { error: (err as Error).message, micros });
      }
    }
  }
}

function summarize(calls: ProviderResult[], kitModel: string | null) {
  return {
    calls: calls.length,
    inputTokens: calls.reduce((n, c) => n + c.usage.inputTokens, 0),
    outputTokens: calls.reduce((n, c) => n + c.usage.outputTokens, 0),
    costUSD: kitModel ? calls.reduce((usd, c) => usd + costUSD(kitModel, c.usage), 0) : null,
  };
}

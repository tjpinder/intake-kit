// The browser's side of /api: what the server offers, and one user turn.

import type { Session, TranscriptEntry } from "../../src/core.ts";

export interface AppConfig {
  ready: boolean;
  kitModel: string | null;
  byok: boolean;
  claudeModels: string[];
  defaultClaudeModel: string;
  turnstileSiteKey: string | null;
  sessionMaxTurns: number;
  maxMessageChars: number;
  /** Async intake: the longest pasted source accepted. */
  maxSourceChars?: number;
  /** Live intakes are paused when set; only the sample runs. */
  liveIntakeNote?: string | null;
}

export type ProviderSettings =
  | { kind: "kit" }
  | { kind: "azure"; endpoint: string; deployment: string; key: string }
  | { kind: "claude"; key: string; model: string };

export interface TurnResponse {
  /** applied: saved. send_again: the model calls failed; nothing was recorded. */
  result: "applied" | "send_again";
  reply: string;
  confirmed: boolean;
  session: Session;
  transcript: TranscriptEntry[];
  usage: { calls: number; inputTokens: number; outputTokens: number; costUSD: number | null };
  debug?: { calls: TurnDebug["calls"]; events: string[] };
}

/** One turn as the debug log keeps it: each attempt's raw output, rejections and warnings. */
export interface TurnDebug {
  at: string;
  result: TurnResponse["result"];
  /** Each model call: its raw output, and whether it passed its schema. */
  calls: Array<{ name: string; model: string; text: string; ok: boolean; problem: string | null }>;
  /** What code did with it. */
  events: string[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds: number | null;
  constructor(status: number, code: string, message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
  /** Errors a visitor can get past by using their own key. */
  get suggestsOwnKey(): boolean {
    return ["budget_exhausted", "kit_unavailable", "session_budget"].includes(this.code) || (this.code === "rate_limited" && this.status === 429);
  }
}

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new ApiError(res.status, "unavailable", "The service isn't reachable right now.");
  return (await res.json()) as AppConfig;
}

/** The headers that carry a bring-your-own key, never the body. */
function keyHeaders(p: ProviderSettings): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (p.kind === "azure") {
    headers["x-intake-azure-endpoint"] = p.endpoint;
    headers["x-intake-azure-deployment"] = p.deployment;
    headers["x-intake-azure-key"] = p.key;
  } else if (p.kind === "claude") {
    headers["x-intake-claude-key"] = p.key;
  }
  return headers;
}

export interface AsyncResponse {
  /** applied: saved. failed: the model calls failed three times; nothing from the source was recorded. */
  result: "applied" | "failed";
  session: Session;
  /** After a summary: the Don't-build reasons to confirm one by one at sign-off. */
  confirm?: Array<{ key: string; question: string }>;
  usage: TurnResponse["usage"];
  debug?: { calls: TurnDebug["calls"]; events: string[] };
}

/** Async intake: ingest one pasted source, or write the summary. Everything else runs in the browser. */
export async function sendAsync(args: {
  action: "ingest" | "summary";
  session: Session;
  source?: { kind: "reply" | "notes" | "transcript"; from: string; text: string };
  provider: ProviderSettings;
  turnstileToken?: string;
}): Promise<AsyncResponse> {
  const p = args.provider;
  let res: Response;
  try {
    res = await fetch("/api/async", {
      method: "POST",
      headers: keyHeaders(p),
      body: JSON.stringify({
        action: args.action,
        session: args.session,
        ...(args.source ? { source: args.source } : {}),
        provider: p.kind,
        ...(p.kind === "claude" ? { claudeModel: p.model } : {}),
        ...(args.turnstileToken ? { turnstileToken: args.turnstileToken } : {}),
      }),
    });
  } catch {
    throw new ApiError(0, "network", "Couldn't reach the server. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const retry = Number(res.headers.get("retry-after"));
    throw new ApiError(res.status, String(body.error ?? "error"), String(body.message ?? `The server returned ${res.status}.`), Number.isFinite(retry) && retry > 0 ? retry : null);
  }
  return body as unknown as AsyncResponse;
}

export async function sendTurn(args: {
  session: Session;
  transcript: TranscriptEntry[];
  replies: string[];
  provider: ProviderSettings;
  turnstileToken?: string;
  signal?: AbortSignal;
  /** The summary's Confirm button. */
  action?: "confirm";
}): Promise<TurnResponse> {
  const p = args.provider;
  const headers = keyHeaders(p);
  let res: Response;
  try {
    res = await fetch("/api/turn", {
      method: "POST",
      headers,
      signal: args.signal,
      body: JSON.stringify({
        session: args.session,
        transcript: args.transcript,
        replies: args.replies,
        provider: p.kind,
        ...(p.kind === "claude" ? { claudeModel: p.model } : {}),
        ...(args.turnstileToken ? { turnstileToken: args.turnstileToken } : {}),
        ...(args.action ? { action: args.action } : {}),
      }),
    });
  } catch {
    throw new ApiError(0, "network", "Couldn't reach the server. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const retry = Number(res.headers.get("retry-after"));
    throw new ApiError(res.status, String(body.error ?? "error"), String(body.message ?? `The server returned ${res.status}.`), Number.isFinite(retry) && retry > 0 ? retry : null);
  }
  return body as unknown as TurnResponse;
}

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
  /** Live intakes are paused when set; only the sample runs. */
  liveIntakeNote?: string | null;
}

export type ProviderSettings =
  | { kind: "kit" }
  | { kind: "azure"; endpoint: string; deployment: string; key: string }
  | { kind: "claude"; key: string; model: string };

export interface TurnResponse {
  result: "applied" | "rejected" | "invalid";
  reply: string;
  confirmed: boolean;
  session: Session;
  transcript: TranscriptEntry[];
  usage: { calls: number; inputTokens: number; outputTokens: number; costUSD: number | null };
  debug?: { attempts: TurnDebug["attempts"] };
}

/** One turn as the debug log keeps it: each attempt's raw output, rejections and warnings. */
export interface TurnDebug {
  at: string;
  result: TurnResponse["result"];
  attempts: Array<{ model: string; text: string; rejections: Array<{ path: string; reason: string }>; warnings: string[] }>;
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

export async function sendTurn(args: {
  session: Session;
  transcript: TranscriptEntry[];
  replies: string[];
  provider: ProviderSettings;
  turnstileToken?: string;
  signal?: AbortSignal;
}): Promise<TurnResponse> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const p = args.provider;
  if (p.kind === "azure") {
    headers["x-intake-azure-endpoint"] = p.endpoint;
    headers["x-intake-azure-deployment"] = p.deployment;
    headers["x-intake-azure-key"] = p.key;
  } else if (p.kind === "claude") {
    headers["x-intake-claude-key"] = p.key;
  }
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

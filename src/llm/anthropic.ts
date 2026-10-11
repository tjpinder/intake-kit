// Claude provider, for visitors who bring their own Anthropic API key. Uses the official SDK
// with structured outputs (output_config.format), a cached system prompt, and Anthropic's
// server-side refusal fallback on the models that support it. Server-side only.

import Anthropic from "@anthropic-ai/sdk";
import { claudeTurnSchema } from "./schema.ts";
import { ProviderError, type Provider, type ProviderResult, type TurnRequest } from "./types.ts";

export const CLAUDE_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"] as const;
export type ClaudeModel = (typeof CLAUDE_MODELS)[number];
export const DEFAULT_CLAUDE_MODEL: ClaudeModel = "claude-opus-5-5";

/** Models that accept the server-side `fallbacks: "default"` parameter (Haiku has no server-side fallback). */
const SERVER_FALLBACK: ReadonlySet<string> = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

export interface ClaudeConfig {
  apiKey: string;
  model?: ClaudeModel;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  /** Injected in tests; defaults to a real SDK client. */
  client?: Pick<Anthropic, "beta">;
}

export function createClaudeProvider(config: ClaudeConfig): Provider {
  if (!config.apiKey && !config.client) throw new ProviderError("A Claude API key is required.", { kind: "config" });
  const model = config.model ?? DEFAULT_CLAUDE_MODEL;
  if (!CLAUDE_MODELS.includes(model)) throw new ProviderError(`Unsupported Claude model: ${model}`, { kind: "config" });
  const client = config.client ?? new Anthropic({ apiKey: config.apiKey, maxRetries: 2, timeout: 120_000 });
  const schema = claudeTurnSchema();

  return {
    name: "claude",
    async complete(request: TurnRequest, signal?: AbortSignal): Promise<ProviderResult> {
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await client.beta.messages.create(
          {
            model,
            max_tokens: config.maxTokens ?? 16000,
            // The system prompt is identical every turn; cache it.
            system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
            messages: [
              ...request.history.map((m) => ({ role: m.role, content: m.content })),
              // Volatile per-turn state goes last, after the cached prefix.
              { role: "system" as const, content: request.context },
            ],
            output_config: { effort: config.effort ?? "medium", format: { type: "json_schema", schema } },
            ...(SERVER_FALLBACK.has(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
          },
          { signal },
        );
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) throw new ProviderError("That Claude API key was rejected.", { kind: "http", status: 401 });
        if (err instanceof Anthropic.RateLimitError) throw new ProviderError("Claude is rate-limiting this key; try again shortly.", { kind: "http", status: 429, retryable: true });
        if (err instanceof Anthropic.BadRequestError) throw new ProviderError(`Claude rejected the request: ${err.message}`, { kind: "http", status: 400 });
        if (err instanceof Anthropic.APIError) throw new ProviderError(`Claude returned an error: ${err.message}`, { kind: "http", status: err.status ?? null, retryable: (err.status ?? 500) >= 500 });
        throw new ProviderError(`Couldn't reach Claude: ${(err as Error).message}`, { kind: "network", retryable: true });
      }

      if (response.stop_reason === "refusal") {
        throw new ProviderError(`Claude declined this turn${response.stop_details?.category ? ` (${response.stop_details.category})` : ""}.`, { kind: "refused" });
      }
      if (response.stop_reason === "max_tokens") throw new ProviderError("Claude's turn was cut off before it finished.", { kind: "truncated", retryable: true });
      const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      if (!text) throw new ProviderError("Claude returned an empty turn.", { kind: "empty", retryable: true });
      const u = response.usage;
      const cached = u.cache_read_input_tokens ?? 0;
      const written = u.cache_creation_input_tokens ?? 0;
      return {
        text,
        model: response.model,
        usage: { inputTokens: u.input_tokens + cached + written, outputTokens: u.output_tokens, cachedInputTokens: cached, cacheWriteTokens: written },
      };
    },
  };
}

// Azure OpenAI provider, following an existing production integration: classic
// deployment-scoped chat completions, api-key header, raw fetch, retry on 429/503 honouring
// Retry-After. Added here: strict json_schema output and a request timeout.

import { azureTurnSchema } from "./schema.ts";
import { ProviderError, type Provider, type ProviderResult, type TurnRequest } from "./types.ts";

export interface AzureConfig {
  /** e.g. https://<resource>.openai.azure.com */
  endpoint: string;
  deployment: string;
  apiKey: string;
  /** The model behind the deployment, for pricing (e.g. "gpt-4.1-mini"). */
  model: string;
  apiVersion?: string;
  maxCompletionTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export const AZURE_API_VERSION = "2024-10-21";

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Delay before retry `attempt` (0-based): Retry-After if given (capped at 60s), else 2^n s up to 30s, plus jitter. */
export function retryDelayMs(attempt: number, retryAfter: string | null, random: () => number = Math.random): number {
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60_000);
  return Math.min(1000 * 2 ** attempt, 30_000) + Math.floor(random() * 250);
}

export function createAzureProvider(config: AzureConfig): Provider {
  const doFetch = config.fetch ?? fetch;
  const sleep = config.sleep ?? realSleep;
  const random = config.random ?? Math.random;
  const maxRetries = config.maxRetries ?? 4;
  const timeoutMs = config.timeoutMs ?? 60_000;
  const endpoint = config.endpoint.replace(/\/+$/, "");
  if (!endpoint || !config.deployment || !config.apiKey) {
    throw new ProviderError("Azure OpenAI isn't configured: endpoint, deployment and key are all required.", { kind: "config" });
  }
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${config.apiVersion ?? AZURE_API_VERSION}`;
  const schema = azureTurnSchema();

  return {
    name: "azure-openai",
    async complete(request: TurnRequest, signal?: AbortSignal): Promise<ProviderResult> {
      const body = JSON.stringify({
        messages: [
          { role: "system", content: request.system },
          ...request.history,
          { role: "system", content: request.context },
        ],
        response_format: { type: "json_schema", json_schema: { name: "intake_turn", strict: true, schema } },
        max_completion_tokens: config.maxCompletionTokens ?? 4000,
        temperature: config.temperature ?? 0.3,
      });

      for (let attempt = 0; ; attempt++) {
        const timeout = new AbortController();
        const timer = setTimeout(() => timeout.abort(), timeoutMs);
        const onAbort = () => timeout.abort();
        signal?.addEventListener("abort", onAbort);
        let res: Response;
        try {
          res = await doFetch(url, { method: "POST", headers: { "content-type": "application/json", "api-key": config.apiKey }, body, signal: timeout.signal });
        } catch (err) {
          if (signal?.aborted) throw new ProviderError("The request was cancelled.", { kind: "network" });
          if (timeout.signal.aborted) throw new ProviderError(`Azure OpenAI didn't answer within ${timeoutMs / 1000}s.`, { kind: "timeout", retryable: true });
          throw new ProviderError(`Couldn't reach Azure OpenAI: ${(err as Error).message}`, { kind: "network", retryable: true });
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
        }

        if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
          await sleep(retryDelayMs(attempt, res.headers.get("retry-after"), random));
          continue;
        }
        if (!res.ok) {
          const detail = (await res.text().catch(() => "")).slice(0, 300);
          throw new ProviderError(`Azure OpenAI returned ${res.status}: ${detail}`, { kind: "http", status: res.status, retryable: res.status === 429 || res.status >= 500 });
        }

        const data = (await res.json()) as {
          model?: string;
          choices?: Array<{ finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
        };
        const choice = data.choices?.[0];
        if (choice?.message?.refusal) throw new ProviderError(`The model declined: ${choice.message.refusal}`, { kind: "refused" });
        if (choice?.finish_reason === "length") throw new ProviderError("The model's turn was cut off before it finished.", { kind: "truncated", retryable: true });
        const text = choice?.message?.content;
        if (!text) throw new ProviderError("The model returned an empty turn.", { kind: "empty", retryable: true });
        return {
          text,
          model: config.model,
          usage: {
            inputTokens: data.usage?.prompt_tokens ?? 0,
            outputTokens: data.usage?.completion_tokens ?? 0,
            cachedInputTokens: data.usage?.prompt_tokens_details?.cached_tokens ?? 0,
          },
        };
      }
    },
  };
}

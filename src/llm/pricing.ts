// USD per million tokens. Used to enforce the spend caps, so an unknown model throws rather
// than being costed at zero, and prices err high where unsure.
//
// Azure OpenAI rates match an existing production table (gpt-4.1-mini $0.40 / $1.60, the simulated user in evals; gpt-4.1 $2 / $8, the web app's interviewer). Cached
// input is charged at the full input rate: conservative for a cap.
// Claude rates are Anthropic's first-party prices as of 2026-10-06; Haiku 5.5's cache-read
// rate wasn't listed, so it's charged at the full input rate.

export interface Price {
  input: number;
  cachedInput: number;
  output: number;
  /** Multiplier on the input rate for tokens written to the prompt cache (Claude: 1.25). */
  cacheWriteMultiplier?: number;
}

export const PRICES: Record<string, Price> = {
  "gpt-4.1-mini": { input: 0.4, cachedInput: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, cachedInput: 2, output: 8 },
  "claude-opus-5-5": { input: 4, cachedInput: 0.2, output: 20, cacheWriteMultiplier: 1.25 },
  "claude-sonnet-5-5": { input: 2, cachedInput: 0.2, output: 10, cacheWriteMultiplier: 1.25 },
  "claude-haiku-5-5": { input: 0.1, cachedInput: 0.1, output: 0.5, cacheWriteMultiplier: 1.25 },
};

export class UnknownModelError extends Error {}

export function priceOf(model: string): Price {
  const price = PRICES[model];
  if (!price) throw new UnknownModelError(`No price for model "${model}"; add it to src/llm/pricing.ts before using it.`);
  return price;
}

/**
 * Cost of one call. Cache reads and writes are part of inputTokens: reads are charged at the
 * cached rate, writes at the input rate times cacheWriteMultiplier, the rest at the input rate.
 */
export function costUSD(model: string, usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number; cacheWriteTokens?: number }): number {
  const p = priceOf(model);
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const written = Math.min(usage.cacheWriteTokens ?? 0, usage.inputTokens - cached);
  const fresh = usage.inputTokens - cached - written;
  return (fresh * p.input + cached * p.cachedInput + written * p.input * (p.cacheWriteMultiplier ?? 1) + usage.outputTokens * p.output) / 1_000_000;
}

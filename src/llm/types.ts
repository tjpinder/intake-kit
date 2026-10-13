// The provider-neutral contract between the turn loop and an LLM. The turn loop runs in the
// browser; providers run in the server function (or, in the browser, a proxy provider posts
// the same request to it).

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Everything a provider needs for one call. Stable first (system), volatile last (context). */
export interface TurnRequest {
  /** The interviewer's instructions and guide. Identical every turn, so providers can cache it. */
  system: string;
  /** The conversation so far: the user's exact messages and the replies already shown. */
  history: ChatMessage[];
  /** This turn's session state and status, sent after the history as a system message. */
  context: string;
  /** The structured output for this call (interview engine v2: classify_opening, phrase, extract, write-up). Without it, the v1 turn schema. */
  format?: { name: string; schema: object };
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  /** Input tokens served from the provider's prompt cache (included in inputTokens). */
  cachedInputTokens: number;
  /** Input tokens written to the prompt cache (included in inputTokens; Claude bills these at 1.25x). */
  cacheWriteTokens?: number;
}

export interface ProviderResult {
  /** The raw model output: one JSON object, expected to match the turn schema. */
  text: string;
  usage: Usage;
  /** The model that actually answered (may differ from the requested one after a fallback). */
  model: string;
}

export interface Provider {
  readonly name: "azure-openai" | "claude";
  complete(request: TurnRequest, signal?: AbortSignal): Promise<ProviderResult>;
}

export class ProviderError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;
  readonly kind: "http" | "timeout" | "network" | "truncated" | "refused" | "empty" | "config";
  constructor(message: string, opts: { status?: number | null; retryable?: boolean; kind: ProviderError["kind"] }) {
    super(message);
    this.status = opts.status ?? null;
    this.retryable = opts.retryable ?? false;
    this.kind = opts.kind;
  }
}

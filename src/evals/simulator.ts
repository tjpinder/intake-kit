// The simulated user: a second model playing the persona in plain text. It sees the situation and
// voice, never the expected outcome, and answers only what it's asked.

import type { ChatMessage, Usage } from "../llm/types.ts";
import { ProviderError } from "../llm/types.ts";
import { AZURE_API_VERSION, retryDelayMs } from "../llm/azure.ts";
import type { Persona } from "./personas.ts";

export interface Simulator {
  /** The next thing the user says, given the conversation so far (interviewer messages as "assistant"). */
  reply(persona: Persona, conversation: ChatMessage[]): Promise<{ text: string; usage: Usage; model: string }>;
}

export function simulatorPrompt(persona: Persona): string {
  return [
    "You are role-playing a person being interviewed about a work problem. Stay in character the whole time.",
    "",
    `How you talk: ${persona.voice}`,
    "",
    "Your situation (the facts you know):",
    persona.situation.trim(),
    "",
    "Rules:",
    "- Answer only what the interviewer just asked, in your own words. Don't volunteer your whole situation at once.",
    "- Use the facts above. If asked something they don't cover, give a short, plausible answer consistent with your situation, or say you don't know.",
    "- Never mention that you are an AI, a simulation or a persona. Don't use bullet points or headings.",
    "- When the interviewer plays back a summary and asks if it's right: confirm it if it matches your situation, otherwise correct what's wrong in a sentence or two.",
    "- Reply with only what you'd say.",
  ].join("\n");
}

export interface AzureSimulatorConfig {
  endpoint: string;
  deployment: string;
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export function createAzureSimulator(config: AzureSimulatorConfig): Simulator {
  const doFetch = config.fetch ?? fetch;
  const sleep = config.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const url = `${config.endpoint.replace(/\/+$/, "")}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${AZURE_API_VERSION}`;
  return {
    async reply(persona, conversation) {
      // From the simulator's side the roles flip: the interviewer is the "user" it answers.
      const messages = [
        { role: "system", content: simulatorPrompt(persona) },
        ...conversation.map((m) => ({ role: m.role === "assistant" ? "user" : "assistant", content: m.content })),
      ];
      const body = JSON.stringify({ messages, max_completion_tokens: 400, temperature: 0.7 });
      for (let attempt = 0; ; attempt++) {
        const res = await doFetch(url, { method: "POST", headers: { "content-type": "application/json", "api-key": config.apiKey }, body });
        if ((res.status === 429 || res.status === 503) && attempt < 4) {
          await sleep(retryDelayMs(attempt, res.headers.get("retry-after")));
          continue;
        }
        if (!res.ok) throw new ProviderError(`Simulator call failed: ${res.status} ${(await res.text()).slice(0, 200)}`, { kind: "http", status: res.status });
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) throw new ProviderError("Simulator returned an empty message.", { kind: "empty" });
        return {
          text,
          model: config.model,
          usage: { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0, cachedInputTokens: data.usage?.prompt_tokens_details?.cached_tokens ?? 0 },
        };
      }
    },
  };
}

// One user turn in the web app: ask the provider for the next turn, apply it with the same
// rules as the plugin, and retry once with the reasons if it's rejected. Pure apart from the
// provider call, so it runs in the browser (with a provider that proxies to the server).

import { applyTurn, type Rejection } from "../lib/apply-turn.ts";
import type { Framework } from "../lib/framework.ts";
import type { TranscriptEntry } from "../lib/grounding.ts";
import type { Session } from "../lib/session.ts";
import { buildRequest } from "./prompt.ts";
import type { Provider, Usage } from "./types.ts";

export interface TurnInput {
  provider: Provider;
  fw: Framework;
  /** skills/intake/SKILL.md, bundled with the app. */
  skill: string;
  session: Session;
  /** Every user message so far, exactly as typed, including the one just sent. */
  transcript: TranscriptEntry[];
  /** Every reply already shown, one per earlier user message. */
  replies: string[];
  now: () => string;
  signal?: AbortSignal;
}

export interface TurnOutcome {
  session: Session;
  /** What to show the user. Always present, even when the turn couldn't be saved. */
  reply: string;
  /** applied: saved. rejected: rejected twice, nothing saved. invalid: the model never returned usable JSON. */
  result: "applied" | "rejected" | "invalid";
  confirmed: boolean;
  /** Each attempt: usage, the raw model output, and what the checks rejected. */
  attempts: Array<{ usage: Usage; model: string; text: string; rejections: Rejection[]; warnings: string[] }>;
}

export const FALLBACK_REPLY = "Sorry, I lost my train of thought there. Could you say that again in a different way?";

function parseTurn(text: string): { turn: unknown; reply: string | null } {
  try {
    const turn = JSON.parse(text) as { reply?: unknown };
    return { turn, reply: typeof turn?.reply === "string" && turn.reply.trim() ? turn.reply : null };
  } catch (err) {
    return { turn: { __unparseable: (err as Error).message }, reply: null };
  }
}

function feedback(rejections: Rejection[]): string {
  return [
    "The app rejected that turn, so nothing was saved and the user hasn't seen your reply. Fix every problem below and send the whole turn again.",
    ...rejections.map((r) => `- ${r.path}: ${r.reason}`),
  ].join("\n");
}

export async function runTurn(input: TurnInput): Promise<TurnOutcome> {
  const request = buildRequest({ skill: input.skill, fw: input.fw, session: input.session, transcript: input.transcript, replies: input.replies });
  const attempts: TurnOutcome["attempts"] = [];
  let lastReply: string | null = null;
  let parsedEver = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await input.provider.complete(request, input.signal);
    const { turn, reply } = parseTurn(result.text);
    if (reply) lastReply = reply;
    // The first attempt must record the answer to its own last question; the retry may fall back
    // to capturing the user's words.
    const applied = applyTurn(input.session, turn, { fw: input.fw, transcript: input.transcript, now: input.now(), lastReply: input.replies.at(-1) ?? null, capture: attempt > 0 });
    if (reply !== null || !("__unparseable" in (turn as object))) parsedEver = true;
    attempts.push({ usage: result.usage, model: result.model, text: result.text, rejections: applied.rejections, warnings: applied.warnings });

    if (applied.applied) {
      return { session: applied.session, reply: reply!, result: "applied", confirmed: applied.confirmed, attempts };
    }
    // Show the model what it sent and why it failed, then let it try once more. These two
    // messages go only to the model; the transcript stays the user's own words.
    request.history = [...request.history, { role: "assistant", content: result.text }, { role: "user", content: feedback(applied.rejections) }];
  }

  return {
    session: input.session,
    reply: lastReply ?? FALLBACK_REPLY,
    result: parsedEver ? "rejected" : "invalid",
    confirmed: false,
    attempts,
  };
}

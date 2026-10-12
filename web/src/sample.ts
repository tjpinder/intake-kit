// The offline sample: replays the worked example locally, with no API calls. Loaded only when
// someone opens it, because applying turns pulls in the turn and session validators, which a
// live intake never needs in the browser (the server applies live turns).

import { applyTurn } from "../../src/core.ts";
import sample from "../../tests/fixtures/conversations/pick-exception.json";
import { fw } from "./kit.ts";
import type { IntakeState } from "./state.ts";

interface SampleStep {
  user: string;
  turn: unknown;
}

const SAMPLE_STEPS = (sample as { steps: SampleStep[] }).steps.map((s) => ({
  ...s,
  // The recorded conversation started with the plugin's command; a web visitor just types.
  user: s.user.replace(/^\/intake-kit:intake\s+/, ""),
}));

export const SAMPLE_LENGTH = SAMPLE_STEPS.length;

/** The next user message in the sample, or null when it's finished. */
export function nextSampleMessage(state: IntakeState): string | null {
  return SAMPLE_STEPS[state.transcript.length]?.user ?? null;
}

/** Applies the sample's next recorded turn locally, exactly as the server would. */
export function playSampleStep(state: IntakeState, now = new Date()): IntakeState {
  const step = SAMPLE_STEPS[state.transcript.length];
  if (!step) return state;
  const transcript = [...state.transcript, { role: "user" as const, text: step.user, at: now.toISOString() }];
  const result = applyTurn(state.session, step.turn, { fw, transcript, now: new Date(now.getTime() + 1).toISOString() });
  if (!result.applied) throw new Error(`The sample's step ${state.transcript.length + 1} was rejected: ${result.rejections.map((r) => r.reason).join("; ")}`);
  return { ...state, session: result.session, transcript, replies: [...state.replies, (step.turn as { reply: string }).reply] };
}

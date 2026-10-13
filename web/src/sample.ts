// The offline sample: replays the worked example locally, with no API calls. The real interview
// engine runs in the browser; only the model's outputs are recorded (each turn's classification,
// extraction, phrasing and write-up, in call order). Loaded only when someone opens it.

import { runEngineTurn, type Provider } from "../../src/core.ts";
import sample from "../../tests/fixtures/conversations/pick-exception.json";
import { fw } from "./kit.ts";
import type { IntakeState } from "./state.ts";

interface SampleStep {
  user: string;
  model: Array<{ call: string; output: unknown }>;
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

/** A provider that answers each engine call from the recorded outputs. */
function recorded(step: SampleStep): Provider {
  const queue = [...step.model];
  return {
    name: "azure-openai",
    async complete(req) {
      const i = queue.findIndex((m) => m.call === req.format.name);
      if (i < 0) throw new Error(`The sample has no recorded ${req.format.name} for "${step.user}"`);
      return { text: JSON.stringify(queue.splice(i, 1)[0].output), model: "sample", usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 } };
    },
  };
}

/** Runs the sample's next turn through the engine locally, exactly as the server would. */
export async function playSampleStep(state: IntakeState, now = new Date()): Promise<IntakeState> {
  const step = SAMPLE_STEPS[state.transcript.length];
  if (!step) return state;
  const transcript = [...state.transcript, { role: "user" as const, text: step.user, at: now.toISOString() }];
  let tick = 1;
  const out = await runEngineTurn({ provider: recorded(step), fw, session: state.session, transcript, replies: state.replies, now: () => new Date(now.getTime() + tick++).toISOString() });
  if (out.result !== "applied") throw new Error(`The sample's step ${state.transcript.length + 1} didn't apply`);
  return { ...state, session: out.session, transcript, replies: [...state.replies, out.reply] };
}

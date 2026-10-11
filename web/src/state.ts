// The intake's state in the browser, and the offline sample. Everything a conversation needs
// lives here and in localStorage on this device; the server keeps none of it.

import { applyTurn, type Session, type TranscriptEntry } from "../../src/core.ts";
import sample from "../../tests/fixtures/conversations/pick-exception.json";
import { fw, newSession } from "./kit.ts";

export interface IntakeState {
  session: Session;
  /** Every user message, exactly as typed (and as stamped by the server). */
  transcript: TranscriptEntry[];
  /** One reply per user message, as shown. */
  replies: string[];
  /** "sample" replays the worked example locally, with no API calls. */
  mode: "live" | "sample";
}

const STORAGE_KEY = "intake-kit:intake";

export function freshState(mode: IntakeState["mode"], provider: "kit" | "azure" | "claude" = "kit"): IntakeState {
  return { session: newSession(provider), transcript: [], replies: [], mode };
}

export function saveState(state: IntakeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable (private mode, quota); the intake still works this visit */
  }
}

export function loadState(): IntakeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as IntakeState;
    if (!state?.session || !Array.isArray(state.transcript) || !Array.isArray(state.replies)) return null;
    // A replay can't resume half-way, so a saved sample is never restored; a real intake is.
    return state.mode === "sample" ? null : state;
  } catch {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

export const isComplete = (state: IntakeState) => state.session.session.reflect_back?.confirmed === true;

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

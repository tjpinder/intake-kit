// The intake's state in the browser. Everything a conversation needs lives here and in
// localStorage on this device; the server keeps none of it. The offline sample is in sample.ts.

import type { Session, TranscriptEntry } from "../../src/core.ts";
import type { TurnDebug } from "./api.ts";
import { newSession } from "./kit.ts";

export interface IntakeState {
  session: Session;
  /** Every user message, exactly as typed (and as stamped by the server). */
  transcript: TranscriptEntry[];
  /** One reply per user message, as shown. */
  replies: string[];
  /** "sample" replays the worked example locally, with no API calls. */
  mode: "live" | "sample";
  /** Per turn: the model's raw output, rejections and warnings, for the downloadable debug log. */
  debug?: TurnDebug[];
  /** Async intake: the triage form is open (no session yet). */
  setup?: "async";
  /** Async intake: the Don't-build reasons the last summary asked to confirm, one by one. */
  confirm?: Array<{ key: string; question: string }> | null;
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

/** Everything needed to explain an intake afterwards, as one JSON file. Stays on this device until downloaded. */
export function debugLog(state: IntakeState): string {
  return JSON.stringify({ exported_at: new Date().toISOString(), session: state.session, transcript: state.transcript, replies: state.replies, turns: state.debug ?? [] }, null, 2);
}

export const isComplete = (state: IntakeState) => state.session.session.reflect_back?.confirmed === true;
export const isAsync = (state: IntakeState) => state.session.session.channel === "async";

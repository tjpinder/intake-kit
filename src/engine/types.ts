// Interview engine v2: code runs the interview. The model only phrases one question at a time
// and classifies one reply at a time (HANDOFF.md, "Interview engine v2"). These types mirror
// schema/v2/*.schema.json (the model's output) and the session file's `session.engine` block.

import type { ItemType, Modifier } from "../lib/framework.ts";

export type Phase = "opening" | "interview" | "summary" | "confirmed";
export type PendingKind = "ask" | "probe" | "confirm" | "check" | "disambiguate" | "summary";
export type CheckName = "manual_work" | "existing_asset" | "kill_criteria";
export type CheckResult = "yes" | "no" | "unclear";

/** The one question waiting for the user's reply. */
export interface Pending {
  item: string | null;
  /** A coverage ID; for a check or the summary, the area it rides on. */
  area: string;
  kind: PendingKind;
  check: CheckName | null;
  question: string;
}

export interface AreaState {
  /** The one probe has been asked (it counts when asked, not when answered). */
  probed: boolean;
  /** The one confirmation of an assumed critical answer. */
  confirm: "none" | "asked" | "done";
  /** A partial or off-topic first answer, kept until the probe resolves it. */
  partial: { value: string | null; quote: string | null } | null;
}

export interface EngineState {
  version: 2;
  phase: Phase;
  /** User replies used, against the turn budget. */
  turns: number;
  pending: Pending | null;
  /** Keyed like session.asked: "core.users" or "item-1:known_idea.push". */
  areas: Record<string, AreaState>;
  /** Keyed "<item>:<check>". */
  checks: Record<string, { asks: number; result: CheckResult | null; quote?: string | null; value?: string | null }>;
  /** The opening's one disambiguating probe has been asked. */
  disambiguated: boolean;
  /** Replies to the summary that weren't a plain yes (corrections, or a no). */
  summary_rounds?: number;
}

/** classify_opening (schema/v2/opening.schema.json). */
export interface OpeningResult {
  type: ItemType;
  confidence: "high" | "med" | "low";
  title: string;
  trigger_quote: string;
  modifiers: Array<{ modifier: Modifier; quote: string }>;
  also_answers: Array<{ area: string; value: string; quote: string }>;
}

/** extract (schema/v2/extract.schema.json). */
export interface Extraction {
  status: "answered" | "partial" | "not_applicable" | "declined" | "off_topic";
  value: string | null;
  quote: string | null;
  check: CheckResult | "none";
  wrap_up: boolean;
  also_answers: Array<{ area: string; value: string; quote: string }>;
}

export const TURN_BUDGET = 30;
export const SEND_AGAIN = "Sorry, I couldn't take that in. Could you send it again?";

export function newEngine(): EngineState {
  return { version: 2, phase: "opening", turns: 0, pending: null, areas: {}, checks: {}, disambiguated: false };
}

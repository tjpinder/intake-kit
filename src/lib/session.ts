// Types for the session file (intake-answers.yaml). schema/session.schema.json is the
// authority; these mirror it for the code that reads and writes it.

import type { ItemType, Modifier } from "./framework.ts";

export type Status = "covered" | "assumed" | "unknown" | "not_applicable";
export type Quadrant = "prioritize" | "review" | "defer";
export type GateDecision = "go" | "gather_more" | "dont_build" | "fix_not_build";
export type CheckResult = "pass" | "fail" | "unknown";

export interface CoverageEntry {
  status: Status;
  value: string | null;
  quotes: string[];
  probe_count: number;
  updated_at?: string;
  /**
   * "captured": the user's reply stored word for word because the interviewer didn't record
   * the answer to its own question. Shown to the user to confirm, never used as scoring evidence.
   */
  source?: "captured";
}

export const isCaptured = (e: CoverageEntry | undefined): boolean => e?.source === "captured";

/** The key an area is stamped under in session.asked. */
export const askedKey = (item: string | null, area: string): string | null => (area.startsWith("core.") ? area : item ? `${item}:${area}` : null);

/**
 * Whether an area counts as asked for an item: stamped as asked, or answered in full (covered
 * or not applicable, in the interviewer's own record). Without stamps (older sessions), anything
 * recorded counts.
 */
export function wasAsked(session: Session, item: Item | null, area: string): boolean {
  const entry = area.startsWith("core.")
    ? ((item?.core_overrides[area.slice(5)]) ?? session.core[area.slice(5) as keyof Session["core"]])
    : item?.coverage[area];
  const asked = session.session.asked;
  if (!asked) return !!entry?.updated_at;
  const key = askedKey(item?.id ?? null, area);
  if (key && asked[key]) return true;
  return !!entry?.updated_at && !isCaptured(entry) && (entry.status === "covered" || entry.status === "not_applicable");
}

export interface FactEntry {
  band: string;
  evidence: string[];
  quotes: string[];
}

export interface CriterionScore {
  score: number | null;
  band: string;
  evidence: string[];
}

export interface Scoring {
  criteria: Record<string, CriterionScore>;
  automation_potential: number | null;
  ease: number | null;
  quadrant: Quadrant | null;
  ai_overlay: { applies: boolean; checks: Record<string, CheckResult> };
  adoption: Record<"push" | "pull" | "anxiety" | "habit", string> | null;
  rules_version: string;
}

export interface Gate {
  decision: GateDecision;
  reasons: string[];
  revisit_trigger: string | null;
  rules_version: string;
}

export interface Acceptance {
  kind: "criterion" | "error_case";
  given: string;
  when: string;
  then: string;
  evidence: string[];
}

export interface Guardrail {
  kind: "kill_criterion" | "fallback" | "review_point" | "data_rule";
  text: string;
  evidence: string[];
}

export interface Item {
  id: string;
  title: string;
  type: ItemType;
  confidence: "high" | "med" | "low";
  trigger_quote: string;
  modifiers: Modifier[];
  spawned_from: string | null;
  superseded_by: string | null;
  /** Set when the item turned out not to apply. Not the same as being replaced by another item. */
  dropped?: { reason: string; quote: string; at: string };
  /** Modifiers taken back (router.remove_modifiers), so their hints don't come back. */
  modifiers_removed?: Modifier[];
  type_history: Array<{ from: ItemType | null; to: ItemType; reason: string; quote: string; at: string }>;
  core_overrides: Record<string, CoverageEntry>;
  coverage: Record<string, CoverageEntry>;
  facts: Record<string, FactEntry>;
  prose: Partial<Record<"problem_statement" | "current_state" | "mvp" | "out_of_scope" | "mitigation", string>>;
  acceptance: Acceptance[];
  guardrails: Guardrail[];
  scoring: Scoring | null;
  gate: Gate | null;
  open_questions: Array<{ area: string; question: string; who_can_answer: string | null; artifact_needed: string | null }>;
}

export interface Session {
  schema_version: 1;
  framework_version: string;
  session: {
    id: string;
    started_at: string;
    mode: "stakeholder" | "builder";
    provider: "claude" | "azure-openai" | "openai" | "codex";
    grounding: "transcript" | "unverified";
    reflect_back: { text: string; confirmed: boolean; corrections: string[]; proposed_at?: string } | null;
    /**
     * The area the last applied turn asked about and the reply that asked it, so an answer the
     * model fails to record can be captured, but only if that reply is the one the user saw.
     */
    last_target?: { item: string | null; area: string; reply?: string } | null;
    /**
     * When each area was first asked about, stamped by code from each applied turn's
     * chosen question area: "core.users" for shared areas, "item-1:known_idea.push" for an item's own.
     * Readiness counts an area as asked only if it was asked, or answered in full; an inference
     * from the opening or an unknown marked before asking doesn't count. Sessions started
     * before this existed don't have it and fall back to "anything recorded".
     */
    asked?: Record<string, string>;
  };
  core: Record<"users" | "outcome" | "data" | "systems" | "constraints" | "trust", CoverageEntry>;
  items: Item[];
}

/** The coverage entry that applies to an item: its override for a core area, else the shared one. */
export function coverageFor(session: Session, item: Item, areaId: string): CoverageEntry | undefined {
  if (areaId.startsWith("core.")) {
    const area = areaId.slice(5);
    return item.core_overrides[area] ?? session.core[area as keyof Session["core"]];
  }
  return item.coverage[areaId];
}

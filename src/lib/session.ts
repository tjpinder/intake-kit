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

export interface Item {
  id: string;
  title: string;
  type: ItemType;
  confidence: "high" | "med" | "low";
  trigger_quote: string;
  modifiers: Modifier[];
  spawned_from: string | null;
  superseded_by: string | null;
  type_history: Array<{ from: ItemType | null; to: ItemType; reason: string; quote: string; at: string }>;
  core_overrides: Record<string, CoverageEntry>;
  coverage: Record<string, CoverageEntry>;
  facts: Record<string, FactEntry>;
  prose: Partial<Record<"problem_statement" | "current_state" | "mvp" | "out_of_scope" | "mitigation", string>>;
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

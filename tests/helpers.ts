// Builders for scoring and gate tests. Items are described by their band picks; everything
// else defaults to a clean, Go-ready state so each test changes only what it's about.

import type { CoverageEntry, Item, Session } from "../src/lib/session.ts";
import type { ItemType, Modifier } from "../src/lib/framework.ts";

export const covered = (value = "answered"): CoverageEntry => ({ status: "covered", value, quotes: [value], probe_count: 0 });
export const unknown = (): CoverageEntry => ({ status: "unknown", value: null, quotes: [], probe_count: 1 });
export const assumed = (value = "probably"): CoverageEntry => ({ status: "assumed", value, quotes: [value], probe_count: 1 });

/** Band picks that put an item in Prioritize with a measurable metric. */
export const GO_FACTS: Record<string, string> = {
  rule_clarity: "written", input_digital: "fully", input_structured: "80+", ways_done: "one",
  stability: "none", documentation: "sop_and_examples", steps_apps: "under_20", access: "api_or_db",
  value: "high", ai_applies: "no", existing_asset: "none", decision_depends: "yes", success_metric: "measurable_with_baseline",
};

/** Critical module areas per type, covered, so a default item has no critical gaps. */
const CRITICAL_COVERAGE: Record<ItemType, string[]> = {
  broken: ["broken.symptom", "broken.cause"],
  manual_process: ["manual_process.walkthrough"],
  known_idea: ["known_idea.current"],
  exploratory: ["exploratory.instances"],
  data_report: ["data_report.decision", "data_report.definition"],
};

export interface ItemOptions {
  type?: ItemType;
  facts?: Record<string, string>;
  /** Replace GO_FACTS entirely instead of overriding it. */
  onlyFacts?: boolean;
  coverage?: Record<string, CoverageEntry>;
  modifiers?: Modifier[];
  superseded_by?: string | null;
  mitigation?: string;
  core_overrides?: Item["core_overrides"];
}

export function makeItem(id: string, opts: ItemOptions = {}): Item {
  const type = opts.type ?? "data_report";
  const bands = opts.onlyFacts ? (opts.facts ?? {}) : { ...GO_FACTS, ...opts.facts };
  const coverage: Record<string, CoverageEntry> = {};
  for (const area of CRITICAL_COVERAGE[type]) coverage[area] = covered();
  Object.assign(coverage, opts.coverage);
  return {
    id,
    title: `Item ${id}`,
    type,
    confidence: "high",
    trigger_quote: "trigger",
    modifiers: opts.modifiers ?? [],
    spawned_from: null,
    superseded_by: opts.superseded_by ?? null,
    type_history: [{ from: null, to: type, reason: "opening", quote: "trigger", at: "2026-10-10T10:00:00-04:00" }],
    core_overrides: opts.core_overrides ?? {},
    coverage,
    facts: Object.fromEntries(Object.entries(bands).map(([fact, band]) => [fact, { band, evidence: [], quotes: [] }])),
    prose: opts.mitigation ? { mitigation: opts.mitigation } : {},
    acceptance: [],
    guardrails: [],
    scoring: null,
    gate: null,
    open_questions: [],
  };
}

export function makeSession(items: Item[], opts: { confirmed?: boolean | null; core?: Partial<Session["core"]> } = {}): Session {
  const confirmed = opts.confirmed === undefined ? true : opts.confirmed;
  return {
    schema_version: 1,
    framework_version: "0.1.0",
    session: {
      id: "2026-10-10-abcd",
      started_at: "2026-10-10T10:00:00-04:00",
      mode: "stakeholder",
      provider: "claude",
      grounding: "transcript",
      reflect_back: confirmed === null ? null : { text: "Here's what I heard.", confirmed, corrections: [] },
    },
    core: {
      users: covered(), outcome: covered(), data: covered(), systems: covered(), constraints: covered(), trust: covered(),
      ...opts.core,
    },
    items,
  };
}

// What the interviewing model needs, generated from the framework YAML so the skill never
// carries its own copy: guide() is injected once when the skill starts; statusOf() comes back
// after every applied turn so the model always knows what's still open.

import type { Area, Framework, ItemType } from "./framework.ts";
import { criticalAreas } from "./gates.ts";
import { normalize, type TranscriptEntry } from "./grounding.ts";
import { hasNumber, scoreItem, scoringView } from "./score.ts";
import { coverageFor, isCaptured, wasAsked, type Item, type Session } from "./session.ts";

const list = (xs: string[]) => xs.map((x) => `"${x}"`).join(", ");

function areaBlock(a: Area): string {
  const flags = [a.critical ? "critical" : "", a.always_ask ? "always ask" : ""].filter(Boolean).join(", ");
  const lines = [`- \`${a.id}\`${flags ? ` (${flags})` : ""}: ${a.must_capture}`, `  - Ask: ${a.probes.map((p) => `"${p}"`).join(" · ")}`];
  for (const f of a.followup_conditions) lines.push(`  - Follow up only when ${f.when}: "${f.ask}"${f.spawns ? ` (spawns a new ${f.spawns === "item" ? "" : `${f.spawns} `}item)` : ""}`);
  if (a.stop_at) lines.push(`  - Stop at: ${a.stop_at}`);
  return lines.join("\n");
}

export function guide(fw: Framework): string {
  const { router, modules, scoring } = fw;
  const out: string[] = [];

  out.push("## Entry types", "", "Classify each distinct pain into one type. Record the user's words that triggered it.", "");
  for (const [type, t] of Object.entries(router.types)) {
    out.push(`- **${type}** (${t.label}). Signals: ${list(t.signals)}. If unsure, ask: "${t.low_confidence_probe}"`);
  }
  out.push("", "## Modifiers", "", "Add to any item when you hear these; each adds its own areas.", "");
  for (const [mod, m] of Object.entries(router.modifiers)) {
    const effect = m.effects?.risk_tier ? " Sets risk tier high." : m.effects?.gate ? " Routes the item to more discovery." : "";
    out.push(`- **${mod}** (${m.label}). Signals: ${list(m.signals)}.${effect}`);
  }
  out.push("", `Reclassify an item when ${router.rules.reclassify_min_signals} or more new signals point to another type, or the story contradicts the label. Shared-core answers carry over.`);

  out.push("", "## Shared core (once per session; use item: null)", "");
  for (const a of modules.core.areas) out.push(areaBlock(a));
  for (const type of Object.keys(router.types) as ItemType[]) {
    const m = modules[type];
    out.push("", `## ${type} areas`, "");
    for (const key of ["step_tags", "candidates", "self_serve_rule"] as const) {
      if (m[key]) out.push(`${key.replace("_", " ")}: ${Array.isArray(m[key]) ? (m[key] as string[]).join(", ") : m[key]}`, "");
    }
    for (const a of m.areas) out.push(areaBlock(a));
  }
  for (const mod of Object.keys(router.modifiers)) {
    out.push("", `## mod.${mod} areas`, "");
    for (const a of modules[`mod.${mod}`].areas) out.push(areaBlock(a));
  }

  out.push("", "## Facts: pick a band, never a number", "", "Use only these band names. Infer each from the answers it usually comes from; use `unknown` only when nothing the user said bears on it.", "");
  for (const [name, c] of Object.entries(scoring.criteria)) {
    out.push(`- \`${name}\` (${c.label}): ${Object.entries(c.describe).map(([b, d]) => `\`${b}\` = ${d}`).join("; ")}; \`unknown\`. Usually from: ${c.usually_from.join(", ")}`);
  }
  out.push(`- \`${scoring.ai_overlay.applies_fact}\`: ${Object.keys(scoring.ai_overlay.applies_bands).map((b) => `\`${b}\``).join(", ")}. "yes" only when the proposed solution uses an LLM.`);
  out.push("", "AI overlay checks, only when ai_applies is yes. Each is `pass`, `fail` or `unknown`:", "");
  for (const [name, c] of Object.entries(scoring.ai_overlay.checks)) out.push(`- \`${name}\` (${c.label}): passes when ${c.passes_when}`);
  const forceSources = Object.entries(scoring.adoption.usually_from ?? {}).map(([f, ids]) => `\`${f}\` from ${ids.join(", ")}`);
  out.push("", `Adoption forces, for ${scoring.adoption.applies_to.join(" and ")} items: ${scoring.adoption.forces.map((f) => `\`${f}\``).join(", ")}, each ${scoring.adoption.bands.map((b) => `\`${b}\``).join(", ")}.${forceSources.length ? ` Usually from: ${forceSources.join("; ")}.` : ""}`);
  out.push("", "Gate facts:", "");
  for (const [name, bands] of Object.entries(scoring.gate_facts)) {
    const note = scoring.gate_fact_notes?.[name];
    out.push(`- \`${name}\`: ${bands.map((b) => `\`${b}\``).join(", ")}${note ? `. ${note}` : ""}`);
  }
  return out.join("\n") + "\n";
}

/** The facts an item needs a band for (unknown counts) before it can be scored fairly. */
export function factsFor(item: Item, fw: Framework): string[] {
  const s = fw.scoring;
  const facts = [...Object.keys(s.criteria), s.ai_overlay.applies_fact, "success_metric", "existing_asset", "decision_depends"];
  if (item.type === "broken") facts.push("broken_cause", "workaround_permanent");
  if (s.adoption.applies_to.includes(item.type)) facts.push(...s.adoption.forces);
  if (item.facts[s.ai_overlay.applies_fact]?.band === "yes") facts.push(...Object.keys(s.ai_overlay.checks));
  return facts;
}

export interface ItemStatus {
  id: string;
  title: string;
  type: ItemType;
  modifiers: string[];
  superseded_by: string | null;
  /** Dropped: the user said it doesn't apply. Needs nothing more. */
  dropped: boolean;
  /** Spawned from another item (an exploratory example, or a workaround): gets a light pass, not a full interview. */
  light_pass: boolean;
  /** Once every band is picked, the quadrant this item would score in. */
  preview_quadrant: string | null;
  has_mitigation: boolean;
  /** Areas for this item's type and modifiers never asked about. */
  unasked: string[];
  /** Always-ask areas not yet asked. */
  always_ask_pending: string[];
  /**
   * For items scored on their own: an area to ask for each scored band that has no answered
   * source yet. Without one, the honest band is unknown and the composite can't be scored (the
   * ops persona never reached Go because core.systems, the source of three ease bands, was never asked).
   */
  band_sources_unasked: string[];
  /** Critical areas not yet asked. Asked means the interviewer asked it, or recorded a full answer. */
  critical_unasked: string[];
  /** Critical areas that still need their one follow-up (the areas in follow_ups). */
  critical_unprobed: string[];
  /** Each critical area's pending follow-up: answered vaguely, asked but nothing recorded, or an outcome with no number for today. */
  follow_ups: Array<{ area: string; why: "vague" | "unanswered" | "no_baseline" }>;
  /** Answered vaguely (assumed or unknown) with their one probe still unused. */
  probe_available: string[];
  facts_missing: string[];
  /** Acceptance lines captured so far. Items that may be built need at least one of each. */
  acceptance: { criteria: number; error_cases: number };
  /** Guardrail statements captured so far. Items that may be built need a kill criterion and a fallback. */
  guardrails: { kill_criterion: number; fallback: number; review_point: number; data_rule: number };
}

export interface Status {
  reflect_back: "none" | "proposed" | "confirmed";
  core: Array<{ area: string; status: string; asked: boolean; probe_available: boolean }>;
  items: ItemStatus[];
  /** Every critical and always-ask area has been asked about. */
  interview_complete: boolean;
  ready_for_reflect_back: boolean;
}

/** Items that could be built need acceptance criteria and guardrails; superseded and exploratory ones don't. */
function needsAcceptance(i: ItemStatus): boolean {
  return i.superseded_by == null && !i.dropped && i.type !== "exploratory" && !i.light_pass;
}

/** For each scored band with no answered source area that applies to the item, the first applicable source. */
function bandSourcesUnasked(item: Item, fw: Framework, asked: (id: string) => boolean): string[] {
  const modules = new Set([item.type, ...item.modifiers.map((m) => `mod.${m}`)]);
  const applies = (id: string) => id.startsWith("core.") || modules.has(id.startsWith("mod.") ? id.split(".").slice(0, 2).join(".") : id.split(".")[0]);
  const out = new Set<string>();
  for (const c of Object.values(fw.scoring.criteria)) {
    const sources = c.usually_from.filter(applies);
    if (sources.length && !sources.some(asked)) out.add(sources[0]);
  }
  return [...out];
}

/** Items scored on their own need band picks; superseded, light-pass and exploratory ones don't. */
function needsBands(i: ItemStatus): boolean {
  return i.superseded_by == null && !i.dropped && !i.light_pass && i.type !== "exploratory";
}

/** Literal signal phrases ("by hand", "EDI"); descriptive ones like "a metric noun" can't be matched. */
/** Whether a literal signal phrase appears in normalized text, not negated. */
export function said(signal: string, text: string): boolean {
  if (/^an? /.test(signal)) return false;
  const esc = normalize(signal).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9])${esc}(?=[^a-z0-9]|$)`, "g");
  // A negated mention doesn't count: "no database, no API and no network" isn't an integration
  // (found in the first live test). Negated means a no, not or without in the five words before ("no database or external API").
  for (const m of text.matchAll(re)) {
    const before = text.slice(0, m.index + m[1].length).split(/[.;:!?\n]/).pop()!.trim().split(/[\s,]+/).slice(-5);
    if (!before.some((w) => NEGATION.test(w))) return true;
  }
  return false;
}

const NEGATION = /^(no|not|without|never|nor|none|nothing|nobody|isn't|aren't|don't|doesn't|didn't|isnt|arent|dont|doesnt|didnt)$/;

export function statusOf(session: Session, fw: Framework, transcript: TranscriptEntry[] = []): Status {
  const rb = session.session.reflect_back;
  const core = Object.entries(session.core).map(([key, e]) => ({
    area: `core.${key}`,
    status: e.status,
    asked: wasAsked(session, null, `core.${key}`),
    probe_available: !!e.updated_at && (e.status === "assumed" || e.status === "unknown") && e.probe_count === 0,
  }));

  const last = session.session.last_target;
  const items = session.items.map((item): ItemStatus => {
    const modules = [item.type, ...item.modifiers.map((m) => `mod.${m}`)];
    const areas = modules.flatMap((m) => fw.modules[m]?.areas ?? []);
    const asked = (id: string) => wasAsked(session, item, id);
    // Shared core areas this type always asks (known ideas: constraints), on top of its own always-ask areas.
    const asksCore = modules.flatMap((m) => (fw.modules[m]?.asks_core as string[] | undefined) ?? []);
    const critical = criticalAreas(item, fw);
    const follow: ItemStatus["follow_ups"] = [];
    for (const id of critical) {
      if (!asked(id)) continue;
      const e = coverageFor(session, item, id);
      const justAsked = !!last && last.area === id && (id.startsWith("core.") || last.item === item.id);
      if (!e?.updated_at) { if (!justAsked) follow.push({ area: id, why: "unanswered" }); continue; }
      if (e.probe_count > 0) continue;
      // Persona 1 and 7: a success measure with no number for today can't be a baseline, so the
      // outcome gets the framework's cost follow-up before the write-up.
      if (id === "core.outcome" && !isCaptured(e) && e.quotes.length > 0 && !e.quotes.some(hasNumber)) follow.push({ area: id, why: "no_baseline" });
      else if (e.status === "assumed") follow.push({ area: id, why: "vague" });
    }
    const probeable = areas
      .map((a) => [a.id, item.coverage[a.id]] as const)
      .filter(([, e]) => e?.updated_at && (e.status === "assumed" || e.status === "unknown") && e.probe_count === 0)
      .map(([id]) => id);
    // A spawned item gets a light pass; a dropped one needs nothing more at all.
    const light = item.spawned_from != null || !!item.dropped;
    const factsMissing = factsFor(item, fw).filter((f) => !item.facts[f]);
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      modifiers: item.modifiers,
      superseded_by: item.superseded_by,
      dropped: !!item.dropped,
      light_pass: item.spawned_from != null,
      preview_quadrant: factsMissing.length === 0 ? scoreItem(scoringView(session, item), fw).quadrant ?? null : null,
      has_mitigation: !!item.prose.mitigation,
      unasked: areas.filter((a) => !asked(a.id)).map((a) => a.id),
      always_ask_pending: light ? [] : [...areas.filter((a) => a.always_ask).map((a) => a.id), ...asksCore].filter((id) => !asked(id)),
      critical_unasked: light ? [] : critical.filter((id) => !asked(id)),
      critical_unprobed: light ? [] : follow.map((f) => f.area),
      follow_ups: light ? [] : follow,
      band_sources_unasked: light || item.superseded_by || item.type === "exploratory" ? [] : bandSourcesUnasked(item, fw, asked),
      probe_available: probeable,
      facts_missing: factsMissing,
      acceptance: {
        criteria: item.acceptance.filter((a) => a.kind === "criterion").length,
        error_cases: item.acceptance.filter((a) => a.kind === "error_case").length,
      },
      guardrails: {
        kill_criterion: item.guardrails.filter((g) => g.kind === "kill_criterion").length,
        fallback: item.guardrails.filter((g) => g.kind === "fallback").length,
        review_point: item.guardrails.filter((g) => g.kind === "review_point").length,
        data_rule: item.guardrails.filter((g) => g.kind === "data_rule").length,
      },
    };
  });

  const interviewed = (i: ItemStatus) => i.critical_unasked.length === 0 && i.critical_unprobed.length === 0 && i.always_ask_pending.length === 0 && i.band_sources_unasked.length === 0;
  const interviewComplete = items.length > 0 && items.every(interviewed);
  // A superseded item needs no band picks: if its replacement doesn't reach Go, it's gated on
  // its unknowns, which honestly lands it in Gather more.
  const writeUpComplete = items.every(
    (i) =>
      (!needsBands(i) || i.facts_missing.length === 0) &&
      (!needsAcceptance(i) || (i.acceptance.criteria > 0 && i.acceptance.error_cases > 0 && i.guardrails.kill_criterion > 0 && i.guardrails.fallback > 0)),
  );
  const reflect = !rb ? "none" : rb.confirmed ? "confirmed" : "proposed";
  return {
    reflect_back: reflect,
    core,
    items,
    interview_complete: interviewComplete,
    ready_for_reflect_back: interviewComplete && writeUpComplete,
  };
}

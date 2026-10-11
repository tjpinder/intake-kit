// What the interviewing model needs, generated from the framework YAML so the skill never
// carries its own copy: guide() is injected once when the skill starts; statusOf() comes back
// after every applied turn so the model always knows what's still open.

import type { Area, Framework, ItemType } from "./framework.ts";
import { criticalAreas } from "./gates.ts";
import type { Item, Session } from "./session.ts";

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

  out.push("", "## Facts: pick a band, never a number", "", "Use only these band names. Use `unknown` when the user hasn't said.", "");
  for (const [name, c] of Object.entries(scoring.criteria)) {
    out.push(`- \`${name}\` (${c.label}): ${Object.entries(c.describe).map(([b, d]) => `\`${b}\` = ${d}`).join("; ")}; \`unknown\``);
  }
  out.push(`- \`${scoring.ai_overlay.applies_fact}\`: ${Object.keys(scoring.ai_overlay.applies_bands).map((b) => `\`${b}\``).join(", ")}. "yes" only when the proposed solution uses an LLM.`);
  out.push("", "AI overlay checks, only when ai_applies is yes. Each is `pass`, `fail` or `unknown`:", "");
  for (const [name, c] of Object.entries(scoring.ai_overlay.checks)) out.push(`- \`${name}\` (${c.label}): passes when ${c.passes_when}`);
  out.push("", `Adoption forces, for ${scoring.adoption.applies_to.join(" and ")} items: ${scoring.adoption.forces.map((f) => `\`${f}\``).join(", ")}, each ${scoring.adoption.bands.map((b) => `\`${b}\``).join(", ")}.`);
  out.push("", "Gate facts:", "");
  for (const [name, bands] of Object.entries(scoring.gate_facts)) out.push(`- \`${name}\`: ${bands.map((b) => `\`${b}\``).join(", ")}`);
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
  /** Areas for this item's type and modifiers never asked about. */
  unasked: string[];
  /** Always-ask areas not yet asked. */
  always_ask_pending: string[];
  /** Critical areas not yet asked. */
  critical_unasked: string[];
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
  /** What the interviewer should do next, in plain words. */
  next_step: string;
}

/** Items that could be built need acceptance criteria and guardrails; superseded and exploratory ones don't. */
function needsAcceptance(i: ItemStatus): boolean {
  return i.superseded_by == null && i.type !== "exploratory";
}

export function statusOf(session: Session, fw: Framework): Status {
  const rb = session.session.reflect_back;
  const core = Object.entries(session.core).map(([key, e]) => ({
    area: `core.${key}`,
    status: e.status,
    asked: !!e.updated_at,
    probe_available: !!e.updated_at && (e.status === "assumed" || e.status === "unknown") && e.probe_count === 0,
  }));

  const items = session.items.map((item): ItemStatus => {
    const modules = [item.type, ...item.modifiers.map((m) => `mod.${m}`)];
    const areas = modules.flatMap((m) => fw.modules[m]?.areas ?? []);
    const asked = (id: string) => (id.startsWith("core.") ? !!(item.core_overrides[id.slice(5)] ?? session.core[id.slice(5) as keyof Session["core"]])?.updated_at : !!item.coverage[id]?.updated_at);
    const probeable = areas
      .map((a) => [a.id, item.coverage[a.id]] as const)
      .filter(([, e]) => e?.updated_at && (e.status === "assumed" || e.status === "unknown") && e.probe_count === 0)
      .map(([id]) => id);
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      modifiers: item.modifiers,
      superseded_by: item.superseded_by,
      unasked: areas.filter((a) => !asked(a.id)).map((a) => a.id),
      always_ask_pending: areas.filter((a) => a.always_ask && !asked(a.id)).map((a) => a.id),
      critical_unasked: criticalAreas(item, fw).filter((id) => !asked(id)),
      probe_available: probeable,
      facts_missing: factsFor(item, fw).filter((f) => !item.facts[f]),
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

  const interviewComplete = items.length > 0 && items.every((i) => i.critical_unasked.length === 0 && i.always_ask_pending.length === 0);
  // A superseded item needs no band picks: if its replacement doesn't reach Go, it's gated on
  // its unknowns, which honestly lands it in Gather more.
  const writeUpComplete = items.every(
    (i) =>
      (i.superseded_by != null || i.facts_missing.length === 0) &&
      (!needsAcceptance(i) || (i.acceptance.criteria > 0 && i.acceptance.error_cases > 0 && i.guardrails.kill_criterion > 0 && i.guardrails.fallback > 0)),
  );
  const reflect = !rb ? "none" : rb.confirmed ? "confirmed" : "proposed";
  return {
    reflect_back: reflect,
    core,
    items,
    interview_complete: interviewComplete,
    ready_for_reflect_back: interviewComplete && writeUpComplete,
    next_step: nextStep(reflect, interviewComplete, items),
  };
}

/**
 * One plain instruction for the interviewer, computed from the status. Band picks, acceptance
 * criteria and guardrails are written from what was already said, never asked for directly:
 * once every needed area has been asked, the next step is to write them up and play back.
 */
function nextStep(reflect: Status["reflect_back"], interviewComplete: boolean, items: ItemStatus[]): string {
  if (reflect === "confirmed") return "The intake is complete. Thank the user briefly.";
  if (reflect === "proposed") return "You've played back a summary. Record whether the user confirmed it or what they corrected.";
  if (items.length === 0) return "Create the first item from the user's opening statement and ask your first question.";
  if (!interviewComplete) {
    const open = items.flatMap((i) => [...i.critical_unasked, ...i.always_ask_pending]);
    return `Keep interviewing. Still to ask (in whatever order follows the conversation): ${[...new Set(open)].join(", ")}. Record every answer the user gives as you go.`;
  }
  return [
    "Every needed area has been asked, so stop asking questions now. In this one turn:",
    "add a band for every fact listed in each item's facts_missing, picked from what the user already said (use `unknown` where they didn't say), in `facts` only, never in `updates`; a band's quote is optional, so leave it null unless you copy the user's exact words;",
    "write acceptance criteria (at least one criterion and one error case) and guardrails (at least a kill criterion and a fallback) for each item that might be built, from what you heard;",
    "and propose the reflect-back.",
  ].join(" ");
}

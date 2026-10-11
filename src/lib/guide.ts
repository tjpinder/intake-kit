// What the interviewing model needs, generated from the framework YAML so the skill never
// carries its own copy: guide() is injected once when the skill starts; statusOf() comes back
// after every applied turn so the model always knows what's still open.

import type { Area, Framework, ItemType } from "./framework.ts";
import { criticalAreas } from "./gates.ts";
import { normalize, type TranscriptEntry } from "./grounding.ts";
import { scoreItem } from "./score.ts";
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

  out.push("", "## Facts: pick a band, never a number", "", "Use only these band names. Infer each from the answers it usually comes from; use `unknown` only when nothing the user said bears on it.", "");
  for (const [name, c] of Object.entries(scoring.criteria)) {
    out.push(`- \`${name}\` (${c.label}): ${Object.entries(c.describe).map(([b, d]) => `\`${b}\` = ${d}`).join("; ")}; \`unknown\`. Usually from: ${c.usually_from.join(", ")}`);
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
  /** Spawned from another item (an exploratory example, or a workaround): gets a light pass, not a full interview. */
  light_pass: boolean;
  /** Once every band is picked, the quadrant this item would score in. */
  preview_quadrant: string | null;
  has_mitigation: boolean;
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
  /** Things in the user's own words the items don't reflect yet (from the router's signal phrases). */
  hints: string[];
}

/** Items that could be built need acceptance criteria and guardrails; superseded and exploratory ones don't. */
function needsAcceptance(i: ItemStatus): boolean {
  return i.superseded_by == null && i.type !== "exploratory" && !i.light_pass;
}

/** Items scored on their own need band picks; superseded, light-pass and exploratory ones don't. */
function needsBands(i: ItemStatus): boolean {
  return i.superseded_by == null && !i.light_pass && i.type !== "exploratory";
}

/** Literal signal phrases ("by hand", "EDI"); descriptive ones like "a metric noun" can't be matched. */
function said(signal: string, text: string): boolean {
  if (/^an? /.test(signal)) return false;
  const esc = normalize(signal).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(text);
}

/**
 * Follow-on structure the user's words point at but the session doesn't have yet: a modifier
 * signal with no item carrying that modifier, or a type signal with no item of that type. These
 * are prompts to check, not rules: the interviewer decides whether it's really a separate pain.
 */
export function structureHints(session: Session, fw: Framework, transcript: TranscriptEntry[], opts: { primaryInterviewed?: boolean } = {}): string[] {
  const live = session.items.filter((i) => !i.superseded_by);
  if (live.length === 0) return [];
  const text = normalize(transcript.filter((t) => t.role === "user").map((t) => t.text).join("\n"));
  const hints: string[] = [];
  const primary = live[0];
  for (const [mod, def] of Object.entries(fw.router.modifiers)) {
    if (live.some((i) => i.modifiers.includes(mod as Item["modifiers"][number]))) continue;
    const heard = def.signals.filter((sig) => said(sig, text));
    if (heard.length) hints.push(`The user said ${heard.map((h) => `"${h}"`).join(", ")}: if it's part of ${primary.id}, add the \`${mod}\` modifier (set it in that item's \`modifiers\`) and cover its areas.`);
  }
  // Only one type hint: manual work done today that the primary item would replace (the spec's
  // worked example: the Monday spreadsheet goes away once the report exists). Hinting every type
  // made the model spawn items for every signal phrase and run out of turns. It waits until the
  // primary item's own interview is done: a second item early on put the whole interview in the
  // multi-item state where gpt-4.1-mini stopped recording answers (persona evals, rounds 2-3).
  if (opts.primaryInterviewed && primary.type !== "manual_process" && primary.type !== "exploratory" && !live.some((i) => i.type === "manual_process")) {
    const heard = fw.router.types.manual_process.signals.filter((sig) => said(sig, text));
    if (heard.length) hints.push(`The user said ${heard.map((h) => `"${h}"`).join(", ")}: if that's manual work they do today that ${primary.id} would replace, add it as one \`manual_process\` item with spawned_from "${primary.id}", and supersede it by ${primary.id} (router.supersede) once they say it would go away. It needs only a light pass (how often, how long), not a full interview. Don't add any other items for it.`);
  }
  if (live.some((i) => i.type === "exploratory") && live.length < 4) {
    hints.push("This is an exploratory intake: for each concrete example the user gives, add its own item with spawned_from the exploratory item and the type that fits the example (usually manual_process; never exploratory), and ask only one or two things about it (the last time it happened, roughly what it costs a week). Don't interview any one example in depth; aim for three or more.");
  }
  return hints;
}

export function statusOf(session: Session, fw: Framework, transcript: TranscriptEntry[] = []): Status {
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
    const light = item.spawned_from != null;
    const factsMissing = factsFor(item, fw).filter((f) => !item.facts[f]);
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      modifiers: item.modifiers,
      superseded_by: item.superseded_by,
      light_pass: light,
      preview_quadrant: factsMissing.length === 0 ? scoreItem(item, fw).quadrant ?? null : null,
      has_mitigation: !!item.prose.mitigation,
      unasked: areas.filter((a) => !asked(a.id)).map((a) => a.id),
      always_ask_pending: light ? [] : areas.filter((a) => a.always_ask && !asked(a.id)).map((a) => a.id),
      critical_unasked: light ? [] : criticalAreas(item, fw).filter((id) => !asked(id)),
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

  const interviewComplete = items.length > 0 && items.every((i) => i.critical_unasked.length === 0 && i.always_ask_pending.length === 0);
  // A superseded item needs no band picks: if its replacement doesn't reach Go, it's gated on
  // its unknowns, which honestly lands it in Gather more.
  const writeUpComplete = items.every(
    (i) =>
      (!needsBands(i) || i.facts_missing.length === 0) &&
      (!needsAcceptance(i) || (i.acceptance.criteria > 0 && i.acceptance.error_cases > 0 && i.guardrails.kill_criterion > 0 && i.guardrails.fallback > 0)),
  );
  const reflect = !rb ? "none" : rb.confirmed ? "confirmed" : "proposed";
  const primary = items.find((i) => !i.superseded_by);
  const primaryInterviewed = !!primary && primary.critical_unasked.length === 0 && primary.always_ask_pending.length === 0;
  const hints = reflect === "none" ? structureHints(session, fw, transcript, { primaryInterviewed }) : [];
  return {
    reflect_back: reflect,
    core,
    items,
    interview_complete: interviewComplete,
    ready_for_reflect_back: interviewComplete && writeUpComplete,
    next_step: nextStep(reflect, interviewComplete, items, hints),
    hints,
  };
}

/**
 * One plain instruction for the interviewer, computed from the status. Band picks, acceptance
 * criteria and guardrails are written from what was already said, never asked for directly:
 * once every needed area has been asked, the next step is to write them up and play back.
 */
function nextStep(reflect: Status["reflect_back"], interviewComplete: boolean, items: ItemStatus[], hints: string[]): string {
  if (reflect === "confirmed") return "The intake is complete. Thank the user briefly.";
  if (reflect === "proposed") {
    const review = items.filter((i) => i.preview_quadrant === "review" && !i.has_mitigation && !i.superseded_by);
    return [
      "You've played back a summary. If the user's latest message agrees with it (yes, that's right, that captures it), send `reflect_back` with status \"confirmed\" and the same text; don't propose it again. If they corrected something, send status \"corrected\" with the corrections listed.",
      ...(review.length
        ? [`${review.map((i) => i.id).join(", ")} would score in the Review quadrant, which can't reach Go without a written mitigation: add a one-line \`mitigation\` prose for it from what the user said would reduce the risk (their fallback or review step), or ask them if they haven't said.`]
        : []),
    ].join(" ");
  }
  if (items.length === 0) return "Create the first item from the user's opening statement and ask your first question.";
  const check = hints.length ? ` Also check: ${hints.join(" ")}` : "";
  if (!interviewComplete) {
    const open = items.flatMap((i) => [...i.critical_unasked, ...i.always_ask_pending]);
    return `Keep interviewing. Still to ask (in whatever order follows the conversation): ${[...new Set(open)].join(", ")}. Record every answer the user gives as you go.${check}`;
  }
  return [
    ...(hints.length ? [`First check: ${hints.join(" ")} If one applies, add it and ask about it instead of writing up. Otherwise:`] : []),
    "Every needed area has been asked, so stop asking questions now. In this one turn:",
    `add a band for every fact listed in facts_missing for ${items.filter(needsBands).map((i) => i.id).join(", ") || "no item"} (skip the other items), picked from what the user already said (use \`unknown\` where they didn't say), in \`facts\` only, never in \`updates\`; a band's quote is optional, so leave it null unless you copy the user's exact words;`,
    `write acceptance criteria (at least one criterion and one error case) and guardrails (at least a kill criterion and a fallback) for ${items.filter(needsAcceptance).map((i) => i.id).join(", ") || "no item"}, from what you heard;`,
    "write a one-line `mitigation` prose for any item where the user described how a risk is handled (a fallback, someone checking);",
    "and propose the reflect-back.",
  ].join(" ");
}

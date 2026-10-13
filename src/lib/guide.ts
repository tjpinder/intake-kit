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
  /** Planned checks that aren't areas: whether manual work the user mentioned happens today. */
  checks_pending: string[];
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
  /** The area code chose for the next question, and the one to ask instead if it's already answered. */
  next_question: Plan;
  /** Things in the user's own words the items don't reflect yet (from the router's signal phrases). */
  hints: string[];
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

/**
 * The type the opening's own words point at: the most specific (longest) signal phrase that
 * appears in it, so "where could AI help" (exploratory) beats "could AI" (known idea). Found in the
 * persona evals: the same idea-first opening was routed as known_idea or exploratory by chance.
 */
export function routingHint(fw: Framework, transcript: TranscriptEntry[]): string | null {
  const opening = transcript.find((t) => t.role === "user");
  if (!opening) return null;
  const text = normalize(opening.text);
  let best: { type: string; signal: string } | null = null;
  for (const [type, def] of Object.entries(fw.router.types)) {
    for (const signal of def.signals) {
      if (said(signal, text) && (!best || signal.length > best.signal.length)) best = { type, signal };
    }
  }
  if (!best) return null;
  return `The opening says "${best.signal}", a ${fw.router.types[best.type as ItemType].label.toLowerCase()} signal: start with a \`${best.type}\` item unless the user's words clearly point elsewhere.`;
}

/**
 * Follow-on structure the user's words point at but the session doesn't have yet: a modifier
 * signal with no item carrying that modifier, or a type signal with no item of that type. These
 * are prompts to check, not rules: the interviewer decides whether it's really a separate pain.
 */
export function structureHints(session: Session, fw: Framework, transcript: TranscriptEntry[], opts: { primaryInterviewed?: boolean } = {}): string[] {
  const live = session.items.filter((i) => !i.superseded_by && !i.dropped);
  if (live.length === 0) return [];
  const text = normalize(transcript.filter((t) => t.role === "user").map((t) => t.text).join("\n"));
  const hints: string[] = [];
  const primary = live[0];
  for (const [mod, def] of Object.entries(fw.router.modifiers)) {
    const m = mod as Item["modifiers"][number];
    // A modifier taken back (router.remove_modifiers) isn't suggested again.
    if (live.some((i) => i.modifiers.includes(m)) || session.items.some((i) => i.modifiers_removed?.includes(m))) continue;
    const heard = def.signals.filter((sig) => said(sig, text));
    if (heard.length) hints.push(`The user said ${heard.map((h) => `"${h}"`).join(", ")}: if it's part of ${primary.id}, add the \`${mod}\` modifier (set it in that item's \`modifiers\`) and cover its areas.`);
  }
  // Only one type hint: manual work done today that the primary item would replace (the spec's
  // worked example: the Monday spreadsheet goes away once the report exists). Hinting every type
  // made the model spawn items for every signal phrase and run out of turns. It waits until the
  // primary item's own interview is done: a second item early on put the whole interview in the
  // multi-item state where gpt-4.1-mini stopped recording answers (persona evals, rounds 2-3).
  // A dropped or superseded manual-process item counts too: the hint never comes back once acted on.
  // Found in the first live test: "if it stops, people go back to doing the task by hand" is a
  // fallback, not work done today, so the hint asks before anything is added.
  if (!session.session.asked && opts.primaryInterviewed && primary.type !== "manual_process" && primary.type !== "exploratory" && !session.items.some((i) => i.type === "manual_process")) {
    const heard = fw.router.types.manual_process.signals.filter((sig) => said(sig, text));
    if (heard.length) hints.push(`The user said ${heard.map((h) => `"${h}"`).join(", ")}. If that might be manual work they do today that ${primary.id} would replace (not just what they'd fall back to if something failed), ask whether it happens today and when it last did. Only once they describe it happening, add it as one \`manual_process\` item with spawned_from "${primary.id}", and supersede it by ${primary.id} (router.supersede) once they say it would go away; it needs only a light pass (how often, how long). If they say it doesn't apply, add nothing, or drop the item (router.drop) if you already added it.`);
  }
  if (live.some((i) => i.type === "exploratory") && live.length < 4) {
    hints.push("This is an exploratory intake: for each concrete example the user gives, add its own item with spawned_from the exploratory item and the type that fits the example (usually manual_process; never exploratory), and ask only one or two things about it (the last time it happened, roughly what it costs a week). Don't interview any one example in depth; aim for three or more.");
  }
  return hints;
}

/**
 * The manual-work check, planned like a question: the user mentioned doing something by hand,
 * and no manual-process item exists yet. Found in persona 1: as a hint it was skipped, or asked in
 * the same reply as the reflect-back. Sessions without asked stamps keep the hint instead.
 */
function manualCheck(session: Session, fw: Framework, item: Item, transcript: TranscriptEntry[]): string[] {
  if (!session.session.asked || session.session.asked[`${item.id}:${MANUAL_CHECK}`]) return [];
  if (item.type === "manual_process" || item.type === "exploratory" || session.items.some((i) => i.type === "manual_process")) return [];
  const text = normalize(transcript.filter((t) => t.role === "user").map((t) => t.text).join("\n"));
  return fw.router.types.manual_process.signals.some((sig) => said(sig, text)) ? [MANUAL_CHECK] : [];
}

export function statusOf(session: Session, fw: Framework, transcript: TranscriptEntry[] = []): Status {
  const rb = session.session.reflect_back;
  const core = Object.entries(session.core).map(([key, e]) => ({
    area: `core.${key}`,
    status: e.status,
    asked: wasAsked(session, null, `core.${key}`),
    probe_available: !!e.updated_at && (e.status === "assumed" || e.status === "unknown") && e.probe_count === 0,
  }));

  // The primary item (first live, not spawned) carries the manual-work check.
  const primaryId = session.items.find((i) => !i.superseded_by && !i.dropped && i.spawned_from == null)?.id;
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
      checks_pending: light || primaryId !== item.id ? [] : manualCheck(session, fw, item, transcript),
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

  const interviewed = (i: ItemStatus) => i.critical_unasked.length === 0 && i.critical_unprobed.length === 0 && i.checks_pending.length === 0 && i.always_ask_pending.length === 0 && i.band_sources_unasked.length === 0;
  const interviewComplete = items.length > 0 && items.every(interviewed);
  // A superseded item needs no band picks: if its replacement doesn't reach Go, it's gated on
  // its unknowns, which honestly lands it in Gather more.
  const writeUpComplete = items.every(
    (i) =>
      (!needsBands(i) || i.facts_missing.length === 0) &&
      (!needsAcceptance(i) || (i.acceptance.criteria > 0 && i.acceptance.error_cases > 0 && i.guardrails.kill_criterion > 0 && i.guardrails.fallback > 0)),
  );
  const reflect = !rb ? "none" : rb.confirmed ? "confirmed" : "proposed";
  const primary = items.find((i) => !i.superseded_by && !i.dropped);
  const primaryInterviewed = !!primary && interviewed(primary);
  const hints = reflect === "none" ? structureHints(session, fw, transcript, { primaryInterviewed }) : [];
  const plan = reflect === "none" ? planFrom(session, fw, items) : { primary: null, alternate: null };
  return {
    reflect_back: reflect,
    core,
    items,
    interview_complete: interviewComplete,
    ready_for_reflect_back: interviewComplete && writeUpComplete,
    next_step: nextStep(reflect, interviewComplete, items, hints, items.length === 0 ? routingHint(fw, transcript) : null, plan, fw),
    next_question: plan,
    hints,
  };
}

/**
 * One plain instruction for the interviewer, computed from the status. Band picks, acceptance
 * criteria and guardrails are written from what was already said, never asked for directly:
 * once every needed area has been asked, the next step is to write them up and play back.
 */
function nextStep(reflect: Status["reflect_back"], interviewComplete: boolean, items: ItemStatus[], hints: string[], routing: string | null = null, plan: Plan = { primary: null, alternate: null }, fw?: Framework): string {
  if (reflect === "confirmed") return "The intake is complete. Thank the user briefly.";
  if (reflect === "proposed") {
    const review = items.filter((i) => i.preview_quadrant === "review" && !i.has_mitigation && !i.superseded_by);
    return [
      "You've played back a summary. If the user's latest message agrees with it (yes, that's right, that captures it), send `reflect_back` with status \"confirmed\" and the same text; don't propose it again. If they corrected something, send status \"corrected\" with the corrections listed.",
      ...(review.length
        ? [`${review.map((i) => i.id).join(", ")} would score in the Review quadrant, which can't reach Go without a written mitigation: add a one-line \`mitigation\` prose for it from what the user has already said would reduce the risk (their fallback, review step or rule). Ask only if they've said nothing at all about how risk is handled, and not about core.trust once it has had its question and follow-up.`]
        : []),
    ].join(" ");
  }
  if (items.length === 0) return ["Create the first item from the user's opening statement and ask your first question.", ...(routing ? [routing] : [])].join(" ");
  const check = hints.length ? ` Also check: ${hints.join(" ")}` : "";
  if (!interviewComplete && plan.primary && fw) {
    // Code chooses the area; the model asks about it and never reports which area it asked.
    return [
      `Keep interviewing. Record every answer in the user's latest message, then ask about ${describeTarget(fw, plan.primary)}`,
      ...(plan.alternate ? [`If their latest message already answers that in full, record it and ask instead about ${describeTarget(fw, plan.alternate)}`] : []),
      `Ask nothing else.${check}`,
    ].join(" ");
  }
  if (!interviewComplete) return `Keep interviewing. Record every answer the user gives as you go.${check}`;
  // Name only the items that need each part; with none, the clause is left out (an exploratory
  // intake's write-up once said "for no item", and the model sent bands for an empty item ID).
  const banded = items.filter(needsBands).map((i) => i.id);
  const buildable = items.filter(needsAcceptance).map((i) => i.id);
  return [
    ...(hints.length ? [`First check: ${hints.join(" ")} If one applies, add it and ask about it instead of writing up. Otherwise:`] : []),
    "Every needed area has been asked, so stop asking questions now. In this one turn:",
    ...(banded.length ? [`add a band for every fact listed in facts_missing for ${banded.join(", ")} (skip the other items), picked from what the user already said (use \`unknown\` where they didn't say), in \`facts\` only, never in \`updates\`; a band's quote is optional, so leave it null unless you copy the user's exact words;`] : []),
    ...(buildable.length ? [`write acceptance criteria (at least one criterion and one error case) and guardrails (at least a kill criterion and a fallback) for ${buildable.join(", ")}, from what you heard;`] : []),
    "write a one-line `mitigation` prose for any item where the user described how a risk is handled (a fallback, someone checking);",
    "and propose the reflect-back.",
  ].join(" ");
}

/** An area code has chosen for the next question. probe: the one follow-up on a vague answer. */
export interface Target {
  item: string | null;
  area: string;
  probe: boolean;
  /** first ask; a follow-up (vague answer, nothing recorded, no number for today); or the manual-work check. */
  why: "first" | "vague" | "unanswered" | "no_baseline" | "check";
}

/** Not an area: the planned check whether manual work the user mentioned happens today. */
export const MANUAL_CHECK = "check.manual_work";

/** Shared core areas in the order a conversation usually reaches them: why, what data, who, what if wrong. */
const CORE_ORDER = ["core.outcome", "core.data", "core.users", "core.trust", "core.systems", "core.constraints"];

/**
 * The next question's area, chosen by code. Found in the first live test and persona 7: the model
 * labelled its own questions with the area it planned to ask next, so stamps, the question cap
 * and the retry message all named the wrong area. Now code picks, the prompt tells the model what
 * to ask, and the model never reports it.
 *
 * Order: each live item's own critical areas, then the shared critical ones, then band sources,
 * then always-ask areas; then a light pass on each spawned item; then the one probe on each
 * critical area answered only vaguely. The alternate is asked instead when the user's latest
 * message already answers the primary in full (apply-turn works out which from what's recorded).
 */
export function planTargets(session: Session, fw: Framework, transcript: TranscriptEntry[] = []): Plan {
  return planFrom(session, fw, statusOf(session, fw, transcript).items);
}

export interface Plan { primary: Target | null; alternate: Target | null }

function planFrom(session: Session, fw: Framework, items: ItemStatus[]): Plan {
  const plan: Target[] = [];
  const seen = new Set<string>();
  const add = (item: string | null, area: string, why: Target["why"] = "first") => {
    const core = area.startsWith("core.");
    const key = core ? area : `${item}:${area}`;
    if (seen.has(key)) return;
    seen.add(key);
    plan.push({ item: core ? null : item, area, probe: why !== "first" && why !== "check", why });
  };
  const live = items.filter((i) => !i.superseded_by && !i.dropped);
  const byOrder = (ids: string[]) => [...ids].sort((a, b) => (CORE_ORDER.indexOf(a) + 1 || 99) - (CORE_ORDER.indexOf(b) + 1 || 99));
  for (const i of live.filter((x) => !x.light_pass)) {
    for (const id of i.critical_unasked.filter((id) => !id.startsWith("core."))) add(i.id, id);
    for (const id of byOrder(i.critical_unasked.filter((id) => id.startsWith("core.")))) add(i.id, id);
    for (const id of byOrder(i.band_sources_unasked)) add(i.id, id);
    for (const id of i.always_ask_pending) add(i.id, id);
  }
  for (const i of live) for (const f of i.follow_ups) add(i.id, f.area, f.why);
  for (const i of live) for (const c of i.checks_pending) add(i.id, c, "check");
  for (const i of live.filter((x) => x.light_pass)) {
    const item = session.items.find((x) => x.id === i.id)!;
    const first = criticalAreas(item, fw).find((id) => !id.startsWith("core."));
    if (first && !wasAsked(session, item, first)) add(i.id, first);
  }
  return { primary: plan[0] ?? null, alternate: plan[1] ?? null };
}

/** The question to ask about an area, in plain words, for the prompt and the plugin's status. */
export function describeTarget(fw: Framework, t: Target): string {
  const whose = t.item ? ` for ${t.item}` : "";
  if (t.area === MANUAL_CHECK) {
    return `whether the manual work they mentioned is something they do today${whose}, or only what they'd fall back to if it failed: ask whether it happens today and when it last did. Only if they describe it happening, add it as one \`manual_process\` item with spawned_from "${t.item}" (supersede it by ${t.item} once they say it would go away). If not, add nothing.`;
  }
  const area = fw.areas.get(t.area);
  if (!area) return `${t.area}${whose}`;
  if (t.why === "no_baseline") return `${t.area}${whose}: they said how they'd judge it but gave no number for today. Ask: "What's it costing now, in hours, errors or chargebacks?"`;
  if (t.why === "unanswered") return `${t.area}${whose}: it was asked but nothing was recorded, so ask once more: find out ${area.must_capture.charAt(0).toLowerCase()}${area.must_capture.slice(1)}.`;
  if (t.why === "vague") return `${t.area}${whose}: they answered vaguely, so ask once about the last time it actually happened (what exactly happened, who was involved).`;
  return `${t.area}${whose}: find out ${area.must_capture.charAt(0).toLowerCase()}${area.must_capture.slice(1)}. For example: "${area.probes[0]}" (adapt the wording to their situation).`;
}

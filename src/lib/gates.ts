// Gates: each scored item gets exactly one decision. Every gate's rule is checked and every
// match is recorded; the first match in scoring.yaml's precedence wins:
//   fix_not_build > dont_build_definitive > gather_more > dont_build_quadrant > go
// An item that matches none of these and doesn't meet every Go requirement falls through to
// Gather more, with the unmet requirements as its reasons.

import type { Framework } from "./framework.ts";
import { aiOverlayPasses, bandOf, scoreItem, scoringView } from "./score.ts";
import { askedKey, coverageFor, isCaptured, type Gate, type GateDecision, type Item, type Session } from "./session.ts";

type Stage = "fix_not_build" | "dont_build_definitive" | "gather_more" | "dont_build_quadrant" | "go";

const DECISION: Record<Stage, GateDecision> = {
  fix_not_build: "fix_not_build",
  dont_build_definitive: "dont_build",
  gather_more: "gather_more",
  dont_build_quadrant: "dont_build",
  go: "go",
};

export class GateError extends Error {}

/** Areas that must be covered (or assumed, with a confirmed reflect-back) before an item can go. */
export function criticalAreas(item: Item, fw: Framework): string[] {
  const ids = new Set(fw.scoring.gates.go_requires_core);
  const modules = [item.type, ...item.modifiers.map((m) => `mod.${m}`)];
  for (const name of modules) for (const area of fw.modules[name]?.areas ?? []) if (area.critical) ids.add(area.id);
  return [...ids];
}

/** The area a gate fact comes from for this item: the first of its sources that applies. */
export function gateFactSource(fact: string, item: Item, fw: Framework): string | null {
  const applies = new Set(["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)].flatMap((m) => fw.modules[m]?.areas.map((a) => a.id) ?? []));
  return (fw.scoring.gate_fact_sources?.[fact] ?? []).find((id) => applies.has(id)) ?? null;
}

/** The area a fact comes from for this item: its gate-fact source, or a criterion's first applicable source. */
function factSource(fact: string, item: Item, fw: Framework): string | null {
  const gate = gateFactSource(fact, item, fw);
  if (gate) return gate;
  const applies = new Set(["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)].flatMap((m) => fw.modules[m]?.areas.map((a) => a.id) ?? []));
  return fw.scoring.criteria[fact]?.usually_from.find((id) => applies.has(id)) ?? null;
}

/**
 * One open question per critical fact still unknown or vague (gap_questions), for a Gather more
 * item, so its discovery brief always says what to ask, who can answer and what would settle it.
 */
export function addGapQuestions(session: Session, item: Item, fw: Framework): void {
  const view = scoringView(session, item);
  for (const [fact, q] of Object.entries(fw.scoring.gap_questions ?? {})) {
    if (!q.when.includes(bandOf(view, fact, fw))) continue;
    const area = factSource(fact, item, fw);
    if (!area || item.open_questions.some((o) => o.question === q.question)) continue;
    item.open_questions.push({ area, question: q.question, who_can_answer: q.who_can_answer, artifact_needed: q.artifact_needed });
  }
}

/**
 * The definition question names the term: "How exactly do you calculate variance?" for a metric.
 * Unquoted: quote marks hold only a source's own words, and the term is the model's spelling.
 */
export function termQuestion(t: { term: string; kind: string }): string {
  return t.kind === "metric"
    ? `How exactly do you calculate ${t.term}? What's in and what's out? Give one real example and the right number.`
    : `In your own words, what counts as ${t.term}, and what doesn't? Give one real example.`;
}

/** The terms an item uses that block Go: no confirmed definition, or two that disagree. */
function termReasons(session: Session, item: Item): string[] {
  return (session.terms ?? []).filter((t) => t.items.includes(item.id)).flatMap((t) =>
    t.status === "not_a_term" ? [] : t.conflict ? [`"${t.term}" has two definitions that disagree`] : t.status === "unconfirmed" ? [`"${t.term}" has no confirmed definition`] : []);
}

/**
 * One open question per term an item uses that has no confirmed definition, or two that disagree;
 * and, as a recommendation, a known-answer example for each metric that has none.
 */
export function addTermQuestions(session: Session, item: Item): void {
  for (const t of (session.terms ?? []).filter((x) => x.items.includes(item.id) && x.status !== "not_a_term")) {
    let q: { question: string; artifact_needed: string } | null = null;
    // Definitions here are the model's paraphrases: unquoted, labelled as ours.
    if (t.conflict) q = { question: `Two definitions of ${t.term} disagree (our summaries: ${t.definition ?? t.draft?.definition}; and ${t.conflict.definition}). Which is right?`, artifact_needed: "One agreed definition, in the owner's words" };
    else if (t.status === "unconfirmed") q = { question: termQuestion(t), artifact_needed: "The owner's definition in their own words, and one real example with the correct result" };
    else if (t.kind === "metric" && !t.examples.length) q = { question: `Recommended: give one real example of ${t.term} and the right count, so the build can be checked against it.`, artifact_needed: "A real case and its correct result" };
    if (q && !item.open_questions.some((o) => o.area === t.id)) item.open_questions.push({ area: t.id, question: q.question, who_can_answer: "Whoever owns the process", artifact_needed: q.artifact_needed });
  }
}

/** The user was asked about this area (or answered it unprompted). */
function wasAsked(session: Session, item: Item, id: string): boolean {
  const key = askedKey(item.id, id);
  if (key && session.session.asked?.[key]) return true;
  const e = coverageFor(session, item, id);
  return !!e && e.status !== "unknown";
}

/** A gate reason names the area it rests on, and says so plainly when that area was never asked. */
function sourced(session: Session, item: Item, fw: Framework, fact: string, reason: string): string {
  const src = gateFactSource(fact, item, fw);
  if (!src) return reason;
  return wasAsked(session, item, src) ? `${reason} (${src})` : `${reason}: ${src} was never asked`;
}

const SUCCESS_REASON: Record<string, string> = {
  measurable_no_baseline: "Success is measurable, but there's no baseline for how things are today",
  vague: "Success is described, but not as something measurable, and there's no baseline",
  unknown: "Nobody has said how success would be measured",
};

function areaSettled(session: Session, item: Item, id: string): boolean {
  const entry = coverageFor(session, item, id);
  // A captured reply is the user's words, but nobody judged what it answers: it never settles an area.
  if (!entry || isCaptured(entry)) return false;
  if (entry.status === "covered" || entry.status === "not_applicable") return true;
  return entry.status === "assumed" && session.session.reflect_back?.confirmed === true;
}

interface Match { reasons: string[]; revisit_trigger: string | null }

interface Evaluation { matches: Record<Stage, Match>; unmetForGo: string[] }

function evaluate(session: Session, item: Item, fw: Framework, gateOf: (id: string) => Gate | null): Evaluation {
  const g = fw.scoring.gates;
  const scoring = item.scoring!;
  const band = (fact: string) => bandOf(scoringView(session, item), fact, fw);
  const m: Record<Stage, Match> = {
    fix_not_build: { reasons: [], revisit_trigger: null },
    dont_build_definitive: { reasons: [], revisit_trigger: null },
    gather_more: { reasons: [], revisit_trigger: null },
    dont_build_quadrant: { reasons: [], revisit_trigger: null },
    go: { reasons: [], revisit_trigger: null },
  };
  const triggers: Record<"dont_build_definitive" | "dont_build_quadrant", string[]> = { dont_build_definitive: [], dont_build_quadrant: [] };

  // 1. Fix, not build
  if (g.fix_not_build.applies_to.includes(item.type)) {
    const cause = band("broken_cause");
    if (g.fix_not_build.when_cause.includes(cause)) m.fix_not_build.reasons.push(`Broken item with a ${cause} cause`);
    if (g.fix_not_build.when_workaround_permanent.includes(band("workaround_permanent"))) {
      m.fix_not_build.reasons.push("The workaround is acceptable as permanent");
    }
  }

  // 2. Don't build, definitive reasons. At an async sign-off each reason is confirmed on its own
  // (reflect_back.dont_build_confirmed); one the interviewer didn't confirm routes to Gather more
  // (second v2 gate: one "yes" confirmed every Don't-build question at once).
  const confirmedKeys = session.session.reflect_back?.dont_build_confirmed;
  const definitive = (key: string, reason: string, trigger: string) => {
    if (!confirmedKeys || confirmedKeys.includes(`${item.id}:${key}`)) {
      m.dont_build_definitive.reasons.push(reason);
      triggers.dont_build_definitive.push(trigger);
    } else m.gather_more.reasons.push(`${reason}, but that wasn't confirmed at sign-off`);
  };
  const d = g.dont_build_definitive;
  if (d.existing_asset.includes(band("existing_asset"))) definitive("existing_asset", "An existing report or feature already covers it", "the existing report or feature stops covering this need");
  // Don't build needs evidence. "No decision depends on it" is that evidence only for a report or
  // dataset; for other types it's a gap, so it routes to Gather more below (first live test: a
  // portfolio repo was killed twice on it).
  const decisive = d.decision_depends_applies_to.includes(item.type);
  if (decisive && d.decision_depends.includes(band("decision_depends"))) definitive("decision_depends", "No decision depends on it", "a decision comes to depend on it");
  if (d.value.includes(band("value"))) definitive("value", "The user describes its value as trivial", "the cost of the current way grows enough to matter");
  if (d.superseded_by_go_item && item.superseded_by && gateOf(item.superseded_by)?.decision === "go") {
    definitive("superseded", `Superseded by ${item.superseded_by}, which reaches Go`, `${item.superseded_by} isn't built, or doesn't replace this`);
  }

  // 3. Gather more discovery
  const gm = g.gather_more;
  const unsettled = criticalAreas(item, fw).filter((id) => !areaSettled(session, item, id));
  if (gm.critical_unknown) for (const id of unsettled) m.gather_more.reasons.push(`Critical area ${id} isn't covered`);
  if (gm.stability.includes(band("stability"))) m.gather_more.reasons.push("A major change is expected within six months");
  const depends = band("decision_depends");
  if ((gm.decision_depends ?? []).includes(depends) && !(decisive && d.decision_depends.includes(depends))) {
    m.gather_more.reasons.push(sourced(session, item, fw, "decision_depends", depends === "unknown" ? "Nobody has said what decision or outcome depends on it" : "No decision or outcome depends on it yet"));
  }
  if (gm.review_without_mitigation && scoring.quadrant === "review" && !item.prose.mitigation) {
    m.gather_more.reasons.push("Review quadrant with no written mitigation");
  }
  for (const mod of gm.modifiers) if (item.modifiers.includes(mod)) m.gather_more.reasons.push(`${mod} modifier routes to more discovery`);
  // Definitions: no confirmed definition, no Go. A missing definition is Gather more, never Don't build.
  const termGaps = termReasons(session, item);
  m.gather_more.reasons.push(...termGaps);
  if (gm.defer_with_critical_unknown && scoring.quadrant === "defer" && unsettled.length) {
    m.gather_more.reasons.push("Scored Defer while a critical area is still unknown");
  }
  if (gm.composite_null) {
    if (scoring.automation_potential == null) m.gather_more.reasons.push("Too few known criteria to score automation potential");
    if (scoring.ease == null) m.gather_more.reasons.push("Too few known criteria to score ease");
  }
  if (gm.ai_overlay_unresolved && scoring.ai_overlay.applies) {
    const decisive = new Set(fw.scoring.ai_overlay.dont_build_on_fail);
    for (const [check, result] of Object.entries(scoring.ai_overlay.checks)) {
      if (result === "unknown") m.gather_more.reasons.push(`AI overlay check ${check} is unknown`);
      else if (result === "fail" && !decisive.has(check)) m.gather_more.reasons.push(`AI overlay check ${check} failed`);
    }
  }

  // 4. Don't build: Defer quadrant (unless rescued by the AI overlay), or a decisive AI failure
  const q = g.dont_build_quadrant;
  const rescued = q.defer_rescued_by_ai_overlay && aiOverlayPasses(scoring);
  if (scoring.quadrant && q.quadrant.includes(scoring.quadrant) && !rescued) {
    m.dont_build_quadrant.reasons.push(`${scoring.quadrant[0].toUpperCase()}${scoring.quadrant.slice(1)} quadrant`);
    triggers.dont_build_quadrant.push("rule clarity, data structure, stability or access improve enough to leave Defer");
  }
  if (q.ai_overlay_fail && scoring.ai_overlay.applies) {
    for (const check of fw.scoring.ai_overlay.dont_build_on_fail) {
      if (scoring.ai_overlay.checks[check] === "fail") {
        m.dont_build_quadrant.reasons.push(`AI overlay check ${check} failed`);
        triggers.dont_build_quadrant.push(`${check.replace("_", " ")} can be shown to pass`);
      }
    }
  }

  // 5. Go: collect every unmet requirement. No unmet requirements means Go.
  const go = g.go;
  const unmet: string[] = [];
  if (go.reflect_back_confirmed && session.session.reflect_back?.confirmed !== true) unmet.push("Reflect-back not confirmed");
  for (const id of unsettled) unmet.push(`Critical area ${id} isn't covered`);
  if (!go.success_metric.includes(band("success_metric"))) unmet.push(sourced(session, item, fw, "success_metric", SUCCESS_REASON[band("success_metric")] ?? "No measurable success metric with a baseline"));
  const quadrantOk =
    (scoring.quadrant != null && go.quadrants.includes(scoring.quadrant) && (scoring.quadrant !== "review" || !go.review_needs_mitigation || !!item.prose.mitigation)) ||
    (go.ai_candidate_from_defer && scoring.quadrant === "defer" && aiOverlayPasses(scoring));
  if (!quadrantOk) unmet.push(scoring.quadrant ? `${scoring.quadrant} quadrant doesn't qualify for Go` : "Not enough known criteria to place in a quadrant");
  if (go.ai_overlay_must_pass && scoring.ai_overlay.applies && !aiOverlayPasses(scoring)) unmet.push("AI overlay doesn't pass every check");
  unmet.push(...termGaps);
  if (unmet.length === 0) {
    m.go.reasons.push(
      scoring.quadrant === "defer" ? "AI candidate: Defer for rule-based automation, but every AI overlay check passes" : `${scoring.quadrant![0].toUpperCase()}${scoring.quadrant!.slice(1)} quadrant`,
      "Critical areas covered or confirmed-assumed",
      "Measurable success metric with a baseline",
      "Reflect-back confirmed",
    );
  }

  m.dont_build_definitive.revisit_trigger = triggers.dont_build_definitive.length ? `Revisit if ${triggers.dont_build_definitive.join("; or ")}` : null;
  m.dont_build_quadrant.revisit_trigger = triggers.dont_build_quadrant.length ? `Revisit if ${triggers.dont_build_quadrant.join("; or ")}` : null;
  return { matches: m, unmetForGo: unmet };
}

/** Gates one scored item. gateOf returns the gate of another item (for supersession), or null. */
export function gateItem(session: Session, item: Item, fw: Framework, gateOf: (id: string) => Gate | null = () => null): Gate {
  if (!item.scoring) throw new GateError(`${item.id} has no scoring; score it before gating`);
  // An item that turned out not to apply isn't weighed at all; DECISIONS.md records why.
  if (item.dropped) return { decision: "dont_build", reasons: [`Dropped during the interview: ${item.dropped.reason}`], revisit_trigger: null, rules_version: fw.scoring.rules_version };
  const { matches, unmetForGo } = evaluate(session, item, fw, gateOf);
  const order = fw.scoring.gates.precedence as Stage[];
  const winner = order.find((stage) => matches[stage].reasons.length > 0);

  if (!winner) {
    return { decision: "gather_more", reasons: unmetForGo, revisit_trigger: null, rules_version: fw.scoring.rules_version };
  }

  // Gather more lists every unmet Go requirement too, so the brief covers everything that stands
  // between this item and Go (enablement live test: the vague success metric went unlisted).
  if (winner === "gather_more") {
    for (const r of unmetForGo) if (!matches.gather_more.reasons.includes(r)) matches.gather_more.reasons.push(r);
  }
  const also = order
    .filter((stage) => stage !== winner && stage !== "go" && matches[stage].reasons.length > 0)
    .flatMap((stage) => matches[stage].reasons.map((r) => `(also matched ${DECISION[stage]}) ${r}`));
  return {
    decision: DECISION[winner],
    reasons: [...matches[winner].reasons, ...also],
    revisit_trigger: matches[winner].revisit_trigger,
    rules_version: fw.scoring.rules_version,
  };
}

/**
 * Scores and gates every item, but only once the reflect-back is confirmed. Before that it
 * returns the session unchanged with scored: false. Items superseded by another are gated
 * after it. Items in a supersession cycle ignore supersession and are gated on their own merits.
 */
export function scoreAndGate(session: Session, fw: Framework): { session: Session; scored: boolean; reason?: string } {
  if (session.session.reflect_back?.confirmed !== true) {
    return { session, scored: false, reason: "The reflect-back hasn't been confirmed, so nothing is scored yet." };
  }
  const out: Session = structuredClone(session);
  const byId = new Map(out.items.map((i) => [i.id, i]));
  for (const item of out.items) {
    if (item.superseded_by && !byId.has(item.superseded_by)) throw new GateError(`${item.id} is superseded by unknown item ${item.superseded_by}`);
    item.scoring = scoreItem(scoringView(out, item), fw);
    item.gate = null;
  }

  const inCycle = new Set<string>();
  for (const item of out.items) {
    // Follow the superseded_by chain; arriving back at this item means it's in a cycle.
    let cur = item.superseded_by;
    for (let steps = 0; cur && steps < out.items.length; steps++) {
      if (cur === item.id) { inCycle.add(item.id); break; }
      cur = byId.get(cur)!.superseded_by;
    }
  }

  const gates = new Map<string, Gate>();
  const gateOf = (id: string): Gate | null => {
    const done = gates.get(id);
    if (done) return done;
    const gate = gateItem(out, byId.get(id)!, fw, inCycle.has(id) ? () => null : gateOf);
    gates.set(id, gate);
    return gate;
  };
  for (const item of out.items) item.gate = gateOf(item.id);
  for (const item of out.items) if (item.gate!.decision === "gather_more") addGapQuestions(out, item, fw);
  for (const item of out.items) if (!item.dropped) addTermQuestions(out, item);
  return { session: out, scored: true };
}

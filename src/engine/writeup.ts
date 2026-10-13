// Write-up and summary (HANDOFF.md, Interview engine v2, steps 7 and 8). At the summary the model
// picks a band for each criterion and drafts prose, acceptance criteria, guardrails and open
// questions for one item, from what's recorded. Code keeps only what checks out (a known band,
// evidence the item has answered in the user's words) and drops the rest, so the summary always
// renders. Code then renders the summary from the session; the user confirms or corrects it.

import type { Framework } from "../lib/framework.ts";
import { findQuote, type TranscriptEntry } from "../lib/grounding.ts";
import { scoreAndGate } from "../lib/gates.ts";
import type { Acceptance, Guardrail, Item, Session } from "../lib/session.ts";
import { buildSummary, summaryText } from "../lib/summary.ts";
import { areaFits, entryOf } from "./apply.ts";
import { queueFor } from "./plan.ts";

export interface WriteUp {
  facts: Array<{ item: string; fact: string; band: string; evidence: string[]; quote: string | null }>;
  prose: Array<{ item: string | null; field: keyof Item["prose"]; text: string }>;
  acceptance: Array<{ item: string; kind: Acceptance["kind"]; given: string; when: string; then: string; evidence: string[] }>;
  guardrails: Array<{ item: string; kind: Guardrail["kind"]; text: string; evidence: string[] }>;
  open_questions: Array<{ item: string | null; area: string; question: string; who_can_answer: string | null; artifact_needed: string | null }>;
  reflect_back_text: string;
}

/** Applies one item's write-up, keeping only what checks out. Returns what was dropped, for the log. */
export function applyWriteUp(session: Session, itemId: string, w: WriteUp, fw: Framework, transcript: TranscriptEntry[]): string[] {
  const dropped: string[] = [];
  const item = session.items.find((i) => i.id === itemId);
  if (!item) return [`unknown item ${itemId}`];
  const answered = (id: string) => areaFits(item, id, fw) && !!entryOf(session, item, id)?.quotes.length;
  for (const f of w.facts) {
    const bands = fw.factBands.get(f.fact);
    if (!bands || !bands.includes(f.band)) { dropped.push(`fact ${f.fact}: band "${f.band}" isn't defined`); continue; }
    const evidence = f.evidence.filter((id) => fw.areas.has(id));
    const quote = f.quote && findQuote(f.quote, transcript) ? f.quote : null;
    item.facts[f.fact] = { band: f.band, evidence, quotes: quote ? [quote] : [] };
  }
  for (const p of w.prose) if (p.text.trim()) item.prose[p.field] = p.text.trim();
  for (const a of w.acceptance) {
    const evidence = a.evidence.filter(answered);
    if (!evidence.length || ![a.given, a.when, a.then].every((s) => s.trim())) { dropped.push(`acceptance "${a.then}": no answered evidence`); continue; }
    if (!item.acceptance.some((x) => x.kind === a.kind && x.given === a.given && x.when === a.when && x.then === a.then)) item.acceptance.push({ kind: a.kind, given: a.given, when: a.when, then: a.then, evidence });
  }
  for (const g of w.guardrails) {
    const evidence = g.evidence.filter(answered);
    if (!evidence.length || !g.text.trim()) { dropped.push(`guardrail "${g.text}": no answered evidence`); continue; }
    if (!item.guardrails.some((x) => x.kind === g.kind && x.text === g.text)) item.guardrails.push({ kind: g.kind, text: g.text, evidence });
  }
  for (const q of w.open_questions) {
    if (!fw.areas.has(q.area) || !q.question.trim()) continue;
    if (!item.open_questions.some((o) => o.area === q.area)) item.open_questions.push({ area: q.area, question: q.question, who_can_answer: q.who_can_answer, artifact_needed: q.artifact_needed });
  }
  return dropped;
}

/**
 * Moves to the summary: every required area still open is marked unknown and listed as an open
 * question, and the reflect-back is rendered by code from the session.
 */
export function enterSummary(original: Session, fw: Framework, now: string): Session {
  const session: Session = structuredClone(original);
  for (const item of session.items.filter((i) => !i.dropped)) {
    for (const area of queueFor(item, fw)) {
      const e = entryOf(session, item, area);
      if (e?.updated_at) continue;
      const def = fw.areas.get(area)!;
      const entry = { status: "unknown" as const, value: null, quotes: [], probe_count: 0, updated_at: now };
      if (area.startsWith("core.")) { if (item.spawned_from) item.core_overrides[area.slice(5)] = entry; else session.core[area.slice(5) as keyof Session["core"]] = entry; }
      else item.coverage[area] = entry;
      if (!item.open_questions.some((o) => o.area === area)) item.open_questions.push({ area, question: `${def.must_capture.charAt(0).toUpperCase()}${def.must_capture.slice(1)}?`, who_can_answer: null, artifact_needed: null });
    }
  }
  const engine = session.session.engine!;
  engine.phase = "summary";
  engine.pending = { item: null, area: "summary", kind: "summary", check: null, question: "Does this summary look right?" };
  const prior = session.session.reflect_back;
  session.session.reflect_back = { text: summaryText(buildSummary(session, fw)), confirmed: false, corrections: prior?.corrections ?? [], proposed_at: now };
  return session;
}

/** The user confirmed the summary: code scores and gates every item. */
export function confirmSummary(original: Session, fw: Framework): Session {
  const session: Session = structuredClone(original);
  session.session.reflect_back = { ...session.session.reflect_back!, confirmed: true };
  session.session.engine!.phase = "confirmed";
  session.session.engine!.pending = null;
  return scoreAndGate(session, fw).session;
}

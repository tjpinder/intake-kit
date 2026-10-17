// Async intake (HANDOFF.md, "Async intake mode", step 4): after each ingest, code lists what's still
// open and builds a follow-up packet that asks only that. Nothing here calls a model, and nothing
// already answered is asked again.

import type { Framework } from "../lib/framework.ts";
import { criticalAreas, termQuestion } from "../lib/gates.ts";
import { hasNumber, sessionQuotes } from "../lib/score.ts";
import { exactSpan, quoteFor } from "../lib/grounding.ts";
import { enforceVerbatim } from "../lib/verbatim.ts";
import type { CoverageEntry, Item, Session } from "../lib/session.ts";
import { areaLabel } from "../lib/summary.ts";
import { entryOf } from "./apply.ts";
import { areaKey, killCheckDue, manualCheckDue, queueFor, stateOf } from "./plan.ts";
import { MANUAL_QUESTION } from "./turn.ts";
import type { AreaState } from "./types.ts";

/** Areas whose question is "how exactly is it counted?": merged into a metric term's question when one is open. */
const DEFINITION_AREAS = ["data_report.definition"];

export type GapKind = "unknown" | "partial" | "conflict" | "confirm" | "baseline" | "check" | "term";

export interface Gap {
  kind: GapKind;
  item: string | null;
  /** A coverage ID, a check name, or a term ID. */
  target: string;
  question: string;
  /** Conflicts: the two answers, so the same disagreement filed under two areas is asked once. */
  pair?: [string, string];
  /** Partials and conflicts: the area's question (partials also keep the words quoted back), so one thing is asked once. */
  quoted?: string;
  ask?: string;
}

export interface Readiness {
  item: string;
  title: string;
  required: number;
  answered: number;
  /** What still stands between the item and its summary, in plain words. */
  open: string[];
}

export interface GapReport {
  gaps: Gap[];
  readiness: Readiness[];
}

const settled = (s: Session, item: Item, check: string) => {
  const c = s.session.engine!.checks[`${item.id}:${check}`];
  return !!c && (c.result === "yes" || c.result === "no" || c.asks >= 2);
};

/**
 * Quote marks hold only a source's own words (cycle-count retest: a reworded request line and two
 * third-person paraphrases were quoted). A quote is shown as the source has it, with who said it;
 * when there's no span to show, the paraphrase goes unquoted, labelled "our summary". followUpEmail
 * then strips quote marks from anything that still isn't verbatim (enforceVerbatim).
 */
function quoter(session: Session) {
  const sources = session.session.sources ?? [];
  const said = (quote: string | null | undefined, sourceId?: string | null): string | null => {
    if (!quote) return null;
    const src = sources.find((x) => x.id === sourceId) ?? sources.find((x) => exactSpan(quote, [x.text]));
    const span = src ? exactSpan(quote, [src.text]) : null;
    if (!src || !span) return null;
    const who = src.kind === "notes" ? `Our notes from talking to ${src.from} say` : src.kind === "request" ? `The request from ${src.from} says` : src.kind === "transcript" ? `${src.from} said` : `${src.from} wrote`;
    return `${who}: "${span}"${/[.!?]$/.test(span) ? "" : "."}`;
  };
  const summary = (value: string | null | undefined, lead = "Our summary") => `${lead}: ${(value ?? "").trim().replace(/[.!?]+$/, "")}.`;
  /** The quote the entry's value came from, and its source. */
  const latest = (e: CoverageEntry | undefined) => { const q = e ? quoteFor(e.value, e.quotes) : null; return q ? { quote: q, source: e!.quote_sources?.[q] ?? null } : null; };
  return { said, summary, latest };
}

/** Everything still open, in the order the interview would ask it. */
export function findGaps(session: Session, fw: Framework): GapReport {
  const engine = session.session.engine!;
  const gaps: Gap[] = [];
  const readiness: Readiness[] = [];
  const live = session.items.filter((i) => !i.dropped);
  const primary = live.find((i) => !i.spawned_from);
  const q = quoter(session);
  const conflictGap = (item: Item, area: string, e: CoverageEntry | undefined, c: NonNullable<AreaState["conflict"]>): Gap => {
    const before = c.against ?? q.latest(e);
    const one = q.said(before?.quote, before?.source) ?? q.summary(e?.value, "Our summary of one answer");
    const two = q.said(c.quote, c.source) ?? q.summary(c.value, "Our summary of the other");
    const ask = fw.areas.get(area)!.packet.ask;
    return { kind: "conflict", item: item.id, target: area, pair: [before?.quote ?? e?.value ?? "", c.quote], ask, question: `We have two different answers here. ${one} ${two} Which is right? (${ask})` };
  };
  const confirmGap = (item: Item, area: string, e: CoverageEntry, ask: string): Gap => {
    const last = q.latest(e);
    return { kind: "confirm", item: item.id, target: area, question: `${q.said(last?.quote, last?.source) ?? q.summary(e.value)} ${ask}` };
  };
  const NOTES_ASK = "Is that right? Please say it in your own words.";

  for (const item of [...live.filter((i) => !i.spawned_from), ...live.filter((i) => i.spawned_from)]) {
    const queue = queueFor(item, fw);
    const critical = new Set(criticalAreas(item, fw));
    let answered = 0;
    const open: string[] = [];
    for (const area of queue) {
      const e = entryOf(session, item, area);
      // A follow-on item's core area shares the primary's state (one key for both): its conflict or
      // partial is the primary's, asked there, not copied onto the follow-on.
      const st = item.spawned_from && area.startsWith("core.") ? { ...stateOf(engine, areaKey(item, area)), conflict: null, partial: null } : stateOf(engine, areaKey(item, area));
      const def = fw.areas.get(area)!;
      if (st.conflict) {
        gaps.push(conflictGap(item, area, e, st.conflict));
        open.push(`${areaLabel(area)}: two answers disagree`);
        continue;
      }
      if (!e || e.status === "unknown") {
        gaps.push({ kind: "unknown", item: item.id, target: area, question: def.packet.ask });
        open.push(`${areaLabel(area)}: not answered`);
        continue;
      }
      if (e.status === "assumed" && st.partial) {
        const words = q.said(st.partial.quote, st.partial.quote ? e.quote_sources?.[st.partial.quote] : null) ?? q.summary(st.partial.value ?? e.value);
        gaps.push({ kind: "partial", item: item.id, target: area, quoted: st.partial.quote ?? st.partial.value ?? "", ask: def.packet.ask, question: `${words} Could you say more? ${def.packet.ask}` });
        open.push(`${areaLabel(area)}: only partly answered`);
        continue;
      }
      const notesOnly = e.status === "assumed" && e.quotes.length > 0 && e.quotes.every((x) => session.session.sources?.find((s) => s.id === e.quote_sources?.[x])?.kind === "notes");
      if (notesOnly) {
        gaps.push(confirmGap(item, area, e, NOTES_ASK));
        open.push(`${areaLabel(area)}: from notes only, needs the stakeholder to confirm`);
        continue;
      }
      if (e.status === "assumed" && critical.has(area)) {
        gaps.push(confirmGap(item, area, e, "Is that right?"));
        open.push(`${areaLabel(area)}: needs confirming`);
        continue;
      }
      answered++;
    }
    // Source rule: an optional area answered only in the interviewer's notes also goes back to the
    // stakeholder to confirm.
    const optional = ["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)].flatMap((m) => fw.modules[m]?.areas.map((x) => x.id) ?? []).filter((id) => !queue.includes(id));
    for (const area of [...new Set(optional)]) {
      if (item.spawned_from && area.startsWith("core.")) continue;
      const e = entryOf(session, item, area);
      // A disagreement is asked about wherever it was found, required or not (worked example: the
      // 6am vs 7am conflict landed on delivery, an optional area, and was never asked).
      const st = stateOf(engine, areaKey(item, area));
      if (st.conflict) {
        gaps.push(conflictGap(item, area, e, st.conflict));
        open.push(`${areaLabel(area)}: two answers disagree`);
        continue;
      }
      if (e?.status === "assumed" && e.quotes.length && e.quotes.every((x) => session.session.sources?.find((s) => s.id === e.quote_sources?.[x])?.kind === "notes")) {
        gaps.push(confirmGap(item, area, e, NOTES_ASK));
        open.push(`${areaLabel(area)}: from notes only, needs the stakeholder to confirm`);
      }
    }
    // A baseline needs a number with a unit somewhere in what they said (the live engine's cost probe).
    if (!item.spawned_from) {
      const outcome = entryOf(session, item, "core.outcome");
      if (outcome && outcome.status !== "unknown" && !sessionQuotes(session).some(hasNumber)) {
        const q = fw.scoring.gap_questions?.success_metric?.question ?? "What number would show this worked, and what is that number today?";
        gaps.push({ kind: "baseline", item: item.id, target: "core.outcome", question: q });
        open.push(`${areaLabel("core.outcome")}: no number for how things are today`);
      }
    }
    if (item === primary) {
      for (const area of fw.router.checks?.existing_asset.areas ?? []) {
        const e = entryOf(session, item, area);
        if (queue.includes(area) && e && e.status !== "unknown" && !settled(session, item, "existing_asset")) {
          gaps.push({ kind: "check", item: item.id, target: "existing_asset", question: fw.areas.get(area)!.packet.ask });
          open.push("Existing tools check: no clear yes or no");
        }
      }
      if (manualCheckDue(session, item, fw)) { gaps.push({ kind: "check", item: item.id, target: "manual_work", question: MANUAL_QUESTION }); open.push("Manual-work check: no clear yes or no"); }
      if (killCheckDue(session, item, fw)) { gaps.push({ kind: "check", item: item.id, target: "kill_criteria", question: fw.router.checks!.kill_criteria.question }); open.push("What would make them stop it: not said"); }
    }
    readiness.push({ item: item.id, title: item.title, required: queue.length, answered, open });
  }

  for (const t of (session.terms ?? []).filter((x) => x.status !== "not_a_term")) {
    const draftFromNotes = t.draft && session.session.sources?.find((x) => x.id === t.draft!.source)?.kind === "notes";
    const first = t.definition ? (t.quotes.length ? { quote: t.quotes.at(-1)!, source: t.source } : null) : t.draft ? { quote: t.draft.quote, source: t.draft.source } : null;
    if (t.conflict) {
      const one = q.said(first?.quote, first?.source) ?? q.summary(t.definition ?? t.draft?.definition, "Our summary of one definition");
      const two = q.said(t.conflict.quote, t.conflict.source) ?? q.summary(t.conflict.definition, "Our summary of the other");
      gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `Two definitions of ${t.term} disagree. ${one} ${two} Which is right? Please say what counts and what doesn't, in your own words.` });
    } else if (t.draft && draftFromNotes) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `On what ${t.term} means: ${q.said(t.draft.quote, t.draft.source) ?? q.summary(t.draft.definition)} Is that right? Please say what counts and what doesn't, in your own words.` });
    else if (t.status === "unconfirmed" && t.draft) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `On what ${t.term} means: ${q.said(t.draft.quote, t.draft.source) ?? q.summary(t.draft.definition)} That wasn't certain. What exactly counts, and what doesn't?` });
    else if (t.status === "unconfirmed") gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: termQuestion(t) });
    else continue;
    for (const r of readiness.filter((x) => t.items.includes(x.item))) r.open.push(`"${t.term}": ${t.conflict ? "two definitions disagree" : draftFromNotes ? "defined in notes only, needs the owner to confirm" : "no confirmed definition"}`);
  }
  // One question per definition: when a metric term is open for an item, its term-named question
  // ("How exactly do you calculate 'variance'?") replaces the generic "how is one counted?" area
  // question for that item (live test: both were asked).
  const openMetric = new Set((session.terms ?? []).filter((t) => t.kind === "metric" && (t.status === "unconfirmed" || t.conflict)).flatMap((t) => t.items));
  const kept = gaps.filter((g) => !(g.kind !== "term" && DEFINITION_AREAS.includes(g.target) && g.item && openMetric.has(g.item)));
  return { gaps: dedupe(kept), readiness };
}

/**
 * Each thing is asked once (cycle-count test: 11 questions, with repeats): the same question for two
 * items (a shared core area), the same disagreement filed under two areas, and the same sentence
 * quoted back as partial for two areas, which becomes one question with both asks.
 */
function dedupe(gaps: Gap[]): Gap[] {
  const out: Gap[] = [];
  const seenQuestion = new Set<string>();
  const seenPair = new Map<string, Gap>();
  const byQuote = new Map<string, Gap>();
  for (const g of gaps) {
    if (seenQuestion.has(g.question)) continue;
    seenQuestion.add(g.question);
    if (g.pair) {
      const key = g.pair.map((x) => x.trim().toLowerCase()).join("\u0000");
      const first = seenPair.get(key);
      if (first) {
        // Filed under several areas, one area's prompt would mislead (retest: a threshold
        // disagreement ended with the decision area's "What will you do differently?").
        if (first.ask) { first.question = first.question.slice(0, -` (${first.ask})`.length); first.ask = undefined; }
        continue;
      }
      seenPair.set(key, g);
    }
    if (g.kind === "partial" && g.quoted) {
      const first = byQuote.get(g.quoted);
      if (first) {
        first.question = `${first.question} Also: ${g.ask}`;
        continue;
      }
      byQuote.set(g.quoted, g);
    }
    out.push(g);
  }
  return out;
}

/** One readiness line per item: "Daily pick report: 9 of 11 required answered; open: ...". */
export function readinessLines(r: GapReport): string[] {
  return r.readiness.map((x) => `${x.title}: ${x.answered} of ${x.required} required answered${x.open.length ? `; still open: ${x.open.join("; ")}` : "; ready for the summary"}.`);
}

/**
 * The line before a follow-on item's questions. A short name reads in a sentence ("Morning Excel
 * export" -> "About the morning Excel export you mentioned:"; an acronym or a day keeps its case); a longer
 * title, from a run before items had names, is shown as it is.
 */
const leadIn = (title: string) => {
  const name = title.replace(/…$/, "");
  if (name.split(/\s+/).length > 5 || name !== title) return `About this next part (${title}):`;
  const proper = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(name);
  return `About the ${/^[A-Z][a-z]/.test(name) && !proper ? name[0].toLowerCase() + name.slice(1) : name} you mentioned:`;
};

/**
 * The follow-up packet: only the open questions, as text to paste into an email. Empty when nothing
 * is open. The header names the item by its short title; a follow-on item's questions start with a
 * line naming it ("About the morning Excel export you mentioned:").
 */
export function followUpEmail(session: Session, r: GapReport): string {
  if (!r.gaps.length) return "";
  const primary = session.items.find((i) => !i.spawned_from && !i.dropped) ?? session.items[0];
  const lines = [`# A few follow-up questions about: ${primary?.title ?? ""}`, "", "Thanks for your answers. These are the only things still open. If you don't know, say so. That's a useful answer.", ""];
  let about: string | null = null;
  r.gaps.forEach((g, i) => {
    const item = session.items.find((x) => x.id === g.item);
    if (item?.spawned_from && about !== item.id) lines.push(leadIn(item.title), "");
    about = item?.spawned_from ? item.id : null;
    lines.push(`${i + 1}. ${g.question}`, "");
  });
  return enforceVerbatim(lines.join("\n").trimEnd() + "\n", (session.session.sources ?? []).map((x) => x.text));
}

// Async intake (HANDOFF.md, "Async intake mode", step 4): after each ingest, code lists what's still
// open and builds a follow-up packet that asks only that. Nothing here calls a model, and nothing
// already answered is asked again.

import type { Framework } from "../lib/framework.ts";
import { criticalAreas, termQuestion } from "../lib/gates.ts";
import { hasNumber, sessionQuotes } from "../lib/score.ts";
import type { Item, Session } from "../lib/session.ts";
import { areaLabel } from "../lib/summary.ts";
import { entryOf } from "./apply.ts";
import { areaKey, killCheckDue, manualCheckDue, queueFor, stateOf } from "./plan.ts";
import { MANUAL_QUESTION } from "./turn.ts";

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
  /** Partials: the words quoted back and the area's question, so one sentence is quoted back once. */
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

/** Everything still open, in the order the interview would ask it. */
export function findGaps(session: Session, fw: Framework): GapReport {
  const engine = session.session.engine!;
  const gaps: Gap[] = [];
  const readiness: Readiness[] = [];
  const live = session.items.filter((i) => !i.dropped);
  const primary = live.find((i) => !i.spawned_from);

  for (const item of [...live.filter((i) => !i.spawned_from), ...live.filter((i) => i.spawned_from)]) {
    const queue = queueFor(item, fw);
    const critical = new Set(criticalAreas(item, fw));
    let answered = 0;
    const open: string[] = [];
    for (const area of queue) {
      const e = entryOf(session, item, area);
      const st = stateOf(engine, areaKey(item, area));
      const def = fw.areas.get(area)!;
      if (st.conflict) {
        gaps.push({ kind: "conflict", item: item.id, target: area, pair: [e?.value ?? "", st.conflict.value ?? st.conflict.quote], question: `We have two different answers here: "${e?.value ?? ""}" and "${st.conflict.value ?? st.conflict.quote}". Which is right? (${def.packet.ask})` });
        open.push(`${areaLabel(area)}: two answers disagree`);
        continue;
      }
      if (!e || e.status === "unknown") {
        gaps.push({ kind: "unknown", item: item.id, target: area, question: def.packet.ask });
        open.push(`${areaLabel(area)}: not answered`);
        continue;
      }
      if (e.status === "assumed" && st.partial) {
        gaps.push({ kind: "partial", item: item.id, target: area, quoted: st.partial.quote ?? st.partial.value ?? "", ask: def.packet.ask, question: `You mentioned "${st.partial.quote ?? st.partial.value}". Could you say more? ${def.packet.ask}` });
        open.push(`${areaLabel(area)}: only partly answered`);
        continue;
      }
      const notesOnly = e.status === "assumed" && e.quotes.length > 0 && e.quotes.every((q) => session.session.sources?.find((x) => x.id === e.quote_sources?.[q])?.kind === "notes");
      if (notesOnly) {
        gaps.push({ kind: "confirm", item: item.id, target: area, question: `Our notes say: "${e.value}". Is that right? Please say it in your own words.` });
        open.push(`${areaLabel(area)}: from notes only, needs the stakeholder to confirm`);
        continue;
      }
      if (e.status === "assumed" && critical.has(area)) {
        gaps.push({ kind: "confirm", item: item.id, target: area, question: `We have: "${e.quotes.at(-1) ?? e.value}". Is that right?` });
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
        gaps.push({ kind: "conflict", item: item.id, target: area, pair: [e?.value ?? "", st.conflict.value ?? st.conflict.quote], question: `We have two different answers here: "${e?.value ?? ""}" and "${st.conflict.value ?? st.conflict.quote}". Which is right? (${fw.areas.get(area)!.packet.ask})` });
        open.push(`${areaLabel(area)}: two answers disagree`);
        continue;
      }
      if (e?.status === "assumed" && e.quotes.length && e.quotes.every((q) => session.session.sources?.find((x) => x.id === e.quote_sources?.[q])?.kind === "notes")) {
        gaps.push({ kind: "confirm", item: item.id, target: area, question: `Our notes say: "${e.value}". Is that right? Please say it in your own words.` });
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
    if (t.conflict) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `"${t.term}" was defined two ways: "${t.definition ?? t.draft?.definition}" and "${t.conflict.definition}". Which is right? Please say it in your own words.` });
    else if (t.draft && draftFromNotes) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `Our notes define "${t.term}" as "${t.draft.definition}". Is that right? Please say what counts and what doesn't, in your own words.` });
    else if (t.status === "unconfirmed" && t.draft) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `You described "${t.term}" as "${t.draft.definition}", but weren't sure about all of it. What exactly counts, and what doesn't?` });
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
  const seenPair = new Set<string>();
  const byQuote = new Map<string, Gap>();
  for (const g of gaps) {
    if (seenQuestion.has(g.question)) continue;
    seenQuestion.add(g.question);
    if (g.pair) {
      const key = g.pair.map((x) => x.trim().toLowerCase()).join("\u0000");
      if (seenPair.has(key)) continue;
      seenPair.add(key);
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

/** The follow-up packet: only the open questions, as text to paste into an email. Empty when nothing is open. */
export function followUpEmail(session: Session, r: GapReport): string {
  if (!r.gaps.length) return "";
  const request = session.session.sources?.find((s) => s.kind === "request")?.text ?? session.items[0]?.title ?? "";
  const lines = [`# A few follow-up questions about: ${request}`, "", "Thanks for your answers. These are the only things still open. If you don't know, say so. That's a useful answer.", ""];
  r.gaps.forEach((g, i) => lines.push(`${i + 1}. ${g.question}`, ""));
  return lines.join("\n").trimEnd() + "\n";
}

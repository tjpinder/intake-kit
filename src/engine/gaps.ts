// Async intake (HANDOFF.md, "Async intake mode", step 4): after each ingest, code lists what's still
// open and builds a follow-up packet that asks only that. Nothing here calls a model, and nothing
// already answered is asked again.

import type { Framework } from "../lib/framework.ts";
import { criticalAreas } from "../lib/gates.ts";
import { hasNumber, sessionQuotes } from "../lib/score.ts";
import type { Item, Session } from "../lib/session.ts";
import { entryOf } from "./apply.ts";
import { areaKey, killCheckDue, manualCheckDue, queueFor, stateOf } from "./plan.ts";
import { MANUAL_QUESTION } from "./turn.ts";

export type GapKind = "unknown" | "partial" | "conflict" | "confirm" | "baseline" | "check" | "term";

export interface Gap {
  kind: GapKind;
  item: string | null;
  /** A coverage ID, a check name, or a term ID. */
  target: string;
  question: string;
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
        gaps.push({ kind: "conflict", item: item.id, target: area, question: `We have two different answers here: "${e?.value ?? ""}" and "${st.conflict.value ?? st.conflict.quote}". Which is right? (${def.packet.ask})` });
        open.push(`${area}: two answers disagree`);
        continue;
      }
      if (!e || e.status === "unknown") {
        gaps.push({ kind: "unknown", item: item.id, target: area, question: def.packet.ask });
        open.push(`${area}: not answered`);
        continue;
      }
      if (e.status === "assumed" && st.partial) {
        gaps.push({ kind: "partial", item: item.id, target: area, question: `You mentioned "${st.partial.quote ?? st.partial.value}". Could you say more? ${def.packet.ask}` });
        open.push(`${area}: only partly answered`);
        continue;
      }
      const notesOnly = e.status === "assumed" && e.quotes.length > 0 && e.quotes.every((q) => session.session.sources?.find((x) => x.id === e.quote_sources?.[q])?.kind === "notes");
      if (notesOnly) {
        gaps.push({ kind: "confirm", item: item.id, target: area, question: `Our notes say: "${e.value}". Is that right? Please say it in your own words.` });
        open.push(`${area}: from notes only, needs the stakeholder to confirm`);
        continue;
      }
      if (e.status === "assumed" && critical.has(area)) {
        gaps.push({ kind: "confirm", item: item.id, target: area, question: `We have: "${e.quotes.at(-1) ?? e.value}". Is that right?` });
        open.push(`${area}: needs confirming`);
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
      if (e?.status === "assumed" && e.quotes.length && e.quotes.every((q) => session.session.sources?.find((x) => x.id === e.quote_sources?.[q])?.kind === "notes")) {
        gaps.push({ kind: "confirm", item: item.id, target: area, question: `Our notes say: "${e.value}". Is that right? Please say it in your own words.` });
        open.push(`${area}: from notes only, needs the stakeholder to confirm`);
      }
    }
    // A baseline needs a number with a unit somewhere in what they said (the live engine's cost probe).
    if (!item.spawned_from) {
      const outcome = entryOf(session, item, "core.outcome");
      if (outcome && outcome.status !== "unknown" && !sessionQuotes(session).some(hasNumber)) {
        const q = fw.scoring.gap_questions?.success_metric?.question ?? "What number would show this worked, and what is that number today?";
        gaps.push({ kind: "baseline", item: item.id, target: "core.outcome", question: q });
        open.push("core.outcome: no number for how things are today");
      }
    }
    if (item === primary) {
      for (const area of fw.router.checks?.existing_asset.areas ?? []) {
        const e = entryOf(session, item, area);
        if (queue.includes(area) && e && e.status !== "unknown" && !settled(session, item, "existing_asset")) {
          gaps.push({ kind: "check", item: item.id, target: "existing_asset", question: fw.areas.get(area)!.packet.ask });
          open.push("existing-asset check: no clear yes or no");
        }
      }
      if (manualCheckDue(session, item, fw)) { gaps.push({ kind: "check", item: item.id, target: "manual_work", question: MANUAL_QUESTION }); open.push("manual-work check: no clear yes or no"); }
      if (killCheckDue(session, item, fw)) { gaps.push({ kind: "check", item: item.id, target: "kill_criteria", question: fw.router.checks!.kill_criteria.question }); open.push("kill criteria: not said"); }
    }
    readiness.push({ item: item.id, title: item.title, required: queue.length, answered, open });
  }

  for (const t of (session.terms ?? []).filter((x) => x.status !== "not_a_term")) {
    const draftFromNotes = t.draft && session.session.sources?.find((x) => x.id === t.draft!.source)?.kind === "notes";
    if (t.draft && draftFromNotes) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `Our notes define "${t.term}" as "${t.draft.definition}". Is that right? Please say what counts and what doesn't, in your own words.` });
    else if (t.status === "unconfirmed" && t.draft) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `You described "${t.term}" as "${t.draft.definition}", but weren't sure about all of it. What exactly counts, and what doesn't?` });
    else if (t.status === "unconfirmed") gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `In your own words, what counts as "${t.term}", and what doesn't? Give one real example and the right ${t.kind === "metric" ? "count" : "result"}.` });
    else if (t.conflict) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `"${t.term}" was defined two ways: "${t.definition}" and "${t.conflict.definition}". Which is right?` });
    else continue;
    for (const r of readiness.filter((x) => t.items.includes(x.item))) r.open.push(`"${t.term}": ${draftFromNotes ? "defined in notes only, needs the owner to confirm" : t.status === "unconfirmed" ? "no confirmed definition" : "two definitions disagree"}`);
  }
  return { gaps, readiness };
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

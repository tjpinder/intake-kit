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
      if (e.status === "assumed" && critical.has(area)) {
        gaps.push({ kind: "confirm", item: item.id, target: area, question: `We have: "${e.quotes.at(-1) ?? e.value}". Is that right?` });
        open.push(`${area}: needs confirming`);
        continue;
      }
      answered++;
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
    if (t.status === "unconfirmed" && t.draft) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `You described "${t.term}" as "${t.draft.definition}", but weren't sure about all of it. What exactly counts, and what doesn't?` });
    else if (t.status === "unconfirmed") gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `In your own words, what counts as "${t.term}", and what doesn't? Give one real example and the right ${t.kind === "metric" ? "count" : "result"}.` });
    else if (t.conflict) gaps.push({ kind: "term", item: t.items[0] ?? null, target: t.id, question: `"${t.term}" was defined two ways: "${t.definition}" and "${t.conflict.definition}". Which is right?` });
    else continue;
    for (const r of readiness.filter((x) => t.items.includes(x.item))) r.open.push(`"${t.term}": ${t.status === "unconfirmed" ? "no confirmed definition" : "two definitions disagree"}`);
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
  const lines = [`# A few follow-up questions about: ${request}`, "", "Thanks for your answers. These are the only things still open. Rough answers and real examples help most.", ""];
  r.gaps.forEach((g, i) => lines.push(`${i + 1}. ${g.question}`, ""));
  return lines.join("\n").trimEnd() + "\n";
}

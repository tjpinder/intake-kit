// Async intake (HANDOFF.md, "Async intake mode", step 5): the summary, the interviewer's
// corrections and sign-off. The write-up is the same call as the live interview's, grounded in the
// pasted sources. Corrections are made per area or per term, in the interviewer's words, and are
// recorded as their notes, so a correction can't land on the wrong area. At sign-off each
// definitive Don't-build reason is confirmed on its own.

import type { Framework } from "../lib/framework.ts";
import { scoreAndGate } from "../lib/gates.ts";
import { validateWriteUp } from "../lib/schemas.ts";
import type { Session } from "../lib/session.ts";
import { buildSummary, dontBuildChecks, summaryText } from "../lib/summary.ts";
import { writeUpRequest } from "../llm/v2.ts";
import type { Provider } from "../llm/types.ts";
import { areaFits, setEntry, entryOf } from "./apply.ts";
import { sourceTranscript } from "./ingest.ts";
import { areaKey, stateOf } from "./plan.ts";
import type { EngineCall } from "./turn.ts";
import { applyWriteUp, enterSummary, type WriteUp } from "./writeup.ts";

export class AsyncError extends Error {}

export interface AsyncSummaryOutcome {
  session: Session;
  calls: EngineCall[];
  events: string[];
  summary: string;
  /** The Don't-build reasons to confirm one by one at sign-off. */
  confirm: Array<{ key: string; question: string }>;
}

/** Writes up each item from the sources and renders the summary for the interviewer to check. */
export async function runAsyncSummary(input: { provider: Provider; fw: Framework; session: Session; now: string; signal?: AbortSignal }): Promise<AsyncSummaryOutcome> {
  const { fw, provider, now } = input;
  if (input.session.session.channel !== "async") throw new AsyncError("not an async intake");
  if (input.session.session.engine?.phase === "confirmed") throw new AsyncError("this intake is signed off");
  let s: Session = structuredClone(input.session);
  const transcript = sourceTranscript(s);
  const calls: EngineCall[] = [];
  const events: string[] = [];
  for (const item of s.items.filter((i) => !i.dropped && !i.spawned_from)) {
    const req = writeUpRequest(fw, s, item, transcript);
    let w: WriteUp | null = null;
    for (let attempt = 0; attempt < 3 && !w; attempt++) {
      const r = await provider.complete(req, input.signal);
      let parsed: unknown;
      try { parsed = JSON.parse(r.text); } catch { parsed = undefined; }
      const v = parsed === undefined ? { ok: false, errors: ["not JSON"] } : validateWriteUp(parsed);
      calls.push({ name: "write_up", model: r.model, usage: r.usage, text: r.text, ok: v.ok, problem: v.ok ? null : v.errors.slice(0, 3).join("; ") });
      if (v.ok) w = parsed as WriteUp;
    }
    if (!w) { events.push(`write-up for ${item.id} failed; the summary renders without it`); continue; }
    item.facts = {};
    events.push(...applyWriteUp(s, item.id, w, fw, transcript).map((d) => `write-up dropped ${d}`));
  }
  s = enterSummary(s, fw, now);
  return { session: s, calls, events, summary: summaryText(buildSummary(s, fw)), confirm: dontBuildChecks(s, fw) };
}

/**
 * The interviewer corrects one area, or one term's definition, in their own words. It's recorded
 * as their notes (a source) and the summary has to be written up again.
 */
export function correct(original: Session, fw: Framework, c: { item?: string; area?: string; term?: string; text: string; by: string; now: string }): Session {
  const s: Session = structuredClone(original);
  if (s.session.channel !== "async") throw new AsyncError("not an async intake");
  if (s.session.engine?.phase === "confirmed") throw new AsyncError("this intake is signed off");
  const text = c.text.trim();
  if (!text) throw new AsyncError("the correction is empty");
  if (!!c.area === !!c.term) throw new AsyncError("correct one area or one term");
  const list = s.session.sources ?? (s.session.sources = []);
  const id = `src-${list.length + 1}`;
  list.push({ id, kind: "notes", from: c.by, added_at: c.now, text });
  if (c.area) {
    const item = s.items.find((i) => i.id === (c.item ?? "item-1") && !i.dropped);
    if (!item || !areaFits(item, c.area, fw)) throw new AsyncError(`${c.area} isn't an area of ${c.item ?? "item-1"}`);
    const prev = entryOf(s, item, c.area);
    setEntry(s, item, c.area, { status: "covered", value: text, quotes: [text], probe_count: prev?.probe_count ?? 0, updated_at: c.now, quote_sources: { [text]: id } });
    const key = areaKey(item, c.area);
    s.session.engine!.areas[key] = { ...stateOf(s.session.engine!, key), conflict: null, partial: null };
    (s.session.asked ??= {})[key] ??= c.now;
  } else {
    const t = (s.terms ?? []).find((x) => x.term.toLowerCase() === c.term!.trim().toLowerCase());
    if (!t) throw new AsyncError(`no term "${c.term}"`);
    Object.assign(t, { status: "confirmed", definition: text, quotes: [text], given_by: c.by, source: id, conflict: null });
  }
  const rb = s.session.reflect_back;
  if (rb) s.session.reflect_back = { ...rb, corrections: [...rb.corrections, `${c.area ?? `term "${c.term}"`}: ${text}`] };
  // The summary is out of date: back to collecting until it's written up again.
  s.session.engine!.phase = "collecting";
  s.session.engine!.pending = null;
  return s;
}

/**
 * The interviewer signs off. Each definitive Don't-build reason counts only if its key is
 * confirmed; one left out routes its item to Gather more. Code then scores and gates.
 */
export function signOff(original: Session, fw: Framework, o: { confirm: string[]; by: string }): Session {
  const s: Session = structuredClone(original);
  if (s.session.channel !== "async") throw new AsyncError("not an async intake");
  if (s.session.engine?.phase !== "summary" || !s.session.reflect_back) throw new AsyncError("write the summary first, and check it, before signing off");
  const allowed = new Set(dontBuildChecks(s, fw).map((c) => c.key));
  const unknown = o.confirm.filter((k) => !allowed.has(k));
  if (unknown.length) throw new AsyncError(`nothing to confirm for ${unknown.join(", ")}; the summary lists ${[...allowed].join(", ") || "none"}`);
  s.session.reflect_back = { ...s.session.reflect_back, confirmed: true, dont_build_confirmed: [...new Set(o.confirm)], signed_off_by: o.by };
  s.session.engine!.phase = "confirmed";
  s.session.engine!.pending = null;
  return scoreAndGate(s, fw).session;
}

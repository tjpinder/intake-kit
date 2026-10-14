// Apply and Spawn: code applies the model's classification of one reply (HANDOFF.md, Interview
// engine v2, steps 5 and 6). Every quote is checked against the user's own messages first; a
// quote that isn't theirs is dropped, so nothing can be recorded on invented words.

import type { Framework, ItemType } from "../lib/framework.ts";
import { findQuote, type TranscriptEntry } from "../lib/grounding.ts";
import type { CoverageEntry, Item, Session } from "../lib/session.ts";
import { areaKey, stateOf } from "./plan.ts";
import { shortTitle } from "../lib/title.ts";
import type { AreaState, Extraction, Pending } from "./types.ts";

export interface ApplyContext {
  fw: Framework;
  transcript: TranscriptEntry[];
  now: string;
}

export interface ApplyOutcome {
  session: Session;
  /** What happened, for the debug log. */
  events: string[];
  /** The user asked to wrap up. */
  wrapUp: boolean;
}

const CORE = ["users", "outcome", "data", "systems", "constraints", "trust"] as const;

/** The user's words, or null: a quote that isn't a span of one of their messages is dropped. */
export function grounded(quote: string | null | undefined, transcript: TranscriptEntry[]): string | null {
  return quote && quote.trim() && findQuote(quote, transcript) ? quote : null;
}

/** Whether an area belongs to an item (shared core, its type's module, or its modifiers'). */
export function areaFits(item: Item, area: string, fw: Framework): boolean {
  if (!fw.areas.has(area)) return false;
  if (area.startsWith("core.")) return true;
  const module = area.startsWith("mod.") ? area.split(".").slice(0, 2).join(".") : area.split(".")[0];
  return module === item.type || item.modifiers.some((m) => `mod.${m}` === module);
}

/** Read and write an area's entry: shared core for the primary item, an override for a follow-on. */
export function entryOf(session: Session, item: Item, area: string): CoverageEntry | undefined {
  if (!area.startsWith("core.")) return item.coverage[area];
  const k = area.slice(5) as (typeof CORE)[number];
  return item.spawned_from ? (item.core_overrides[k] ?? session.core[k]) : session.core[k];
}
export function setEntry(session: Session, item: Item, area: string, entry: CoverageEntry): void {
  if (!area.startsWith("core.")) item.coverage[area] = entry;
  else if (item.spawned_from) item.core_overrides[area.slice(5)] = entry;
  else session.core[area.slice(5) as (typeof CORE)[number]] = entry;
}

const setState = (session: Session, item: Item, area: string, patch: Partial<AreaState>) => {
  const engine = session.session.engine!;
  const key = areaKey(item, area);
  engine.areas[key] = { ...stateOf(engine, key), ...patch };
};

function record(session: Session, item: Item, area: string, status: CoverageEntry["status"], value: string | null, quote: string | null, now: string): void {
  const prev = entryOf(session, item, area);
  const quotes = [...(prev?.quotes ?? [])];
  if (quote && !quotes.includes(quote)) quotes.push(quote);
  const v = status === "unknown" ? null : value ?? quote;
  setEntry(session, item, area, { status, value: v, quotes, probe_count: stateOf(session.session.engine!, areaKey(item, area)).probed ? 1 : 0, updated_at: now });
}

/** Other areas the reply answers, each only with its own quote, and only if still open. */
function applyAlso(session: Session, item: Item, x: Extraction, ctx: ApplyContext, events: string[]): void {
  for (const a of x.also_answers) {
    const quote = grounded(a.quote, ctx.transcript);
    if (!quote) { events.push(`also ${a.area}: quote isn't the user's words, ignored`); continue; }
    if (!areaFits(item, a.area, ctx.fw)) { events.push(`also ${a.area}: doesn't apply to ${item.id}, ignored`); continue; }
    const e = entryOf(session, item, a.area);
    if (e?.updated_at && e.status !== "unknown") continue;
    record(session, item, a.area, "covered", a.value, quote, ctx.now);
    const asked = session.session.asked ?? (session.session.asked = {});
    asked[areaKey(item, a.area)] ??= ctx.now;
    events.push(`also ${a.area}: covered`);
  }
}

/**
 * Applies the reply to an ask, probe or confirmation (and the area of an existing-asset check):
 * - answered with a grounded quote: covered
 * - partial or off-topic (or "answered" with no quote of theirs) on the first ask: kept, and one
 *   probe is queued; after the probe: assumed if anything was quoted, otherwise unknown
 * - not applicable or declined: marked as such, never asked again
 * - confirmation of an assumed critical answer: yes makes it covered; no discards the value and
 *   marks it unknown; anything else leaves it assumed. Asked once.
 */
export function applyAnswer(original: Session, pending: Pending, x: Extraction, ctx: ApplyContext): ApplyOutcome {
  const session: Session = structuredClone(original);
  const events: string[] = [];
  const item = session.items.find((i) => i.id === pending.item);
  if (!item) return { session: original, events: [`unknown item ${pending.item}`], wrapUp: x.wrap_up };
  const area = pending.area;
  const quote = grounded(x.quote, ctx.transcript);
  if (x.quote && !quote) events.push(`${area}: quote isn't the user's words, dropped`);

  if (pending.kind === "confirm") {
    const e = entryOf(session, item, area);
    if (e && x.check === "yes") { setEntry(session, item, area, { ...e, status: "covered", updated_at: ctx.now }); events.push(`${area}: confirmed, covered`); }
    else if (e && x.check === "no") { setEntry(session, item, area, { ...e, status: "unknown", value: null, updated_at: ctx.now }); events.push(`${area}: not confirmed, unknown`); }
    else events.push(`${area}: confirmation unclear, stays assumed`);
    setState(session, item, area, { confirm: "done" });
  } else if (pending.kind === "probe" && entryOf(session, item, area)?.status === "covered") {
    // A follow-up on an answer already covered (the baseline question) only adds to it.
    const e = entryOf(session, item, area)!;
    if (x.status === "answered" && quote) setEntry(session, item, area, { ...e, quotes: e.quotes.includes(quote) ? e.quotes : [...e.quotes, quote], probe_count: 1, updated_at: ctx.now });
    else setEntry(session, item, area, { ...e, probe_count: 1 });
    events.push(`${area}: follow-up ${x.status === "answered" && quote ? "added" : "added nothing"}; stays covered`);
  } else if (x.status === "not_applicable" || x.status === "declined") {
    record(session, item, area, x.status, x.value, quote, ctx.now);
    setState(session, item, area, { partial: null });
    events.push(`${area}: ${x.status}`);
  } else if (x.status === "answered" && quote) {
    record(session, item, area, "covered", x.value, quote, ctx.now);
    setState(session, item, area, { partial: null });
    events.push(`${area}: covered`);
  } else {
    // partial, off-topic, or an answer with no quote of the user's.
    const st = stateOf(session.session.engine!, areaKey(item, area));
    if (pending.kind === "probe" || st.probed) {
      const q = quote ?? st.partial?.quote ?? null;
      const v = x.value ?? st.partial?.value ?? null;
      if (q) record(session, item, area, "assumed", v, q, ctx.now);
      else record(session, item, area, "unknown", null, null, ctx.now);
      setState(session, item, area, { partial: null });
      events.push(`${area}: unresolved after its probe, ${q ? "assumed" : "unknown"}`);
    } else {
      setState(session, item, area, { partial: { value: x.value, quote } });
      events.push(`${area}: ${x.status}, one probe queued`);
    }
  }
  applyAlso(session, item, x, ctx, events);
  return { session, events, wrapUp: x.wrap_up };
}

/**
 * Spawn: only check questions can create an item. The manual-work check creates its follow-on
 * item only on yes with a grounded quote; unclear (or yes without the user's words) is asked once
 * more, then treated as no. An existing-asset check records its result and spawns only if the
 * framework names a type for it.
 */
export function applyCheck(original: Session, pending: Pending, x: Extraction, ctx: ApplyContext): ApplyOutcome {
  const session: Session = structuredClone(original);
  const events: string[] = [];
  const engine = session.session.engine!;
  const key = `${pending.item}:${pending.check}`;
  const state = engine.checks[key] ?? { asks: 0, result: null };
  const quote = grounded(x.quote, ctx.transcript);
  const check = pending.check === "manual_work" ? ctx.fw.router.checks?.manual_work : ctx.fw.router.checks?.existing_asset;
  let result = x.check === "yes" && quote ? "yes" : x.check === "no" ? "no" : "unclear";
  if (x.check === "yes" && !quote) events.push(`${pending.check}: yes without the user's words, treated as unclear`);
  if (result === "unclear" && state.asks >= 2) result = "no";
  engine.checks[key] = { asks: state.asks, result: result === "unclear" ? null : (result as "yes" | "no") };
  if (pending.check === "kill_criteria") {
    // The answer joins its area's quotes and is kept on the check, so the write-up can't lose it.
    engine.checks[key] = { ...engine.checks[key], quote: result === "yes" ? quote : null, value: result === "yes" ? (x.value?.trim() || quote) : null };
    const item = session.items.find((i) => i.id === pending.item);
    if (result === "yes" && item && quote) {
      const prev = entryOf(session, item, pending.area);
      const known = prev && prev.status !== "unknown" && prev.value;
      setEntry(session, item, pending.area, {
        status: known ? prev.status : "covered",
        value: known ? prev.value : (x.value?.trim() || quote),
        quotes: [...new Set([...(prev?.quotes ?? []), quote])],
        probe_count: prev?.probe_count ?? 0,
        updated_at: ctx.now,
      });
    }
  }
  events.push(`${pending.check}: ${result}${result === "unclear" ? ", asked once more" : ""}`);

  const primary = session.items.find((i) => i.id === pending.item);
  const spawns: ItemType | null | undefined = check?.spawns;
  if (result === "yes" && spawns && primary) {
    const id = `item-${session.items.reduce((n, i) => Math.max(n, Number(i.id.slice(5)) || 0), 0) + 1}`;
    const title = shortTitle(x.value?.trim() || "Manual work done today");
    session.items.push({
      id, title, type: spawns, confidence: "med", trigger_quote: quote!, modifiers: [],
      spawned_from: primary.id,
      // The manual-work check asks about work the primary item would replace.
      superseded_by: pending.check === "manual_work" ? primary.id : null,
      type_history: [{ from: null, to: spawns, reason: `spawned from ${primary.id} by the ${pending.check} check`, quote: quote!, at: ctx.now }],
      core_overrides: {}, coverage: {}, facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [],
    });
    events.push(`${pending.check}: created ${id} (${spawns})`);
  }
  if (pending.check === "existing_asset" && primary) {
    // The existing-asset question is also the area's question.
    const answered = applyAnswer(session, { ...pending, kind: "ask" }, x, ctx);
    return { session: answered.session, events: [...events, ...answered.events], wrapUp: x.wrap_up };
  }
  return { session, events, wrapUp: x.wrap_up };
}

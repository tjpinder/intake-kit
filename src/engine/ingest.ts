// Async intake (HANDOFF.md, "Async intake mode"): triage starts the session, and each pasted
// source (a reply, meeting notes, a call transcript) is read against every area at once. The model
// only classifies the source; code checks every quote against that source and applies the same
// rules as the live interview. A later source never silently overwrites an earlier one: a
// disagreement is kept as a conflict for the follow-up packet to settle.

import type { Framework, ItemType, Modifier } from "../lib/framework.ts";
import { normalize, quoteFor, type TranscriptEntry } from "../lib/grounding.ts";
import { validateIngest } from "../lib/schemas.ts";
import type { CoverageEntry, Session, Source, Term } from "../lib/session.ts";
import { ingestRequest } from "../llm/v2.ts";
import { ProviderError, type Provider } from "../llm/types.ts";
import { applyCheck, areaFits, entryOf, grounded, setEntry, type ApplyContext } from "./apply.ts";
import { areaKey, stateOf } from "./plan.ts";
import type { EngineCall } from "./turn.ts";
import { newEngine } from "./types.ts";
import { shortTitle } from "../lib/title.ts";

/** Sources longer than this are read in chunks, split on paragraph breaks. */
export const CHUNK_CHARS = 12000;

export interface TriageInput {
  id: string;
  request: string;
  type: ItemType;
  modifiers?: Modifier[];
  title?: string;
  /** Who the request came from. */
  from: string;
  provider: Session["session"]["provider"];
  now: string;
}

/** Triage: the interviewer's one-line request and chosen type start an async session. No model call. */
export function startAsync(fw: Framework, t: TriageInput): Session {
  const unknown = (): CoverageEntry => ({ status: "unknown", value: null, quotes: [], probe_count: 0 });
  const engine = newEngine();
  engine.phase = "collecting";
  return {
    schema_version: 2,
    framework_version: fw.router.framework_version as string,
    session: {
      id: t.id, started_at: t.now, mode: "stakeholder", channel: "async", provider: t.provider, grounding: "transcript", reflect_back: null, asked: {}, engine,
      sources: [{ id: "src-1", kind: "request", from: t.from, added_at: t.now, text: t.request }],
    },
    core: { users: unknown(), outcome: unknown(), data: unknown(), systems: unknown(), constraints: unknown(), trust: unknown() },
    items: [{
      id: "item-1", title: shortTitle(t.title ?? t.request), type: t.type, confidence: "high", trigger_quote: t.request, modifiers: t.modifiers ?? [],
      spawned_from: null, superseded_by: null,
      type_history: [{ from: null, to: t.type, reason: "triage", quote: t.request, at: t.now }],
      core_overrides: {}, coverage: {}, facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [],
    }],
  };
}

/** Every source as a transcript entry: downstream grounding (write-up, summary) checks quotes against these. */
export function sourceTranscript(session: Session): TranscriptEntry[] {
  return (session.session.sources ?? []).map((s) => ({ role: "user", text: s.text, at: s.added_at }));
}

/** Splits a long source on paragraph breaks into chunks of at most CHUNK_CHARS (a longer paragraph stays whole). */
export function chunks(text: string, max = CHUNK_CHARS): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let cur = "";
  for (const para of text.split(/\n\s*\n/)) {
    if (cur && cur.length + para.length + 2 > max) { out.push(cur); cur = ""; }
    cur = cur ? `${cur}\n\n${para}` : para;
  }
  if (cur) out.push(cur);
  return out;
}

type CheckName = "manual_work" | "existing_asset" | "kill_criteria";

/** The areas and checks an ingest reads for each live item. */
function readTargets(session: Session, fw: Framework) {
  const c = fw.router.checks!;
  return session.items.filter((i) => !i.dropped).map((i) => {
    const mods = ["core", i.type, ...i.modifiers.map((m) => `mod.${m}`)];
    const areas = [...new Set(mods.flatMap((m) => fw.modules[m]?.areas.map((a) => a.id) ?? []))].filter((id) => !(i.spawned_from && id.startsWith("core.")));
    const checks: CheckName[] = [];
    if (!i.spawned_from) {
      if (c.manual_work.applies_to.includes(i.type) && !session.items.some((x) => x.type === c.manual_work.spawns)) checks.push("manual_work");
      if (areas.some((a) => c.existing_asset.areas.includes(a))) checks.push("existing_asset");
      if (c.kill_criteria.applies_to.includes(i.type)) checks.push("kill_criteria");
    }
    return { id: i.id, title: i.title, type: i.type, areas, checks };
  });
}

interface IngestResult {
  terms: Array<{ term: string; quote: string; kind: "metric" | "rule" | "label" }>;
  definitions: Array<{ term: string; definition: string; quotes: string[]; certain: boolean; measurable: "yes" | "partly" | "no" | "unknown"; examples: Array<{ case: string; expected: string }>; conflict: boolean }>;
  answers: Array<{ item: string; area: string; status: "answered" | "partial" | "not_applicable" | "declined"; value: string | null; quotes: string[]; conflict: boolean }>;
  checks: Array<{ item: string; check: CheckName; result: "yes" | "no" | "unclear"; value: string | null; quote: string | null; name?: string | null }>;
}

/**
 * Areas that ask what counts or what the rules are: a term's definition, a threshold in it, may be
 * recorded there too. Any other area doesn't take a definition's words (cycle-count test: the
 * requester's hedge about how a variance is calculated was filed under trust).
 */
const WHAT_COUNTS = new Set(["data_report.definition", "manual_process.rules", "core.constraints"]);

/** The kinds of number a text states: money, a time of day, a duration, a percentage. */
function numberKinds(text: string): Set<string> {
  const t = text.toLowerCase();
  const kinds = new Set<string>();
  if (/\$\s?\d|\d\s?(dollars|usd)\b/.test(t)) kinds.add("money");
  if (/\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\b\d{1,2}:\d{2}\b|\bnoon\b|\bmidnight\b/.test(t)) kinds.add("time");
  if (/\d\s?%|\bpercent\b/.test(t)) kinds.add("percent");
  if (/\d\s?(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b/.test(t)) kinds.add("duration");
  return kinds;
}

/** Both state a number and they share no kind: two different facts, never a disagreement. */
export function differentFacts(recorded: string, said: string): boolean {
  const x = numberKinds(recorded), y = numberKinds(said);
  return x.size > 0 && y.size > 0 && ![...x].some((k) => y.has(k));
}

/** Applies one chunk's ingest result. Every quote must be a span of this source. */
export function applyIngest(session: Session, source: Source, r: IngestResult, fw: Framework, now: string): string[] {
  const events: string[] = [];
  const transcript: TranscriptEntry[] = [{ role: "user", text: source.text, at: source.added_at }];
  const engine = session.session.engine!;
  const asked = session.session.asked ?? (session.session.asked = {});

  const fromNotes = source.kind === "notes";
  // One sentence can answer more than one area (where the data lives is both data and systems; a
  // deadline is both rules and delivery), so code doesn't stop a span from being filed twice: that
  // dropped decision, systems and delivery in the cycle-count retest. Only a definition's words are
  // kept to the term and the areas about what counts.
  const defined = r.definitions.flatMap((d) => d.quotes.map((q) => normalize(q))).filter(Boolean);
  const insideDefinition = (q: string) => { const x = normalize(q); return defined.some((d) => d.includes(x)); };
  for (const a of r.answers) {
    // The item named, or, if the model named something else (the type, say), the one live item the
    // area belongs to: each area belongs to one item's type (smoke test: "data_report" for "item-1").
    const live = session.items.filter((i) => !i.dropped);
    const fits = live.filter((i) => areaFits(i, a.area, fw));
    const item = live.find((i) => i.id === a.item) ?? (a.area.startsWith("core.") ? live.find((i) => !i.spawned_from) : fits.length === 1 ? fits[0] : undefined);
    if (!item || !areaFits(item, a.area, fw)) { events.push(`${a.item}:${a.area}: doesn't apply, ignored`); continue; }
    const quotes = [...new Set(a.quotes.map((q) => grounded(q, transcript)).filter((q): q is string => !!q))];
    const key = areaKey(item, a.area);
    const prev = entryOf(session, item, a.area);
    const known = !!prev && (prev.status === "covered" || prev.status === "assumed") && !!prev.value;
    const sources = (qs: string[]) => ({ ...(prev?.quote_sources ?? {}), ...Object.fromEntries(qs.map((q) => [q, source.id])) });

    if (a.status === "not_applicable" || a.status === "declined") {
      if (known) { events.push(`${key}: ${a.status} ignored, an answer is already recorded`); continue; }
      setEntry(session, item, a.area, { status: a.status, value: a.value, quotes, probe_count: 0, updated_at: now, ...(quotes.length ? { quote_sources: sources(quotes) } : {}) });
      asked[key] ??= now;
      events.push(`${key}: ${a.status}`);
      continue;
    }
    if (!quotes.length) { events.push(`${key}: no quote from the source, not recorded`); continue; }
    if (!WHAT_COUNTS.has(a.area) && quotes.every(insideDefinition)) {
      events.push(`${key}: its words define a term; kept with the term, not recorded here`);
      continue;
    }
    asked[key] ??= now;
    if (item.spawned_from && a.area.startsWith("core.")) {
      // A follow-on item's own core answer is its override. The area's state (a conflict, a partial)
      // is keyed for the primary item, so it's neither read nor written here.
      const own = item.core_overrides[a.area.slice(5)];
      setEntry(session, item, a.area, { status: fromNotes || a.status === "partial" ? "assumed" : "covered", value: a.value ?? quotes[0], quotes: [...new Set([...(own?.quotes ?? []), ...quotes])], probe_count: 0, updated_at: now, quote_sources: { ...(own?.quote_sources ?? {}), ...Object.fromEntries(quotes.map((q) => [q, source.id])) } });
      events.push(`${item.id}:${a.area}: recorded for this item`);
      continue;
    }
    // A follow-up answer on an area with two disagreeing answers settles it: only the stakeholder's
    // own words, never notes (cycle-count retest: the controller's call notes "settled" the rules).
    const open = stateOf(engine, key).conflict;
    if (open && fromNotes) {
      events.push(`${key}: notes can't settle the disagreement; still open for the follow-up`);
      continue;
    }
    if (open && a.status === "answered") {
      setEntry(session, item, a.area, { status: fromNotes ? "assumed" : "covered", value: a.value ?? quotes[0], quotes: [...new Set([...(prev?.quotes ?? []), open.quote, ...quotes])], probe_count: prev?.probe_count ?? 0, updated_at: now, quote_sources: { ...sources(quotes), [open.quote]: open.source, ...Object.fromEntries(quotes.map((q) => [q, source.id])) } });
      engine.areas[key] = { ...stateOf(engine, key), conflict: null, partial: null };
      events.push(`${key}: disagreement settled`);
      continue;
    }
    if (known && a.conflict && differentFacts(quoteFor(prev!.value, prev!.quotes) ?? prev!.value!, quotes.join(" "))) {
      // Two numbers of different kinds can't contradict each other (cycle-count retest: the request's
      // "$500" threshold and the reply's "by 7am" were paired as a disagreement on the rules, twice).
      events.push(`${key}: flagged as a disagreement, but it's a different fact ($ vs time, say); added to the answer`);
    } else if (known && a.conflict) {
      // Never overwrite: keep what's recorded and flag the disagreement for the follow-up.
      // The recorded side's own words go with it, so the follow-up can quote both sides verbatim.
      const against = quoteFor(prev!.value, prev!.quotes);
      engine.areas[key] = { ...stateOf(engine, key), conflict: { value: a.value, quote: quotes[0], source: source.id, ...(against ? { against: { quote: against, source: prev!.quote_sources?.[against] ?? null } } : {}) } };
      events.push(`${key}: conflicts with what's recorded; kept both for the follow-up`);
      continue;
    }
    const allQuotes = [...new Set([...(prev?.quotes ?? []), ...quotes])];
    if (a.status === "answered" && fromNotes) {
      // Source rule: notes are the interviewer's paraphrase. They never make an area covered; the
      // answer stays assumed until the stakeholder's own words confirm it (a covered one keeps them).
      if (known && prev!.status === "covered") {
        setEntry(session, item, a.area, { ...prev!, quotes: allQuotes, updated_at: now, quote_sources: sources(quotes) });
        events.push(`${key}: notes agree with a covered answer; kept as it was`);
      } else {
        setEntry(session, item, a.area, { status: "assumed", value: a.value ?? quotes[0], quotes: allQuotes, probe_count: prev?.probe_count ?? 0, updated_at: now, quote_sources: sources(quotes) });
        engine.areas[key] = { ...stateOf(engine, key), partial: null };
        events.push(`${key}: from notes only, assumed until the stakeholder confirms`);
      }
    } else if (a.status === "answered") {
      const value = known && prev!.status === "covered" ? prev!.value! : (a.value ?? quotes[0]);
      setEntry(session, item, a.area, { status: "covered", value, quotes: allQuotes, probe_count: prev?.probe_count ?? 0, updated_at: now, quote_sources: sources(quotes) });
      engine.areas[key] = { ...stateOf(engine, key), partial: null };
      events.push(`${key}: covered`);
    } else {
      // Partial: recorded as an assumption until a follow-up settles it (no live probe in async).
      if (known && prev!.status === "covered") {
        setEntry(session, item, a.area, { ...prev!, quotes: allQuotes, updated_at: now, quote_sources: sources(quotes) });
        events.push(`${key}: partial detail added to a covered answer`);
        continue;
      }
      setEntry(session, item, a.area, { status: "assumed", value: a.value ?? quotes[0], quotes: allQuotes, probe_count: prev?.probe_count ?? 0, updated_at: now, quote_sources: sources(quotes) });
      engine.areas[key] = { ...stateOf(engine, key), partial: { value: a.value, quote: quotes[0] } };
      events.push(`${key}: partial, assumed until followed up`);
    }
  }

  for (const c of r.checks) {
    // applyCheck returns a new session, so the engine is read fresh each time.
    const engine = session.session.engine!;
    const item = session.items.find((i) => i.id === c.item && !i.spawned_from && !i.dropped);
    if (!item) continue;
    const ck = `${item.id}:${c.check}`;
    const state = engine.checks[ck] ?? { asks: 0, result: null };
    if (state.result === "yes" || state.result === "no") continue;
    // The packet (or a follow-up) asked it once more.
    engine.checks[ck] = { ...state, asks: Math.min(2, state.asks + 1) };
    if (c.check === "existing_asset") {
      const quote = grounded(c.quote, transcript);
      const result = c.result === "yes" && !quote ? "unclear" : c.result;
      engine.checks[ck] = { ...engine.checks[ck], result: result === "unclear" ? (engine.checks[ck].asks >= 2 ? "no" : null) : result };
      events.push(`existing_asset: ${result}`);
      continue;
    }
    const area = c.check === "manual_work" ? (fw.modules[item.type]?.anchor as string) : fw.router.checks!.kill_criteria.area;
    const ctx: ApplyContext = { fw, transcript, now };
    const out = applyCheck(session, { item: item.id, area, kind: "check", check: c.check, question: "packet" }, { status: "answered", value: c.value, quote: c.quote, check: c.result, wrap_up: false, also_answers: [], name: c.name ?? null }, ctx);
    Object.assign(session, out.session);
    events.push(...out.events);
    // The kill-criteria answer joins its area's quotes: record which source it came from.
    const q = c.check === "kill_criteria" ? grounded(c.quote, transcript) : null;
    const e = q ? entryOf(session, item, area) : undefined;
    if (q && e?.quotes.includes(q)) setEntry(session, item, area, { ...e, quote_sources: { ...(e.quote_sources ?? {}), [q]: source.id } });
  }
  events.push(...applyTerms(session, source, r, transcript));
  return events;
}

const termKey = (t: string) => t.trim().toLowerCase().replace(/[\s_-]+/g, " ").replace(/(?<=\w\w)s\b/g, "");
/** "cycle count variances" and "variance" are one term; the shorter name is kept. */
const sameTerm = (a: string, b: string) => { const x = termKey(a), y = termKey(b); return x === y || x.endsWith(` ${y}`) || y.endsWith(` ${x}`); };

/**
 * Definitions (HANDOFF.md): new terms start unconfirmed; a definition in the source, in its words,
 * confirms one. Notes count, labelled by their source. A later definition that disagrees is kept as
 * a conflict, never written over the first.
 */
export function applyTerms(session: Session, source: Source, r: Pick<IngestResult, "terms" | "definitions">, transcript: TranscriptEntry[]): string[] {
  const events: string[] = [];
  const terms = session.terms ?? (session.terms = []);
  const primary = session.items.find((i) => !i.spawned_from && !i.dropped);
  const find = (t: string) => terms.find((x) => sameTerm(x.term, t));
  const add = (term: string, quote: string, kind: "metric" | "rule" | "label"): Term => {
    const t: Term = { id: `term-${terms.length + 1}`, term: term.trim(), items: primary ? [primary.id] : [], found_in: { quote, source: source.id }, status: "unconfirmed", kind, definition: null, quotes: [], given_by: null, source: null, measurable: "unknown", examples: [], starter: null };
    terms.push(t);
    return t;
  };
  // A phrase inside another term's definition isn't a term of its own (retest: "absolute value per
  // SKU", from the controller's definition of variance, was flagged).
  const definitionWords = [
    ...r.definitions.map((d) => ({ term: d.term, quotes: d.quotes })),
    ...terms.map((x) => ({ term: x.term, quotes: [...x.quotes, ...(x.draft ? [x.draft.quote] : []), ...(x.conflict ? [x.conflict.quote] : [])] })),
  ];
  const insideADefinition = (name: string) => definitionWords.some((d) => !sameTerm(d.term, name) && d.quotes.some((q) => normalize(q).includes(normalize(name))));
  for (const t of r.terms) {
    const quote = grounded(t.quote, transcript);
    if (!quote || !t.term.trim()) { events.push(`term "${t.term}": not in the source, ignored`); continue; }
    if (!find(t.term) && insideADefinition(t.term)) { events.push(`term "${t.term}": part of another term's definition, not a term of its own`); continue; }
    const known = find(t.term);
    if (known) {
      // The shorter name is kept (retest: the request, read first, named it "cycle count variance").
      if (termKey(t.term).length < termKey(known.term).length) { events.push(`term "${known.term}": now "${t.term.trim()}"`); known.term = t.term.trim(); }
      continue;
    }
    add(t.term, quote, t.kind);
    events.push(`term "${t.term}": found, unconfirmed`);
  }
  for (const d of r.definitions) {
    const quotes = [...new Set(d.quotes.map((q) => grounded(q, transcript)).filter((q): q is string => !!q))];
    if (!quotes.length || !d.definition.trim()) { events.push(`definition of "${d.term}": no words from the source, not recorded`); continue; }
    const t = find(d.term) ?? add(d.term, quotes[0], "label");
    const definition = d.definition.trim();
    const prior = t.definition ?? t.draft?.definition ?? null;
    // A one-line request isn't the owner defining a term: at most a draft (retest: the request's
    // threshold confirmed "variance", and the requester's own hedged words were then dropped).
    const certain = d.certain && source.kind !== "request";
    if (t.conflict && !d.conflict) {
      // Two definitions disagreed. Only the stakeholder's own, certain words settle it; notes or a
      // hedge are kept as a draft and the disagreement stays open.
      if (source.kind !== "notes" && certain) {
        Object.assign(t, { status: "confirmed", definition, quotes: [...new Set([...t.quotes, ...quotes])], given_by: source.from, source: source.id, conflict: null, draft: null });
        events.push(`definition of "${t.term}": disagreement settled`);
      } else {
        t.draft = { definition, quote: quotes[0], source: source.id };
        events.push(`definition of "${t.term}": ${source.kind === "notes" ? "notes" : "a hedged answer"} can't settle the disagreement; kept as a draft`);
      }
      continue;
    }
    if (prior && d.conflict) {
      // Contradicts what's recorded or drafted (live test: the requester's "times the cost" against
      // the controller's "absolute value per SKU", from notes). Keep both; the follow-up asks.
      t.conflict = { definition, quote: quotes[0], source: source.id };
      events.push(`definition of "${t.term}": contradicts the ${t.definition ? "recorded" : "drafted"} one; kept both for the follow-up`);
      continue;
    }
    if (source.kind === "notes") {
      // Source rule: a definition in the interviewer's notes is a draft for the owner to confirm,
      // whether the term is new or already confirmed (then it's a proposed update).
      if (t.status !== "confirmed" || d.definition.trim() !== t.definition) {
        t.draft = { definition: d.definition.trim(), quote: quotes[0], source: source.id };
        events.push(`definition of "${t.term}": from notes only, kept as a draft for the owner to confirm`);
      }
    } else if (!certain) {
      // A hedged definition never confirms a term; a confirmed one keeps its definition.
      if (t.status !== "confirmed") {
        t.draft = { definition: d.definition.trim(), quote: quotes[0], source: source.id };
        events.push(`definition of "${t.term}": hedged, kept as a draft for the follow-up`);
      }
    } else if (t.status === "confirmed") {
      // A later source that settles or adds to the definition updates it; earlier words are kept.
      t.quotes = [...new Set([...t.quotes, ...quotes])];
      if (d.definition.trim() !== t.definition) {
        Object.assign(t, { definition: d.definition.trim(), given_by: source.from, source: source.id });
        events.push(`definition of "${t.term}": updated`);
      }
      t.draft = null;
    } else {
      Object.assign(t, { status: "confirmed", definition: d.definition.trim(), quotes, given_by: source.from, source: source.id, draft: null });
      events.push(`definition of "${t.term}": confirmed`);
    }
    if (d.measurable !== "unknown") t.measurable = d.measurable;
    for (const e of d.examples) if (e.case.trim() && e.expected.trim() && !t.examples.some((x) => x.case === e.case)) t.examples.push({ case: e.case.trim(), expected: e.expected.trim() });
  }
  return events;
}

export interface IngestOutcome {
  session: Session;
  result: "applied" | "failed";
  calls: EngineCall[];
  events: string[];
}

/**
 * Adds a source and reads it against every area. A chunk whose call fails twice over records
 * nothing from the whole source, and the session comes back unchanged.
 */
export async function runIngest(input: { provider: Provider; fw: Framework; session: Session; source: Omit<Source, "id" | "added_at">; now: string; signal?: AbortSignal }): Promise<IngestOutcome> {
  const { fw, provider, now } = input;
  const calls: EngineCall[] = [];
  const events: string[] = [];
  if (input.source.kind === "request") throw new Error("the request is added at triage");
  const s: Session = structuredClone(input.session);
  const list = s.session.sources ?? (s.session.sources = []);
  const source: Source = { ...input.source, id: `src-${list.length + 1}`, added_at: now };
  list.push(source);

  // The request line is the requester's own words: on the first paste it's read for facts too, so
  // a number it states ("over $500") is recorded and a later source can conflict with it.
  const request = s.session.engine!.request_read ? undefined : list.find((x) => x.kind === "request");
  const toRead: Source[] = request ? [request, source] : [source];
  for (const src of toRead) for (const [n, text] of chunks(src.text).entries()) {
    const req = ingestRequest(fw, s, { kind: src.kind, from: src.from, text, items: readTargets(s, fw) });
    let data: IngestResult | null = null;
    for (let attempt = 0; attempt < 3 && !data; attempt++) {
      try {
        const r = await provider.complete(req, input.signal);
        let parsed: unknown;
        try { parsed = JSON.parse(r.text); } catch { parsed = undefined; }
        const v = parsed === undefined ? { ok: false, errors: ["not JSON"] } : validateIngest(parsed);
        calls.push({ name: "ingest", model: r.model, usage: r.usage, text: r.text, ok: v.ok, problem: v.ok ? null : v.errors.slice(0, 3).join("; ") });
        if (v.ok) data = parsed as IngestResult;
      } catch (err) {
        if (err instanceof ProviderError && (err.kind === "config" || err.status === 400 || err.status === 401)) throw err;
        calls.push({ name: "ingest", model: "", usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 }, text: "", ok: false, problem: (err as Error).message });
      }
    }
    if (!data) return { session: input.session, result: "failed", calls, events: [...events, `chunk ${n + 1}: calls failed three times; nothing recorded from this source`] };
    events.push(...applyIngest(s, src, data, fw, now).map((e) => (src === request ? `[request] ${e}` : e)));
  }
  if (request) s.session.engine!.request_read = true;
  return { session: s, result: "applied", calls, events };
}


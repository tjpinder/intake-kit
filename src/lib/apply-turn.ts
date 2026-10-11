// apply-turn: the only writer of the session file during an interview. Takes the model's turn,
// checks every rule the strict turn schema can't express, and applies all of it or none of it.
// The model never writes scoring or gates; once the user confirms the reflect-back, code scores
// and gates every item.

import type { Framework, ItemType, Modifier } from "./framework.ts";
import { findQuote, type TranscriptEntry } from "./grounding.ts";
import { scoreAndGate } from "./gates.ts";
import { validateSession, validateTurn } from "./schemas.ts";
import type { CoverageEntry, Item, Session } from "./session.ts";

export interface Rejection {
  /** Where in the turn, e.g. /updates/2/quote. */
  path: string;
  reason: string;
}

export interface ApplyContext {
  fw: Framework;
  /** The user's recorded prompts, or null when the session's grounding is "unverified". */
  transcript: TranscriptEntry[] | null;
  now: string;
}

export interface ApplyResult {
  /** The updated session, or the original one, untouched, if anything was rejected. */
  session: Session;
  rejections: Rejection[];
  applied: boolean;
  /** True when this turn confirmed the reflect-back and the session was scored and gated. */
  confirmed: boolean;
  /** Optional details that were dropped rather than stored, e.g. a band's quote that isn't the user's words. */
  warnings: string[];
}

// Turn shapes, as guaranteed by schema/turn.schema.json once validateTurn passes.
interface Turn {
  reply: string;
  updates: Array<{ item: string | null; area: string; status: CoverageEntry["status"]; value: string | null; quote: string | null }>;
  facts: Array<{ item: string; fact: string; band: string; evidence: string[]; quote: string | null }>;
  router: {
    new_items: Array<{ id: string; type: ItemType; confidence: Item["confidence"]; title: string; trigger_quote: string; spawned_from: string | null }>;
    reclassify: { item: string; to: ItemType; reason: string; quote: string } | null;
    add_modifiers: Array<{ item: string; modifier: Modifier; quote: string }>;
    supersede: { item: string; by: string; quote: string } | null;
  };
  prose: Array<{ item: string | null; field: keyof Item["prose"]; text: string }>;
  acceptance: Array<{ item: string; kind: "criterion" | "error_case"; given: string; when: string; then: string; evidence: string[] }>;
  guardrails: Array<{ item: string; kind: Item["guardrails"][number]["kind"]; text: string; evidence: string[] }>;
  open_questions: Array<{ item: string | null; area: string; question: string; who_can_answer: string | null; artifact_needed: string | null }>;
  reflect_back: { text: string; status: "proposed" | "confirmed" | "corrected"; corrections: string[] } | null;
  next_target: { item: string | null; area: string | null; is_probe: boolean };
}

const ITEM_ID = /^item-\d+$/;
const CORE_AREAS = ["users", "outcome", "data", "systems", "constraints", "trust"] as const;

export function applyTurn(original: Session, turnData: unknown, ctx: ApplyContext): ApplyResult {
  const reject = (rejections: Rejection[]): ApplyResult => ({ session: original, rejections, applied: false, confirmed: false, warnings: [] });
  const warnings: string[] = [];

  const shape = validateTurn(turnData);
  if (!shape.ok) return reject(shape.errors.map((e) => ({ path: e.split(" ")[0], reason: `doesn't match the turn schema: ${e}` })));
  const turn = turnData as Turn;

  if (original.session.reflect_back?.confirmed) {
    return reject([{ path: "/", reason: "This intake is complete: the reflect-back was confirmed and the items are gated. Start a new intake to change anything." }]);
  }

  const { fw, now } = ctx;
  const session: Session = structuredClone(original);
  const rejections: Rejection[] = [];
  const fail = (path: string, reason: string) => rejections.push({ path, reason });
  const items = new Map(session.items.map((i) => [i.id, i]));

  // Grounding: the user's own words, from a single user turn. Unverified sessions skip the check.
  const grounded = (path: string, quote: string | null): void => {
    if (quote == null || ctx.transcript == null) return;
    if (ctx.transcript.length === 0) {
      fail(path, "No transcript is recorded, so no quote can be checked. Is intake-kit's prompt hook installed and enabled?");
    } else if (!findQuote(quote, ctx.transcript)) {
      fail(path, `"${quote}" isn't the user's words: it doesn't appear in any single user message. Quote the user exactly, or leave the quote out.`);
    }
  };
  const needItem = (path: string, id: string | null): Item | undefined => {
    if (id == null) { fail(path, "an item ID is required here"); return undefined; }
    const item = items.get(id);
    if (!item) fail(path, `unknown item ${id}`);
    return item;
  };
  // A module area applies to an item if it belongs to the item's type or one of its modifiers.
  const areaFits = (path: string, item: Item, area: string): boolean => {
    const module = area.startsWith("mod.") ? area.split(".").slice(0, 2).join(".") : area.split(".")[0];
    const fits = module === item.type || item.modifiers.some((m) => `mod.${m}` === module);
    if (!fits) fail(path, `${area} doesn't apply to ${item.id}, a ${item.type} item${item.modifiers.length ? ` with ${item.modifiers.join(", ")}` : ""}`);
    return fits;
  };
  const knownArea = (path: string, area: string): boolean => {
    if (fw.areas.has(area)) return true;
    const asFact = area.replace(/^(core|[a-z_]+)\./, "");
    if (fw.factBands.has(area) || fw.factBands.has(asFact)) {
      fail(path, `${area} is a band pick, not a coverage area: record it only in "facts" (as { "fact": "${asFact}", "band": ... }), never in "updates" or as evidence.`);
    } else {
      fail(path, `unknown coverage ID ${area}`);
    }
    return false;
  };

  // 1. Router: new items first, so the rest of the turn can refer to them.
  turn.router.new_items.forEach((n, i) => {
    const path = `/router/new_items/${i}`;
    if (!ITEM_ID.test(n.id)) fail(`${path}/id`, `item IDs look like item-1, not ${n.id}`);
    else if (items.has(n.id)) fail(`${path}/id`, `${n.id} already exists`);
    if (!n.title.trim()) fail(`${path}/title`, "a new item needs a title");
    if (n.spawned_from != null && !items.has(n.spawned_from)) fail(`${path}/spawned_from`, `unknown item ${n.spawned_from}`);
    grounded(`${path}/trigger_quote`, n.trigger_quote);
    items.set(n.id, {
      id: n.id,
      title: n.title,
      type: n.type,
      confidence: n.confidence,
      trigger_quote: n.trigger_quote,
      modifiers: [],
      spawned_from: n.spawned_from,
      superseded_by: null,
      type_history: [{ from: null, to: n.type, reason: n.spawned_from ? `spawned from ${n.spawned_from}` : "opening", quote: n.trigger_quote, at: now }],
      core_overrides: {},
      coverage: {},
      facts: {},
      prose: {},
      acceptance: [],
      guardrails: [],
      scoring: null,
      gate: null,
      open_questions: [],
    });
  });

  const rc = turn.router.reclassify;
  if (rc) {
    const item = needItem("/router/reclassify/item", rc.item);
    if (item) {
      if (item.type === rc.to) fail("/router/reclassify/to", `${item.id} is already ${rc.to}`);
      if (!rc.reason.trim()) fail("/router/reclassify/reason", "say why the item is being reclassified");
      grounded("/router/reclassify/quote", rc.quote);
      item.type_history.push({ from: item.type, to: rc.to, reason: rc.reason, quote: rc.quote, at: now });
      item.type = rc.to;
    }
  }

  turn.router.add_modifiers.forEach((m, i) => {
    const path = `/router/add_modifiers/${i}`;
    const item = needItem(`${path}/item`, m.item);
    if (!item) return;
    if (item.modifiers.includes(m.modifier)) warnings.push(`${path} skipped: ${item.id} already has the ${m.modifier} modifier`);
    else item.modifiers.push(m.modifier);
    grounded(`${path}/quote`, m.quote);
  });

  const sup = turn.router.supersede;
  if (sup) {
    const item = needItem("/router/supersede/item", sup.item);
    const by = needItem("/router/supersede/by", sup.by);
    if (item && by) {
      if (item.id === by.id) fail("/router/supersede/by", "an item can't supersede itself");
      else if (by.spawned_from === item.id) {
        // Found in the persona evals: the model marked the broken integration as superseded by
        // its own manual workaround. A follow-on is replaced by the item it came from, never the reverse.
        fail("/router/supersede", `${by.id} was spawned from ${item.id} as its follow-on, so it can't replace it. If building or fixing ${item.id} makes ${by.id} go away, send { "item": "${by.id}", "by": "${item.id}" }.`);
      } else item.superseded_by = by.id;
    }
    grounded("/router/supersede/quote", sup.quote);
  }

  // 2. Coverage updates
  turn.updates.forEach((u, i) => {
    const path = `/updates/${i}`;
    if (!knownArea(`${path}/area`, u.area)) return;

    if (u.status === "covered" && !u.value?.trim()) fail(`${path}/value`, "covered needs a value");
    if ((u.status === "covered" || u.status === "assumed") && !u.quote?.trim()) {
      fail(`${path}/quote`, `${u.status} needs the user's words as a quote`);
    }
    if (u.status === "unknown" && u.value != null) fail(`${path}/value`, "unknown has no value; use null");
    grounded(`${path}/quote`, u.quote);

    let target: Record<string, CoverageEntry>;
    let key: string;
    if (u.area.startsWith("core.")) {
      key = u.area.slice(5);
      if (u.item == null) target = session.core;
      else {
        const item = needItem(`${path}/item`, u.item);
        if (!item) return;
        // Shared core is captured once; an item overrides it only when its answer differs from
        // one already given. With no shared answer yet, this answer becomes the shared one.
        const shared = session.core[key as (typeof CORE_AREAS)[number]];
        target = shared?.updated_at || item.core_overrides[key] ? item.core_overrides : session.core;
      }
    } else {
      const item = needItem(`${path}/item`, u.item);
      if (!item || !areaFits(`${path}/area`, item, u.area)) return;
      target = item.coverage;
      key = u.area;
    }

    const prev = target[key] ?? (u.area.startsWith("core.") && u.item != null ? session.core[key as (typeof CORE_AREAS)[number]] : undefined);
    const quotes = [...(prev?.quotes ?? [])];
    if (u.quote && !quotes.includes(u.quote)) quotes.push(u.quote);
    target[key] = { status: u.status, value: u.status === "unknown" ? null : u.value, quotes, probe_count: prev?.probe_count ?? 0, updated_at: now };
  });

  // 3. Facts: band picks with evidence. Code turns them into scores later.
  turn.facts.forEach((f, i) => {
    const path = `/facts/${i}`;
    const item = needItem(`${path}/item`, f.item);
    const bands = ctx.fw.factBands.get(f.fact);
    if (!bands) fail(`${path}/fact`, `unknown fact ${f.fact}`);
    else if (!bands.includes(f.band)) fail(`${path}/band`, `"${f.band}" isn't a band of ${f.fact}; use one of: ${bands.join(", ")}`);
    f.evidence.forEach((ev, j) => knownArea(`${path}/evidence/${j}`, ev));
    // A band's quote is optional colour: its evidence already points at answers with real quotes.
    // One that isn't the user's words is dropped (never stored), rather than failing the turn.
    let quote = f.quote;
    if (quote != null && ctx.transcript != null && !findQuote(quote, ctx.transcript)) {
      warnings.push(`${path}/quote dropped: not the user's words`);
      quote = null;
    }
    if (item) item.facts[f.fact] = { band: f.band, evidence: f.evidence, quotes: quote ? [quote] : [] };
  });

  // 4. Prose and open questions
  turn.prose.forEach((p, i) => {
    const item = needItem(`/prose/${i}/item`, p.item);
    if (!p.text.trim()) fail(`/prose/${i}/text`, "prose can't be empty");
    if (item) item.prose[p.field] = p.text;
  });

  // Acceptance criteria and guardrail statements: the model drafts them; each must cite areas
  // that fit the item. Quotes are checked below, once every update in this turn is applied.
  const cited: Array<[string, Item, string]> = [];
  const citeEvidence = (path: string, item: Item | undefined, evidence: string[]) => {
    if (evidence.length === 0) fail(`${path}/evidence`, "cite at least one coverage ID");
    evidence.forEach((ev, j) => {
      if (!knownArea(`${path}/evidence/${j}`, ev) || !item) return;
      if (ev.startsWith("core.") || areaFits(`${path}/evidence/${j}`, item, ev)) cited.push([`${path}/evidence/${j}`, item, ev]);
    });
  };
  turn.acceptance.forEach((a, i) => {
    const path = `/acceptance/${i}`;
    const item = needItem(`${path}/item`, a.item);
    for (const field of ["given", "when", "then"] as const) if (!a[field].trim()) fail(`${path}/${field}`, `"${field}" can't be empty`);
    citeEvidence(path, item, a.evidence);
    if (item && !item.acceptance.some((x) => x.kind === a.kind && x.given === a.given && x.when === a.when && x.then === a.then)) {
      item.acceptance.push({ kind: a.kind, given: a.given, when: a.when, then: a.then, evidence: a.evidence });
    }
  });
  turn.guardrails.forEach((g, i) => {
    const path = `/guardrails/${i}`;
    const item = needItem(`${path}/item`, g.item);
    if (!g.text.trim()) fail(`${path}/text`, "a guardrail can't be empty");
    citeEvidence(path, item, g.evidence);
    if (item && !item.guardrails.some((x) => x.kind === g.kind && x.text === g.text)) item.guardrails.push({ kind: g.kind, text: g.text, evidence: g.evidence });
  });
  for (const [path, item, ev] of cited) {
    const entry = ev.startsWith("core.") ? (item.core_overrides[ev.slice(5)] ?? session.core[ev.slice(5) as (typeof CORE_AREAS)[number]]) : item.coverage[ev];
    if (!entry?.quotes.length) fail(path, `${ev} has no answer in the user's words yet, so nothing can cite it`);
  }

  turn.open_questions.forEach((q, i) => {
    const path = `/open_questions/${i}`;
    const item = needItem(`${path}/item`, q.item);
    if (!knownArea(`${path}/area`, q.area)) return;
    if (!q.question.trim()) fail(`${path}/question`, "the question can't be empty");
    if (item && !item.open_questions.some((o) => o.area === q.area && o.question === q.question)) {
      item.open_questions.push({ area: q.area, question: q.question, who_can_answer: q.who_can_answer, artifact_needed: q.artifact_needed });
    }
  });

  // 5. Probe discipline: at most one probe per area, and only on an area already answered.
  const nt = turn.next_target;
  if (nt.item != null) needItem("/next_target/item", nt.item);
  if (nt.area != null && knownArea("/next_target/area", nt.area) && nt.item != null && items.has(nt.item) && !nt.area.startsWith("core.")) {
    areaFits("/next_target/area", items.get(nt.item)!, nt.area);
  }
  if (nt.is_probe) {
    if (nt.area == null) fail("/next_target/is_probe", "a probe has to target an area");
    else if (fw.areas.has(nt.area)) {
      let entry: CoverageEntry | undefined;
      if (nt.area.startsWith("core.")) {
        const key = nt.area.slice(5) as (typeof CORE_AREAS)[number];
        entry = (nt.item != null ? items.get(nt.item)?.core_overrides[key] : undefined) ?? session.core[key];
      } else if (nt.item != null) {
        entry = items.get(nt.item)?.coverage[nt.area];
      }
      // `start` seeds core areas without updated_at; any answer recorded through a turn sets it.
      if (!entry || !entry.updated_at) {
        fail("/next_target/is_probe", `${nt.area} hasn't been answered yet, so this is a first ask, not a probe`);
      } else if (entry.probe_count >= 1) {
        fail("/next_target/is_probe", `${nt.area} has already been probed once. Record it as assumed (in the user's words) or unknown, and move on.`);
      } else {
        entry.probe_count = 1;
      }
    }
  }

  // 6. Reflect-back. Confirmation has to follow a proposal the user has since replied to.
  const rb = turn.reflect_back;
  let confirmedNow = false;
  if (rb) {
    if (!rb.text.trim()) fail("/reflect_back/text", "the reflect-back can't be empty");
    const prior = original.session.reflect_back;
    if (rb.status === "proposed") {
      if (items.size === 0) fail("/reflect_back", "there's nothing to reflect back yet: no items");
      session.session.reflect_back = { text: rb.text, confirmed: false, corrections: prior?.corrections ?? [], proposed_at: now };
    } else if (!prior?.proposed_at) {
      fail("/reflect_back/status", `can't mark the reflect-back ${rb.status} before it has been proposed to the user`);
    } else if (ctx.transcript && !ctx.transcript.some((e) => e.role === "user" && e.at > prior.proposed_at!)) {
      fail("/reflect_back/status", `the user hasn't replied since the reflect-back was proposed, so it can't be ${rb.status} yet`);
    } else if (rb.status === "corrected") {
      if (rb.corrections.length === 0) fail("/reflect_back/corrections", "list what the user corrected");
      session.session.reflect_back = { ...prior, text: rb.text, confirmed: false, corrections: [...prior.corrections, ...rb.corrections] };
    } else {
      session.session.reflect_back = { ...prior, text: rb.text, confirmed: true };
      confirmedNow = true;
    }
  }

  // 6b. Answer capture. The last applied turn named the area it asked about. If this turn doesn't
  // record that area and the user gave a real answer, the user's exact words are stored as an
  // assumed answer, which the reflect-back then asks them to confirm. Found in the persona evals:
  // with two or more items, gpt-4.1-mini often heard an answer, recorded nothing and asked again,
  // forever. Only an area with no answer yet is filled, or one marked unknown on an earlier turn
  // (the model sometimes marks the area it's about to ask as unknown before asking it); this
  // turn's own record of the area always wins.
  const asked = original.session.last_target;
  const lastUser = ctx.transcript?.filter((e) => e.role === "user").at(-1);
  if (asked && lastUser && !original.session.reflect_back && fw.areas.has(asked.area) && !turn.updates.some((u) => u.area === asked.area) && lastUser.text.trim().split(/\s+/).length >= 4) {
    let target: Record<string, CoverageEntry> | null = null;
    let key = asked.area;
    if (asked.area.startsWith("core.")) {
      key = asked.area.slice(5);
      const item = asked.item == null ? null : items.get(asked.item);
      const shared = session.core[key as (typeof CORE_AREAS)[number]];
      target = !item || !shared?.updated_at ? session.core : item.core_overrides;
    } else {
      const item = asked.item == null ? undefined : items.get(asked.item);
      const module = asked.area.startsWith("mod.") ? asked.area.split(".").slice(0, 2).join(".") : asked.area.split(".")[0];
      if (item && (module === item.type || item.modifiers.some((m) => `mod.${m}` === module))) target = item.coverage;
    }
    if (target && (!target[key]?.updated_at || target[key].status === "unknown")) {
      target[key] = { status: "assumed", value: lastUser.text.trim(), quotes: [lastUser.text.trim()], probe_count: target[key]?.probe_count ?? 0, updated_at: now };
      warnings.push(`${asked.area} recorded from the user's reply: the turn didn't record the answer to the question it asked`);
    }
  }
  session.session.last_target = turn.next_target.area ? { item: turn.next_target.item, area: turn.next_target.area } : null;

  if (!turn.reply.trim()) fail("/reply", "the reply to the user can't be empty");

  if (rejections.length) return reject(rejections);
  session.items = [...items.values()];

  // 7. Score and gate once confirmed; then the result must still be a valid session.
  let result = session;
  if (confirmedNow) {
    try {
      result = scoreAndGate(session, fw).session;
    } catch (err) {
      return reject([{ path: "/reflect_back", reason: `couldn't score the session: ${(err as Error).message}` }]);
    }
  }
  const valid = validateSession(result);
  if (!valid.ok) return reject(valid.errors.map((e) => ({ path: "/", reason: `the result wouldn't be a valid session: ${e}` })));

  return { session: result, rejections: [], applied: true, confirmed: confirmedNow, warnings };
}

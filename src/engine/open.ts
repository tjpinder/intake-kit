// Open: the model classifies the opening; code decides (HANDOFF.md, Interview engine v2, step 1).
// Code drops a modifier whose only evidence is a negated signal ("no API"), asks the one
// disambiguating probe when the model isn't sure, then creates the primary item and records any
// areas the opening already answers, each only with the user's own words.

import type { Framework } from "../lib/framework.ts";
import { normalize } from "../lib/grounding.ts";
import { said } from "../lib/guide.ts";
import type { Session } from "../lib/session.ts";
import { areaFits, grounded, setEntry, type ApplyContext } from "./apply.ts";
import type { OpeningResult } from "./types.ts";

export type OpenOutcome =
  | { kind: "probe"; question: string; events: string[] }
  | { kind: "created"; session: Session; events: string[] };

/** A modifier stays only if its quote is the user's words and isn't a negated mention of its signals. */
export function keepModifier(fw: Framework, modifier: string, quote: string): boolean {
  const def = fw.router.modifiers[modifier as keyof Framework["router"]["modifiers"]];
  if (!def) return false;
  const text = normalize(quote);
  const literal = def.signals.filter((s) => !/^an? /.test(s));
  const mentioned = literal.filter((s) => text.includes(normalize(s)));
  // No signal phrase in the quote: the model judged it from meaning; keep it. With one, at least
  // one mention has to be un-negated.
  return mentioned.length === 0 || mentioned.some((s) => said(s, text));
}

export function applyOpening(original: Session, r: OpeningResult, ctx: ApplyContext, opts: { mayProbe: boolean }): OpenOutcome {
  const events: string[] = [];
  if (r.confidence === "low" && opts.mayProbe) {
    return { kind: "probe", question: ctx.fw.router.types[r.type].low_confidence_probe, events: [`opening: low confidence (${r.type}), one probe`] };
  }
  const session: Session = structuredClone(original);
  const users = ctx.transcript.filter((t) => t.role === "user");
  const trigger = grounded(r.trigger_quote, ctx.transcript) ?? users[0]?.text ?? r.trigger_quote;
  const modifiers = r.modifiers
    .filter((m) => {
      const q = grounded(m.quote, ctx.transcript);
      const keep = !!q && keepModifier(ctx.fw, m.modifier, q);
      if (!keep) events.push(`opening: ${m.modifier} modifier dropped (${q ? "negated signal" : "quote isn't the user's words"})`);
      return keep;
    })
    .map((m) => m.modifier);
  session.items.push({
    id: "item-1", title: r.title.trim() || "Request", type: r.type, confidence: r.confidence, trigger_quote: trigger,
    modifiers: [...new Set(modifiers)], spawned_from: null, superseded_by: null,
    type_history: [{ from: null, to: r.type, reason: "opening", quote: trigger, at: ctx.now }],
    core_overrides: {}, coverage: {}, facts: {}, prose: {}, acceptance: [], guardrails: [], scoring: null, gate: null, open_questions: [],
  });
  const item = session.items[0];
  const asked = session.session.asked ?? (session.session.asked = {});
  for (const a of r.also_answers) {
    const quote = grounded(a.quote, ctx.transcript);
    if (!quote || !areaFits(item, a.area, ctx.fw)) { events.push(`opening also ${a.area}: ${quote ? "doesn't apply" : "quote isn't the user's words"}, ignored`); continue; }
    setEntry(session, item, a.area, { status: "covered", value: a.value || quote, quotes: [quote], probe_count: 0, updated_at: ctx.now });
    asked[a.area.startsWith("core.") ? a.area : `item-1:${a.area}`] ??= ctx.now;
    events.push(`opening also ${a.area}: covered`);
  }
  session.session.engine!.phase = "interview";
  events.push(`opening: ${r.type} (${r.confidence})${modifiers.length ? ` with ${modifiers.join(", ")}` : ""}`);
  return { kind: "created", session, events };
}

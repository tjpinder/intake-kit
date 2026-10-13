// One user turn through interview engine v2 (HANDOFF.md, "Interview engine v2"): Extract, Apply and
// Spawn, Plan, then Phrase. Code decides everything; the model classifies one reply and phrases
// one question. Failed calls get at most two retries per turn, then the user is asked to send
// their message again and nothing is recorded. Pure apart from the provider calls, so it runs in
// the server function, the evals and tests alike.

import type { Framework } from "../lib/framework.ts";
import type { TranscriptEntry } from "../lib/grounding.ts";
import { validateExtract, validateOpening, validatePhrase, validateWriteUp, type ValidationResult } from "../lib/schemas.ts";
import type { Session } from "../lib/session.ts";
import { CHECK_TEXT, extractRequest, openingRequest, phraseRequest, writeUpRequest } from "../llm/v2.ts";
import { ProviderError, type Provider, type TurnRequest, type Usage } from "../llm/types.ts";
import { applyAnswer, applyCheck, areaFits, entryOf, grounded, setEntry, type ApplyContext } from "./apply.ts";
import { applyOpening } from "./open.ts";
import { areaDone, areaKey, nextTarget, queueFor, stateOf } from "./plan.ts";
import { newEngine, SEND_AGAIN, TURN_BUDGET, type Extraction, type OpeningResult, type Pending } from "./types.ts";
import { applyWriteUp, confirmSummary, enterSummary, type WriteUp } from "./writeup.ts";

export interface EngineTurnInput {
  provider: Provider;
  fw: Framework;
  session: Session;
  /** Every user message, including the one just sent. */
  transcript: TranscriptEntry[];
  /** Every reply already shown, one per earlier user message. */
  replies: string[];
  now: () => string;
  signal?: AbortSignal;
  /** The web app's Confirm button on the summary: no model call. */
  action?: "confirm";
}

export interface EngineCall {
  name: string;
  model: string;
  usage: Usage;
  text: string;
  ok: boolean;
  problem: string | null;
}

export interface EngineTurnOutcome {
  session: Session;
  reply: string;
  /** applied: saved. send_again: calls failed twice over; nothing recorded. */
  result: "applied" | "send_again";
  confirmed: boolean;
  calls: EngineCall[];
  events: string[];
}

class SendAgain extends Error {
  readonly last: unknown;
  constructor(last: unknown) {
    super("send again");
    this.last = last;
  }
}

export const SUMMARY_REPLY = "Here's what I heard. Check the summary below, then confirm it or tell me what to change.";
/** Correction rounds on the summary before it's confirmed with the notes attached. */
export const MAX_SUMMARY_ROUNDS = 2;
/** The manual-work check, asked word for word. */
export const MANUAL_QUESTION = "Is any part of this done by hand today, like a spreadsheet you build?";
export const DONE_REPLY = "Thanks for confirming. Here's how each item came out.";

export async function runEngineTurn(input: EngineTurnInput): Promise<EngineTurnOutcome> {
  const { fw, provider, transcript } = input;
  const calls: EngineCall[] = [];
  const events: string[] = [];
  const original = input.session;
  let s: Session = structuredClone(original);
  s.session.engine ??= newEngine();
  s.session.asked ??= {};
  const engine = () => s.session.engine!;
  const users = transcript.filter((t) => t.role === "user");
  engine().turns = users.length;
  const now = input.now();
  const ctx: ApplyContext = { fw, transcript, now };
  const done = (reply: string, confirmed = false): EngineTurnOutcome => ({ session: s, reply, result: "applied", confirmed, calls, events });

  let retries = 2;
  async function call<T>(name: string, req: TurnRequest, validate: (d: unknown) => ValidationResult): Promise<T> {
    for (;;) {
      let problem: string;
      try {
        const r = await provider.complete(req, input.signal);
        let data: unknown;
        try { data = JSON.parse(r.text); } catch { data = undefined; }
        const v = data === undefined ? { ok: false, errors: ["not JSON"] } : validate(data);
        calls.push({ name, model: r.model, usage: r.usage, text: r.text, ok: v.ok, problem: v.ok ? null : v.errors.slice(0, 3).join("; ") });
        if (v.ok) return data as T;
        problem = v.errors[0];
      } catch (err) {
        if (err instanceof ProviderError && (err.kind === "config" || err.status === 400 || err.status === 401)) throw err;
        problem = (err as Error).message;
        if (retries <= 0) throw new SendAgain(err);
      }
      if (retries-- <= 0) throw new SendAgain(problem);
    }
  }

  try {
    const phase = engine().phase;
    if (phase === "confirmed") return { session: original, reply: "This intake is complete. Start a new one to change anything.", result: "applied", confirmed: false, calls, events };

    if (phase === "summary") {
      if (input.action === "confirm") { s = confirmSummary(s, fw); events.push("summary confirmed"); return done(DONE_REPLY, true); }
      return await summaryReply();
    }

    let wrapUp = false;
    if (phase === "opening") {
      const opening = engine().disambiguated ? users.map((u) => u.text).join("\n") : users[0].text;
      const areas = [...new Set(Object.values(fw.modules).flatMap((m) => m.areas.map((a) => a.id)))];
      const r = await call<OpeningResult>("classify_opening", openingRequest(fw, opening, areas), validateOpening);
      const out = applyOpening(s, r, ctx, { mayProbe: !engine().disambiguated });
      events.push(...out.events);
      if (out.kind === "probe") {
        engine().disambiguated = true;
        engine().pending = { item: null, area: "opening", kind: "disambiguate", check: null, question: out.question };
        return done(out.question);
      }
      s = out.session;
    } else if (engine().pending) {
      const pending = engine().pending!;
      const item = s.items.find((i) => i.id === pending.item)!;
      const others = queueAndAll(item).filter((id) => id !== pending.area && !areaDone(s, item, id, fw));
      const checkText = pending.kind === "confirm" ? CHECK_TEXT.confirm : pending.check ? CHECK_TEXT[pending.check] : null;
      const x = await call<Extraction>("extract", extractRequest(fw, { question: pending.question, reply: users.at(-1)!.text, area: pending.area, check: checkText, others }), validateExtract);
      const out = pending.kind === "check" ? applyCheck(s, pending, x, ctx) : applyAnswer(s, pending, x, ctx);
      s = out.session;
      events.push(...out.events);
      wrapUp = out.wrapUp;
    }

    // Plan: the turn budget and a wrap-up request end the interview; otherwise code picks the next question.
    if (wrapUp || engine().turns >= TURN_BUDGET) {
      events.push(wrapUp ? "user asked to wrap up" : `turn budget (${TURN_BUDGET}) reached`);
      return await toSummary();
    }
    const target = nextTarget(s, fw, transcript);
    if (!target) return await toSummary();
    const item = s.items.find((i) => i.id === target.item)!;
    const key = areaKey(item, target.area);
    let question: string;
    if (target.kind === "confirm") {
      const e = entryOf(s, item, target.area)!;
      question = `You said "${e.quotes.at(-1) ?? e.value}". Is that right?`;
      engine().areas[key] = { ...stateOf(engine(), key), confirm: "asked" };
    } else {
      if (target.check === "manual_work") {
        // A fixed, concrete question: a phrased one drifted to "updated every shift?" and the
        // user's clear yes was read as no (first v2 gate, persona 1 run 2).
        question = MANUAL_QUESTION;
      } else {
        const partial = stateOf(engine(), key).partial;
        const p = await call<{ question: string }>("phrase", phraseRequest(fw, { target, item, transcript, replies: [...input.replies, ""], partial: partial?.quote ?? partial?.value ?? null }), validatePhrase);
        question = p.question.trim();
      }
      // A probe counts when it's asked, not when it's answered.
      if (target.kind === "probe") engine().areas[key] = { ...stateOf(engine(), key), probed: true };
      if (target.kind === "check" && target.check === "manual_work") {
        const ck = `${item.id}:manual_work`;
        const c = engine().checks[ck] ?? { asks: 0, result: null };
        engine().checks[ck] = { ...c, asks: c.asks + 1 };
      }
    }
    if (target.kind !== "check" || target.check !== "manual_work") s.session.asked![key] ??= now;
    engine().pending = { item: target.item, area: target.area, kind: target.kind, check: target.check, question } satisfies Pending;
    events.push(`next: ${target.kind} ${target.item}:${target.area}${target.check ? ` (${target.check})` : ""}${target.purpose ? ` (${target.purpose})` : ""}`);
    return done(question);
  } catch (err) {
    if (err instanceof SendAgain) {
      if (err.last instanceof ProviderError) throw err.last;
      return { session: original, reply: SEND_AGAIN, result: "send_again", confirmed: false, calls, events: [...events, "calls failed twice over; nothing recorded"] };
    }
    throw err;
  }

  function queueAndAll(item: Session["items"][number]): string[] {
    const all = ["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)].flatMap((m) => fw.modules[m]?.areas.map((a) => a.id) ?? []);
    return [...new Set([...queueFor(item, fw), ...all])];
  }

  /** Writes up each item (a failed write-up still lets the summary render), then renders the summary. */
  async function toSummary(): Promise<EngineTurnOutcome> {
    for (const item of s.items.filter((i) => !i.dropped && !i.spawned_from)) {
      retries = Math.max(retries, 2);
      try {
        const w = await call<WriteUp>("write_up", writeUpRequest(fw, s, item, transcript), validateWriteUp);
        events.push(...applyWriteUp(s, item.id, w, fw, transcript).map((d) => `write-up dropped ${d}`));
      } catch (err) {
        if (!(err instanceof SendAgain)) throw err;
        events.push(`write-up for ${item.id} failed; the summary renders without it`);
      }
    }
    s = enterSummary(s, fw, now);
    events.push("summary");
    return done(SUMMARY_REPLY);
  }

  /** A typed reply to the summary: agreement confirms; corrections go back through Extract. */
  async function summaryReply(): Promise<EngineTurnOutcome> {
    const live = s.items.filter((i) => !i.dropped);
    const others = [...new Set(live.flatMap((i) => queueAndAll(i)))];
    const x = await call<Extraction>("extract", extractRequest(fw, { question: "Does this summary look right?", reply: users.at(-1)!.text, area: "summary", check: CHECK_TEXT.summary, others }), validateExtract);
    const corrections: string[] = [];
    for (const a of x.also_answers) {
      const quote = grounded(a.quote, transcript);
      const item = live.find((i) => areaFits(i, a.area, fw));
      if (!quote || !item) { events.push(`correction ${a.area} ignored`); continue; }
      const prev = entryOf(s, item, a.area);
      setEntry(s, item, a.area, { status: "covered", value: a.value || quote, quotes: [...new Set([...(prev?.quotes ?? []), quote])], probe_count: prev?.probe_count ?? 0, updated_at: now });
      corrections.push(`${a.area}: ${a.value}`);
    }
    if (corrections.length) {
      s.session.reflect_back = { ...s.session.reflect_back!, corrections: [...s.session.reflect_back!.corrections, ...corrections] };
      events.push(`corrected ${corrections.length}`);
    }
    // The summary can't loop (persona 1 went to turn 34 on "looks right, just note it's 7am"):
    // "yes, plus a note" applies the note and confirms; after two correction rounds, or at the
    // turn budget, the summary is confirmed with the notes attached.
    const rounds = (engine().summary_rounds ?? 0) + (x.check === "yes" ? 0 : 1);
    engine().summary_rounds = rounds;
    const atBudget = engine().turns >= TURN_BUDGET;
    if (x.check === "yes" || rounds > MAX_SUMMARY_ROUNDS || atBudget) {
      if (x.check !== "yes") events.push(atBudget ? "turn budget reached at the summary; confirmed with notes attached" : `${MAX_SUMMARY_ROUNDS} correction rounds used; confirmed with notes attached`);
      if (x.check !== "yes" && x.value && !corrections.length) s.session.reflect_back = { ...s.session.reflect_back!, corrections: [...s.session.reflect_back!.corrections, `note: ${x.value}`] };
      if (corrections.length) await rewrite();
      s = confirmSummary(s, fw);
      events.push("summary confirmed");
      return done(DONE_REPLY, true);
    }
    if (corrections.length) {
      await rewrite();
      return { ...done("I've updated the summary. Does it look right now?") };
    }
    return done("What should I change? Tell me what's wrong or missing.");
  }

  /** Re-writes the items after a correction and re-renders the summary, keeping the engine's round count. */
  async function rewrite(): Promise<void> {
    const keep = engine().summary_rounds;
    for (const item of s.items) item.facts = {};
    await toSummary();
    engine().summary_rounds = keep;
  }
}

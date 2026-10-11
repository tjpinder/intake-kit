// One persona interview, scored. The interviewer is the real turn loop (same prompt and checks as
// the web app); the user is the simulator. Scoring follows the spec: right type routed, expected
// items found, correct gates, modifiers and AI overlay, zero ungrounded quotes, plus rejection
// rate, turns and cost.

import type { Framework } from "../lib/framework.ts";
import { findQuote, type TranscriptEntry } from "../lib/grounding.ts";
import { criticalAreas } from "../lib/gates.ts";
import { coverageFor, type Item, type Session } from "../lib/session.ts";
import { costUSD } from "../llm/pricing.ts";
import { runTurn } from "../llm/turn-loop.ts";
import type { ChatMessage, Provider } from "../llm/types.ts";
import type { Persona } from "./personas.ts";
import type { Simulator } from "./simulator.ts";

export interface RunRecord {
  persona: string;
  provider: string;
  run: number;
  completed: boolean;
  turns: number;
  /** Turns where the model's first attempt was rejected. */
  retriedTurns: number;
  /** Turns where nothing could be saved (rejected twice or unusable output). */
  failedTurns: number;
  /** A provider error ended the interview early. */
  error: string | null;
  /** Every rejection the app's checks made, by turn, so failures can be diagnosed. */
  rejections: Array<{ turn: number; attempt: number; path: string; reason: string }>;
  /** The model's raw output for every attempt, for diagnosis. */
  rawTurns: Array<{ turn: number; attempt: number; text: string }>;
  costUSD: number;
  seconds: number;
  session: Session;
  transcript: TranscriptEntry[];
  replies: string[];
  score: RunScore;
}

export interface RunScore {
  routed: boolean;
  primaryTypeFinal: boolean;
  itemsFound: boolean;
  gatesCorrect: boolean | null;
  modifiers: boolean | null;
  aiApplies: boolean | null;
  quadrant: boolean | null;
  enoughItems: boolean;
  unknownCritical: boolean | null;
  ungroundedQuotes: number;
  notes: string[];
}

function emptySession(id: string, provider: Session["session"]["provider"], now: Date): Session {
  const seeded = () => ({ status: "unknown" as const, value: null, quotes: [], probe_count: 0 });
  return {
    schema_version: 1,
    framework_version: "0.1.0",
    session: { id, started_at: now.toISOString(), mode: "stakeholder", provider, grounding: "transcript", reflect_back: null },
    core: { users: seeded(), outcome: seeded(), data: seeded(), systems: seeded(), constraints: seeded(), trust: seeded() },
    items: [],
  };
}

/** Every quote stored in a session, with where it lives. */
export function storedQuotes(s: Session): string[] {
  const out: string[] = [];
  for (const e of Object.values(s.core)) out.push(...e.quotes);
  for (const item of s.items) {
    out.push(item.trigger_quote, ...item.type_history.map((h) => h.quote));
    for (const e of [...Object.values(item.core_overrides), ...Object.values(item.coverage)]) out.push(...e.quotes);
    for (const f of Object.values(item.facts)) out.push(...f.quotes);
  }
  return out;
}

/** Pairs each expected item with a distinct actual item of the same type, primary item first. */
function matchItems(expected: Persona["expect"]["items"], items: Item[]): Array<Item | null> {
  const used = new Set<string>();
  return expected.map((e) => {
    const hit = items.find((i) => i.type === e.type && !used.has(i.id));
    if (hit) used.add(hit.id);
    return hit ?? null;
  });
}

export function scoreRun(persona: Persona, session: Session, transcript: TranscriptEntry[], completed: boolean, fw: Framework): RunScore {
  const x = persona.expect;
  const notes: string[] = [];
  const first = session.items[0];
  const routed = !!first && first.type_history[0]?.to === x.primary_type;
  if (!routed) notes.push(`opened as ${first?.type_history[0]?.to ?? "no item"}, expected ${x.primary_type}`);

  const matched = matchItems(x.items, session.items);
  const itemsFound = matched.every(Boolean);
  if (!itemsFound) notes.push(`missing items: ${x.items.filter((_, i) => !matched[i]).map((e) => e.type).join(", ")}`);
  const primary = matched[0] ?? session.items.find((i) => i.type === x.primary_type) ?? null;

  let gatesCorrect: boolean | null = null;
  if (completed) {
    gatesCorrect = x.items.every((e, i) => !e.gates || (matched[i]?.gate && e.gates.includes(matched[i]!.gate!.decision)));
    if (!gatesCorrect) notes.push(`gates: ${x.items.map((e, i) => `${e.type} got ${matched[i]?.gate?.decision ?? "none"}${e.gates ? ` (want ${e.gates.join("/")})` : ""}`).join("; ")}`);
  }

  const modifiers = x.modifiers ? !!primary && x.modifiers.every((m) => primary.modifiers.includes(m as Item["modifiers"][number])) : null;
  if (modifiers === false) notes.push(`modifiers: has [${primary?.modifiers.join(", ") ?? ""}], want [${x.modifiers!.join(", ")}]`);
  const aiApplies = x.ai_applies === undefined ? null : !!primary && (primary.facts.ai_applies?.band === "yes") === x.ai_applies;
  if (aiApplies === false) notes.push(`ai_applies: ${primary?.facts.ai_applies?.band ?? "not rated"}`);
  const quadrant = x.quadrant && completed ? !!primary?.scoring?.quadrant && x.quadrant.includes(primary.scoring.quadrant) : null;
  if (quadrant === false) notes.push(`quadrant: ${primary?.scoring?.quadrant ?? "none"}`);
  const enoughItems = session.items.length >= x.min_items;
  if (!enoughItems) notes.push(`${session.items.length} items, want at least ${x.min_items}`);

  let unknownCritical: boolean | null = null;
  if (x.min_unknown_critical !== undefined && primary) {
    const unsettled = criticalAreas(primary, fw).filter((id) => {
      const e = coverageFor(session, primary, id);
      return !e || e.status === "unknown";
    });
    unknownCritical = unsettled.length >= x.min_unknown_critical;
    if (!unknownCritical) notes.push(`only ${unsettled.length} critical areas unknown`);
  }

  const ungroundedQuotes = storedQuotes(session).filter((q) => !findQuote(q, transcript)).length;
  if (ungroundedQuotes) notes.push(`${ungroundedQuotes} ungrounded quotes`);

  return { routed, primaryTypeFinal: !!session.items.find((i) => i.type === x.primary_type), itemsFound, gatesCorrect, modifiers, aiApplies, quadrant, enoughItems, unknownCritical, ungroundedQuotes, notes };
}

export interface InterviewArgs {
  persona: Persona;
  run: number;
  interviewer: Provider;
  interviewerModel: string;
  simulator: Simulator;
  simulatorModel: string;
  fw: Framework;
  skill: string;
  maxTurns?: number;
  /** Called after each call with its cost, so the caller can enforce a spend cap. */
  onSpend?: (usd: number) => void;
  /** Return true to stop early (e.g. the budget is spent). */
  shouldStop?: () => boolean;
}

export async function runInterview(args: InterviewArgs): Promise<RunRecord> {
  const started = Date.now();
  let clock = started;
  const now = () => new Date(++clock).toISOString();
  const idHex = (args.persona.id.length * 4099 + args.run * 31).toString(16).padStart(4, "0").slice(-4);
  let session = emptySession(`2026-10-11-${idHex}`, args.interviewer.name === "claude" ? "claude" : "azure-openai", new Date(started));
  const transcript: TranscriptEntry[] = [];
  const replies: string[] = [];
  let cost = 0;
  let retriedTurns = 0;
  let failedTurns = 0;
  let error: string | null = null;
  const rejections: RunRecord["rejections"] = [];
  const rawTurns: RunRecord["rawTurns"] = [];
  const spend = (usd: number) => { cost += usd; args.onSpend?.(usd); };
  let userText = args.persona.opening;

  for (let turn = 0; turn < (args.maxTurns ?? 30); turn++) {
    if (args.shouldStop?.()) { error = "stopped: budget reached"; break; }
    transcript.push({ role: "user", text: userText, at: now() });
    try {
      const out = await runTurn({ provider: args.interviewer, fw: args.fw, skill: args.skill, session, transcript, replies, now });
      out.attempts.forEach((a, attempt) => {
        spend(costUSD(args.interviewerModel, a.usage));
        for (const r of a.rejections) rejections.push({ turn, attempt: attempt + 1, path: r.path, reason: r.reason });
        rawTurns.push({ turn, attempt: attempt + 1, text: a.text });
      });
      if (out.attempts.length > 1) retriedTurns++;
      if (out.result !== "applied") failedTurns++;
      session = out.session;
      replies.push(out.reply);
    } catch (err) {
      error = `interviewer: ${(err as Error).message}`;
      break;
    }
    if (session.session.reflect_back?.confirmed) break;

    const conversation: ChatMessage[] = transcript.flatMap((t, i) => [{ role: "user" as const, content: t.text }, { role: "assistant" as const, content: replies[i] }]);
    try {
      const sim = await args.simulator.reply(args.persona, conversation);
      spend(costUSD(args.simulatorModel, sim.usage));
      userText = sim.text;
    } catch (err) {
      error = `simulator: ${(err as Error).message}`;
      break;
    }
  }

  const completed = session.session.reflect_back?.confirmed === true;
  return {
    persona: args.persona.id,
    provider: args.interviewer.name,
    run: args.run,
    completed,
    turns: transcript.length,
    retriedTurns,
    failedTurns,
    error,
    rejections,
    rawTurns,
    costUSD: cost,
    seconds: (Date.now() - started) / 1000,
    session,
    transcript,
    replies,
    score: scoreRun(args.persona, session, transcript, completed, args.fw),
  };
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "n/a");

/** Rates per persona and overall, as a markdown report. */
export function report(records: RunRecord[], meta: { date: string; interviewerModel: string; simulatorModel: string; notRun: string[] }): string {
  const byPersona = new Map<string, RunRecord[]>();
  for (const r of records) byPersona.set(r.persona, [...(byPersona.get(r.persona) ?? []), r]);
  const row = (name: string, rs: RunRecord[]) => {
    const rate = (f: (r: RunRecord) => boolean | null) => {
      const applicable = rs.map(f).filter((v) => v !== null);
      return applicable.length ? pct(applicable.filter(Boolean).length, applicable.length) : "–";
    };
    const turns = rs.reduce((n, r) => n + r.turns, 0);
    return `| ${name} | ${rs.length} | ${rate((r) => r.completed)} | ${rate((r) => r.score.routed)} | ${rate((r) => r.score.itemsFound && r.score.enoughItems)} | ${rate((r) => r.score.gatesCorrect)} | ${rate((r) => {
      const checks = [r.score.modifiers, r.score.aiApplies, r.score.quadrant, r.score.unknownCritical].filter((v) => v !== null);
      return checks.length ? checks.every(Boolean) : null;
    })} | ${rs.reduce((n, r) => n + r.score.ungroundedQuotes, 0)} | ${pct(rs.reduce((n, r) => n + r.retriedTurns, 0), turns)} | ${pct(rs.reduce((n, r) => n + r.failedTurns, 0), turns)} | ${(turns / rs.length).toFixed(1)} | $${(rs.reduce((n, r) => n + r.costUSD, 0) / rs.length).toFixed(3)} |`;
  };
  const lines = [
    "# Persona eval report",
    "",
    `Run ${meta.date}. Interviewer: ${meta.interviewerModel} (the real turn loop, same prompt and checks as the web app). Simulated user: ${meta.simulatorModel}, which sees each persona's situation and voice but never its expected outcome.`,
    "",
    "Rates are across runs. Completed means the user confirmed the reflect-back within 30 turns. Gates are scored only for completed runs. Checks covers each persona's extra expectations (modifiers, AI overlay, quadrant, unknown critical areas). Retried means the model's first attempt at a turn was rejected by the app's checks; failed means nothing from that turn could be saved.",
    "",
    "| Persona | Runs | Completed | Routed | Items | Gates | Checks | Ungrounded quotes | Retried turns | Failed turns | Avg turns | Avg cost |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...[...byPersona].map(([p, rs]) => row(p, rs)),
    row("**All**", records),
    "",
    "## What went wrong, per run",
    "",
    ...records.flatMap((r) => (r.score.notes.length || r.error || !r.completed ? [`- **${r.persona}** run ${r.run}: ${[...(r.completed ? [] : ["didn't complete"]), ...(r.error ? [r.error] : []), ...r.score.notes].join("; ")}`] : [])),
    "",
    ...(meta.notRun.length ? ["## Not run", "", ...meta.notRun.map((n) => `- ${n}`), ""] : []),
  ];
  return lines.join("\n") + "\n";
}

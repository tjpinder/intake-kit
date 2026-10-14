// Async intake evals (HANDOFF.md, "Async intake mode", testing): one persona answers the question
// packet as an email reply, meeting notes or a call transcript, then up to two follow-up packets in
// the same form. The kit ingests each source, writes up and signs off, asking the persona each
// Don't-build question on its own. Scored with the live evals' scoreRun, plus async measures.
// Triage (type and modifiers) is the interviewer's call in async mode, so it comes from the card.

import type { Framework } from "../lib/framework.ts";
import { costUSD } from "../llm/pricing.ts";
import type { Provider } from "../llm/types.ts";
import type { Session } from "../lib/session.ts";
import { buildPacket, packetEmail } from "../lib/packet.ts";
import { runIngest, sourceTranscript, startAsync } from "../engine/ingest.ts";
import { findGaps, followUpEmail } from "../engine/gaps.ts";
import { runAsyncSummary, signOff } from "../engine/async.ts";
import { entryOf } from "../engine/apply.ts";
import { queueFor } from "../engine/plan.ts";
import type { Persona } from "./personas.ts";
import { documentPrompt, type AsyncFormat, type DocumentWriter } from "./simulator.ts";
import { scoreRun, type RunScore } from "./run.ts";

export const MAX_FOLLOW_UPS = 2;

export interface AsyncRecord {
  persona: string;
  format: AsyncFormat;
  run: number;
  completed: boolean;
  error: string | null;
  /** Follow-up packets answered after the first. */
  followUps: number;
  /** Required areas of the primary item answered after the first source, out of how many. */
  firstPass: { answered: number; required: number };
  /** Gaps still open at sign-off. */
  openAtSignOff: number;
  /** Quotes the engine dropped for not being in their source, across every ingest. */
  droppedQuotes: number;
  badCalls: number;
  dontBuildAsked: Array<{ key: string; question: string; reply: string; confirmed: boolean }>;
  sources: Array<{ kind: string; text: string }>;
  events: string[];
  costUSD: number;
  seconds: number;
  session: Session;
  score: RunScore;
}

const KIND: Record<AsyncFormat, "reply" | "notes" | "transcript"> = { email: "reply", notes: "notes", transcript: "transcript" };

export interface AsyncArgs {
  persona: Persona;
  format: AsyncFormat;
  run: number;
  kit: Provider;
  kitModel: string;
  writer: DocumentWriter;
  writerModel: string;
  fw: Framework;
  onSpend: (usd: number) => void;
  shouldStop: () => boolean;
}

export async function runAsyncIntake(a: AsyncArgs): Promise<AsyncRecord> {
  const started = Date.now();
  const events: string[] = [];
  const sources: AsyncRecord["sources"] = [];
  let cost = 0;
  let dropped = 0;
  let badCalls = 0;
  const spend = (model: string, usage: Parameters<typeof costUSD>[1]) => { const usd = costUSD(model, usage); cost += usd; a.onSpend(usd); };
  const who = a.persona.title;
  let s: Session = startAsync(a.fw, {
    id: `2026-10-14-${(a.run * 4096 + a.persona.id.length).toString(16).padStart(4, "0")}`,
    request: a.persona.opening, type: a.persona.expect.primary_type, modifiers: (a.persona.expect.modifiers ?? []) as Session["items"][number]["modifiers"],
    from: who, provider: "azure-openai", now: new Date().toISOString(),
  });
  const record = (completed: boolean, error: string | null, followUps: number, firstPass: AsyncRecord["firstPass"], dontBuildAsked: AsyncRecord["dontBuildAsked"]): AsyncRecord => ({
    persona: a.persona.id, format: a.format, run: a.run, completed, error, followUps, firstPass,
    openAtSignOff: completed ? findGaps(s, a.fw).gaps.length : -1, droppedQuotes: dropped, badCalls, dontBuildAsked, sources, events,
    costUSD: cost, seconds: Math.round((Date.now() - started) / 1000), session: s,
    score: scoreRun(a.persona, s, sourceTranscript(s), completed, a.fw),
  });

  let firstPass = { answered: 0, required: 0 };
  let followUps = 0;
  try {
    const packet = packetEmail(buildPacket(a.fw, { request: a.persona.opening, type: a.persona.expect.primary_type, modifiers: (a.persona.expect.modifiers ?? []) as never }));
    let ask = packet;
    for (let round = 0; round <= MAX_FOLLOW_UPS; round++) {
      if (a.shouldStop()) return record(false, "budget reached", followUps, firstPass, []);
      const doc = await a.writer.write(a.persona, documentPrompt(a.persona, a.format), ask);
      spend(a.writerModel, doc.usage);
      sources.push({ kind: KIND[a.format], text: doc.text });
      const out = await runIngest({ provider: a.kit, fw: a.fw, session: s, source: { kind: KIND[a.format], from: who, text: doc.text }, now: new Date().toISOString() });
      for (const c of out.calls) { spend(a.kitModel, c.usage); if (!c.ok) badCalls++; }
      dropped += out.events.filter((e) => /no quote from the source|not in the source|no words from the source/.test(e)).length;
      events.push(...out.events.map((e) => `[source ${sources.length}] ${e}`));
      if (out.result !== "applied") return record(false, "ingest failed three times", followUps, firstPass, []);
      s = out.session;
      if (round === 0) {
        const item = s.items.find((i) => !i.spawned_from)!;
        const queue = queueFor(item, a.fw);
        firstPass = { required: queue.length, answered: queue.filter((id) => { const e = entryOf(s, item, id); return e && e.status === "covered"; }).length };
      }
      const gaps = findGaps(s, a.fw);
      if (!gaps.gaps.length || round === MAX_FOLLOW_UPS) break;
      ask = followUpEmail(s, gaps);
      followUps++;
    }

    const sum = await runAsyncSummary({ provider: a.kit, fw: a.fw, session: s, now: new Date().toISOString() });
    for (const c of sum.calls) { spend(a.kitModel, c.usage); if (!c.ok) badCalls++; }
    events.push(...sum.events);
    s = sum.session;
    // The interviewer puts each Don't-build question to the requester on its own.
    const asked: AsyncRecord["dontBuildAsked"] = [];
    for (const c of sum.confirm) {
      const r = await a.writer.write(a.persona, documentPrompt(a.persona, "confirm"), c.question);
      spend(a.writerModel, r.usage);
      asked.push({ ...c, reply: r.text, confirmed: /^\W*(yes|yeah|yep|correct|right|that's right|exactly)\b/i.test(r.text) });
    }
    s = signOff(s, a.fw, { confirm: asked.filter((x) => x.confirmed).map((x) => x.key), by: "eval interviewer" });
    return record(true, null, followUps, firstPass, asked);
  } catch (err) {
    return record(false, (err as Error).message, followUps, firstPass, []);
  }
}

/** The async eval report: per persona and format, then the overall bar. */
export function asyncReport(records: AsyncRecord[], meta: { date: string; commit: string; kitModel: string; writerModel: string; notRun: string[] }): string {
  const rate = (rs: AsyncRecord[], f: (r: AsyncRecord) => boolean | null) => {
    const scored = rs.filter((r) => f(r) !== null);
    return scored.length ? `${scored.filter((r) => f(r)).length}/${scored.length}` : "n/a";
  };
  const rows = records.map((r) => `| ${r.persona} | ${r.format} | ${r.run} | ${r.completed ? "yes" : "no"} | ${r.session.items.map((i) => `${i.type}: ${i.gate?.decision ?? "-"}`).join("; ")} | ${r.score.gatesCorrect === null ? "n/a" : r.score.gatesCorrect ? "yes" : "**no**"} | ${r.firstPass.answered}/${r.firstPass.required} | ${r.followUps} | ${r.openAtSignOff} | ${r.score.ungroundedQuotes} | ${r.droppedQuotes} | $${r.costUSD.toFixed(3)} |`);
  const byFormat = (["email", "notes", "transcript"] as AsyncFormat[]).map((f) => {
    const rs = records.filter((r) => r.format === f);
    return `| ${f} | ${rs.length} | ${rate(rs, (r) => r.completed)} | ${rate(rs, (r) => r.score.gatesCorrect)} | ${rs.reduce((n, r) => n + r.score.ungroundedQuotes, 0)} | ${rs.length ? (rs.reduce((n, r) => n + (r.firstPass.required ? r.firstPass.answered / r.firstPass.required : 0), 0) / rs.length * 100).toFixed(0) : 0}% |`;
  });
  return [
    `# Async intake evals (${meta.date})`,
    "",
    `Commit ${meta.commit}. Kit (ingest, write-up): ${meta.kitModel}. Simulated requester: ${meta.writerModel}. Triage (type and modifiers) comes from each persona card, since it's the interviewer's call in async mode: routing isn't measured here.`,
    "",
    "| Format | Runs | Completed | Gates match | Ungrounded quotes | First answer filled (avg) |",
    "| --- | --- | --- | --- | --- | --- |",
    ...byFormat,
    "",
    "| Persona | Format | Run | Completed | Gates | Match | First answer filled | Follow-ups | Open at sign-off | Ungrounded | Dropped quotes | Cost |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Notes",
    "",
    ...records.flatMap((r) => (r.score.notes.length || r.error ? [`- **${r.persona}** ${r.format} #${r.run}: ${[...(r.error ? [r.error] : []), ...r.score.notes].join("; ")}`] : [])),
    ...meta.notRun.map((n) => `- ${n}`),
    "",
  ].join("\n");
}

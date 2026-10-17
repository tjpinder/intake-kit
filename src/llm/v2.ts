// Interview engine v2: what the model sees for each of its narrow jobs (HANDOFF.md, "Interview
// engine v2", model contract). Each call is small and structured, and none of them lets the model
// choose what to ask next, create an item, decide the interview is done, or score anything.

import openingSchema from "../../schema/v2/opening.schema.json" with { type: "json" };
import phraseSchema from "../../schema/v2/phrase.schema.json" with { type: "json" };
import extractSchema from "../../schema/v2/extract.schema.json" with { type: "json" };
import writeupSchema from "../../schema/v2/writeup.schema.json" with { type: "json" };
import ingestSchema from "../../schema/v2/ingest.schema.json" with { type: "json" };
import type { Framework } from "../lib/framework.ts";
import type { TranscriptEntry } from "../lib/grounding.ts";
import { factsFor, guide } from "../lib/guide.ts";
import type { Item, Session } from "../lib/session.ts";
import { entryOf } from "../engine/apply.ts";
import type { Target } from "../engine/plan.ts";
import type { TurnRequest } from "./types.ts";

export { openingSchema, phraseSchema, extractSchema, writeupSchema, ingestSchema };

const STYLE = `You're a plain-spoken interviewer helping someone turn a problem into a build-ready spec. Never mention JSON, schemas, coverage areas, bands, gates or quadrants to the user.`;

const QUOTES = `A quote is the user's exact words: a short, contiguous span copied character for character from one message they sent. Never paraphrase in a quote, never stitch two messages, never quote yourself. If you can't quote them, use null.`;

const areaList = (fw: Framework, ids: string[]) => ids.map((id) => `- ${id}: ${fw.areas.get(id)?.must_capture ?? ""}`).join("\n");
const userLines = (transcript: TranscriptEntry[]) => transcript.filter((t) => t.role === "user").map((t, i) => `${i + 1}. ${t.text}`).join("\n");

/** classify_opening: first turn only. */
export function openingRequest(fw: Framework, opening: string, areas: string[]): TurnRequest {
  const types = Object.entries(fw.router.types).map(([k, t]) => `- ${k} (${t.label}). Signals: ${t.signals.join("; ")}`).join("\n");
  const mods = Object.entries(fw.router.modifiers).map(([k, m]) => `- ${k} (${m.label}). Signals: ${m.signals.join("; ")}`).join("\n");
  return {
    system: [
      STYLE,
      "Classify the opening statement of an intake interview.",
      `type: the one entry type that fits best:\n${types}`,
      'confidence: "high" when one type clearly fits, "med" when it probably does, "low" only when two types fit about equally.',
      "title: a short plain title for what they want (under eight words).",
      "trigger_quote: the user's words that show the type.",
      `modifiers: only when the user describes one, each with their words. Never for something they say isn't there ("no API" isn't an integration):\n${mods}`,
      `also_answers: areas from this list the opening already answers in full, each with a short value and the user's words. Leave out anything partial or implied:\n${areaList(fw, areas)}`,
      QUOTES,
    ].join("\n\n"),
    history: [{ role: "user", content: opening }],
    context: "Return the classification.",
    format: { name: "classify_opening", schema: openingSchema },
  };
}

export interface PhraseInput {
  target: Target;
  item: Item;
  transcript: TranscriptEntry[];
  replies: string[];
  /** For a probe: what they said the first time. */
  partial: string | null;
}

/** phrase: one question for the area code chose. */
export function phraseRequest(fw: Framework, p: PhraseInput): TurnRequest {
  const area = fw.areas.get(p.target.area);
  const purpose =
    p.target.check === "manual_work"
      ? `Ask whether ${fw.router.checks!.manual_work.must_capture.charAt(0).toLowerCase()}${fw.router.checks!.manual_work.must_capture.slice(1)}. One question.`
      : p.target.check === "existing_asset"
        ? `Ask whether anything they already have, or could get, does all or part of this${p.partial ? ` (they've mentioned: "${p.partial}")` : ""}. One question.`
      : p.target.purpose === "baseline"
        ? `They've said how they'd judge success but gave no number for today. Ask what it costs now, in hours, errors or money ("What's it costing now, in hours, errors or chargebacks?").`
        : p.target.kind === "probe"
          ? `Their answer${p.partial ? ` ("${p.partial}")` : ""} was vague or partial. Ask once about the last time it actually happened: what exactly happened, who was involved.`
          : `Find out: ${area?.must_capture}. An example phrasing: "${area?.probes[0]}". Adapt it to their situation and skip anything they've already told you.`;
  const recent = p.transcript.slice(-3).map((t, i, a) => {
    const reply = p.replies[p.transcript.length - a.length + i];
    return `User: ${t.text}${reply ? `\nYou: ${reply}` : ""}`;
  });
  return {
    system: [
      STYLE,
      "Write the next question of the interview. The app has already chosen what to ask about; ask about that and nothing else.",
      "One question, under 30 words, in plain words. You may open with a few words acknowledging their last answer. Never stack two questions. When something went wrong, ask what about the setup made it easy to go wrong, not who did it.",
    ].join("\n\n"),
    history: [],
    context: [`What they want: ${p.item.title}.`, `Ask about (${p.target.area}): ${purpose}`, "The conversation so far (most recent last):", ...recent].join("\n"),
    format: { name: "phrase", schema: phraseSchema },
  };
}

export interface ExtractInput {
  question: string;
  reply: string;
  /** The area asked about, or "summary" for the playback. */
  area: string;
  /** What a check or confirmation asks: yes / no / unclear. Null for an ordinary question. */
  check: string | null;
  /** Other areas the reply might also answer. */
  others: string[];
}

/** extract: how one reply answers the one question asked. */
export function extractRequest(fw: Framework, x: ExtractInput): TurnRequest {
  const area = fw.areas.get(x.area);
  return {
    system: [
      STYLE,
      "Classify the user's reply to the one question they were asked.",
      [
        'status: "answered" when the reply answers what the question asks; "partial" when it answers only some of it or vaguely ("usually", "I think"); "not_applicable" when they say it doesn\'t apply to them; "declined" when they won\'t or can\'t say ("I don\'t know" is partial if they add anything, otherwise declined); "off_topic" when the reply is about something else.',
        "value: what they said, as one short plain sentence. Null if they said nothing usable.",
        "quote: the user's words that carry the answer, from their reply.",
        x.check ? `check: ${x.check}` : 'check: "none".',
        "wrap_up: true only if they ask to stop, finish or wrap up.",
        `also_answers: other areas from this list their reply clearly answers in full, each with its own value and quote from the reply. Never the area that was asked:\n${areaList(fw, x.others)}`,
      ].join("\n"),
      QUOTES,
    ].join("\n\n"),
    history: [],
    context: [`The question (${x.area}${area ? `: ${area.must_capture}` : ""}): ${x.question}`, `The user's reply: ${x.reply}`].join("\n"),
    format: { name: "extract", schema: extractSchema },
  };
}

/** Check wording for extract's `check` field. */
export const CHECK_TEXT = {
  manual_work: '"yes" if they describe doing that work today (not only as a fallback if the new thing failed), "no" if they don\'t, "unclear" if you can\'t tell. Put their words in quote.',
  existing_asset: '"yes" if something they have or could get already does all or part of this, "no" if nothing does, "unclear" if you can\'t tell.',
  kill_criteria: '"yes" if they name anything that would make them stop it or switch it off, "no" if they say nothing would, "unclear" if you can\'t tell. Put their words in quote and the condition in value.',
  confirm: '"yes" if they agree, "no" if they say it\'s wrong, "unclear" otherwise.',
  summary: '"yes" if they say the summary is right, even if they add a note or a detail; "no" only if they say something in it is wrong; "unclear" otherwise. Put each change or added detail they give in also_answers, under the area it belongs to.',
};

/** write-up: bands, prose, criteria and guardrails for one item, at the summary. */
export function writeUpRequest(fw: Framework, session: Session, item: Item, transcript: TranscriptEntry[]): TurnRequest {
  const g = guide(fw);
  const bands = g.slice(g.indexOf("## Facts: pick a band"));
  const areas = ["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)].flatMap((m) => fw.modules[m]?.areas ?? []);
  const answers = areas
    .map((a) => [a.id, entryOf(session, item, a.id)] as const)
    .filter(([, e]) => e?.updated_at)
    .map(([id, e]) => `- ${id} (${e!.status}): ${e!.value ?? "nothing usable"}${e!.quotes.length ? ` | their words: ${e!.quotes.map((q) => `"${q}"`).join("; ")}` : ""}`);
  return {
    system: [
      STYLE,
      `Write up one item of an intake interview, from what the user already said and nothing else. Every field's item is "${item.id}".`,
      `facts: a band for each of these facts: ${factsFor(item, fw).join(", ")}. Pick the band whose description matches what they said; between two, the lower one; "unknown" when they didn't say. evidence: the area IDs the band rests on (only areas listed as answered). A baseline (measurable_with_baseline) needs a number with a unit that they said.`,
      "prose: one line each for problem_statement, current_state, mvp and out_of_scope, and mitigation if they described how a risk is handled. Plain words, close to theirs.",
      "acceptance: at least one criterion and one error_case in Given/When/Then form, only from what they said, each citing answered areas as evidence. Don't invent thresholds.",
      "guardrails: a kill_criterion and a fallback if they said them (what would make them switch it off; what they'd do if it stopped working), plus review_point and data_rule if they said them. Each cites answered areas. If they didn't say, leave it out.",
      "open_questions: one for each area that matters and is still unknown: what to ask, who could answer it, what would settle it.",
      "reflect_back_text: two or three plain sentences playing the item back in their words.",
      QUOTES,
      bands,
    ].join("\n\n"),
    history: [],
    context: [`Item ${item.id}: ${item.title} (${item.type}${item.modifiers.length ? `, ${item.modifiers.join(", ")}` : ""})`, "Recorded answers:", ...answers, "Everything the user said:", userLines(transcript)].join("\n"),
    format: { name: "write_up", schema: writeupSchema },
  };
}

export interface IngestInput {
  /** The source's kind and who it's from, so the model knows whose words they are. */
  kind: "request" | "reply" | "notes" | "transcript";
  from: string;
  text: string;
  items: Array<{ id: string; title: string; type: string; areas: string[]; checks: Array<"manual_work" | "existing_asset" | "kill_criteria"> }>;
}

const INGEST_CHECKS: Record<"manual_work" | "existing_asset" | "kill_criteria", string> = {
  manual_work: 'manual_work: is any part of this done by hand today (not only as a fallback if the new thing failed)? "yes", "no", or "unclear".',
  existing_asset: 'existing_asset: does anything they have, or could get, already do all or part of this? "yes" even if it only does part (only totals, only some of the data, the right data in the wrong view); "no" only if nothing does any of it; "unclear" if it doesn\'t say.',
  kill_criteria: 'kill_criteria: did they say what would make them stop it or switch it off? "yes" with the condition in value, "no" if they said nothing would, "unclear" otherwise.',
};

const termLines = (session: Session): string[] => {
  const terms = (session.terms ?? []).filter((t) => t.status !== "not_a_term");
  if (!terms.length) return [];
  return ["Terms so far:", ...terms.map((t) => `- ${t.term}: ${t.status === "confirmed" ? `defined as "${t.definition}"${t.conflict ? ` and also as "${t.conflict.definition}" (a definition here settles which is right; conflict false)` : ""}` : t.draft ? `drafted as "${t.draft.definition}", not yet certain` : "not yet defined"}`), "A definition for a term already listed must be the complete definition: what was already recorded or drafted, with whatever this document settles or adds. Never just the part this document adds.", ""];
};

/** ingest (async intake): which areas one pasted source answers, with quotes from it. */
export function ingestRequest(fw: Framework, session: Session, x: IngestInput): TurnRequest {
  const sections = x.items.map((it) => {
    const item = session.items.find((i) => i.id === it.id)!;
    const areas = it.areas.map((id) => {
      const e = entryOf(session, item, id);
      const conflict = session.session.engine?.areas[id.startsWith("core.") ? id : `${item.id}:${id}`]?.conflict;
      const known = e && e.status !== "unknown" && e.value ? ` | recorded so far: ${e.value}${conflict ? ` | another source said: ${conflict.value ?? conflict.quote} (an answer here settles which is right; conflict false)` : ""}` : "";
      return `- ${id}: ${fw.areas.get(id)?.must_capture ?? ""}${known}`;
    });
    const checks = it.checks.map((c) => `- ${INGEST_CHECKS[c]}`);
    return [`Item ${it.id}: ${it.title} (${it.type})`, "Areas:", ...areas, ...(checks.length ? ["Checks:", ...checks] : [])].join("\n");
  });
  const who = x.kind === "request" ? `the request as it came in from ${x.from}, in their words` : x.kind === "notes" ? `the interviewer's notes from talking to ${x.from}` : x.kind === "transcript" ? `a transcript of a conversation with ${x.from}` : `a reply from ${x.from}`;
  return {
    system: [
      "You read one document gathered during an intake and record what it says about each area. You only classify; you never decide what to ask next, create items, score or judge.",
      [
        "answers: one entry for each area the document actually says something about. Leave out areas it doesn't mention.",
        "An area is answered only by words about that area's own question. One sentence can answer two areas when it answers each one's own question: \"cost lives in the ERP and counts live in the WMS\" is both the data and the systems; \"in my inbox by 7am\" is both a rule and the delivery. List it under each. But a reason or a side remark that only touches a related idea doesn't answer another area: \"we recount because the auditors sample our biggest variances\" is about the decision, not about who catches a wrong number (trust).",
        "A threshold or cutoff that decides which ones matter (\"variances over $500 go to the controller\") is a rule: record it under the rules area (core.constraints). Never under the outcome, the decision or trust. It isn't a definition of the term either: it says which ones matter, not how one is calculated.",
        "Doubt about how a term is counted (\"I think\", \"Mike might calculate it differently\") belongs to that term's definition, with certain false. It doesn't answer trust or any other area.",
        'status: "answered" when it answers what the area needs; "partial" when it answers only some of it, or vaguely ("usually", "I think", no example); "not_applicable" when it says the area doesn\'t apply; "declined" when it says they don\'t know or won\'t say.',
        "value: what the document says, as one short plain sentence. Never add a detail it doesn't say (a day, a number, a name). Null if nothing usable.",
        "quotes: one or more exact spans copied character for character from the document that carry the answer. Never paraphrase, never join two places into one quote.",
        "conflict: true only if the answer contradicts what is recorded so far for that area (shown after \"recorded so far\"): two answers to the same fact that can't both be true, like \"by 7am\" and \"by 6am\", or \"over $500\" and \"over $250\". Adding detail, narrowing it down, or saying the same thing another way is never a conflict: \"per picker\" then \"per picker, per shift, per day\" is conflict false. A different fact in the same area is never a conflict either: a deadline where a threshold is recorded, or the level of detail wanted where today's process is recorded.",
        "The same fact is often recorded under more than one area (a deadline under both rules and delivery). When the document contradicts a recorded fact, return an answer with conflict true for every area where that fact is recorded, not just one.",
        "item: the exact item ID the area is listed under, like \"item-1\" (never the type). A shared core area belongs to the first item listed.",
        "checks: one entry for each check listed under an item, with the document's words in quote (null if none).",
        "name: for a manual_work check that is \"yes\", a short name for the work done by hand, two to five words, the way a colleague would refer to it (\"Morning Excel export\", \"Monday pick sheet\"). Null for every other check.",
        "terms: business terms the document uses whose meaning is local to this business or could be read more than one way, so two people could count or judge them differently (over pick, fill rate, on-time, exception, active user), each with the words where it appears. Not the name of something being built or already in use (a script, a template, a report, a tool, a program), not job titles or system names, not generic words, not a phrase that only appears inside another term's definition (\"absolute value per SKU\" in a definition of variance), and not terms already listed below or longer forms of them (\"cycle count variance\" when \"variance\" is listed).",
        "definitions: for any term (listed below or new), a definition the document gives: what counts and what doesn't, in its words, with quotes; whether it says the thing can be seen in the system's data; any worked example with the right result. certain: false if the document hedges any part of it (\"I think\", \"not sure\", \"check with\"). If the document settles or adds to part of a term already listed (\"wrong-location scans do count\"), return a definition for that same term, using its listed name, with the full updated definition and conflict false; never make a separate term out of part of one. conflict: true only if it contradicts a definition already recorded.",
        "A definition that calculates it differently (net vs absolute value, a different cost, different units) contradicts the earlier one, even if the earlier one was hedged: conflict true. A different threshold is a conflict on the rule, not on the definition.",
      ].join("\n"),
      "Only use what the document says. Don't infer or fill gaps.",
    ].join("\n\n"),
    history: [],
    context: [`The document is ${who}.`, "", ...sections, "", ...termLines(session), "The document:", "<<<", x.text, ">>>"].join("\n"),
    format: { name: "ingest", schema: ingestSchema },
  };
}

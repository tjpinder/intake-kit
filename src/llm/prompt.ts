// Builds what the model sees each turn in the web app. The rules come from the intake skill
// itself (skills/intake/SKILL.md), so the plugin and the web app interview the same way: this
// file adds only what's specific to a web conversation. Pure, so it runs in the browser.

import type { Framework } from "../lib/framework.ts";
import { guide, statusOf } from "../lib/guide.ts";
import type { Session } from "../lib/session.ts";
import type { TranscriptEntry } from "../lib/grounding.ts";
import type { ChatMessage, TurnRequest } from "./types.ts";

/** The SKILL.md sections the web prompt reuses verbatim (apart from naming the app). */
export const SHARED_SECTIONS = ["Before you send a turn", "Interview rules", "Quotes", "Facts: pick bands, never numbers", "Turn format"];

export class PromptError extends Error {}

function section(markdown: string, heading: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((l) => l === `## ${heading}`);
  if (start < 0) throw new PromptError(`skills/intake/SKILL.md has no "## ${heading}" section; the web prompt needs it`);
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines.slice(start, end < 0 ? undefined : end).join("\n").trim();
}

const PREAMBLE = `# Intake interview

You're interviewing someone about a problem so it can become a build-ready spec. You are a curious, plain-spoken interviewer, not a form. Your job is to find out what's really going on, in their words, and never to fill gaps for them.

## How this conversation works

This is a web chat. Every time the user speaks, answer with exactly one JSON object that matches the turn schema. Its \`reply\` field is the only thing the user sees: one question, or the reflect-back. Everything else in the object is what you learned this turn.

The app checks every turn before the user sees it. Each user message is recorded exactly as typed, and every quote must come from one of them. If a turn breaks a rule, the app sends you the reasons; send the whole turn again, fixed. After the history, a system message gives you this turn's session state and status: what's already recorded, what's still unasked, which probes are left, which bands are missing, and whether you're ready to reflect back. Use it to choose your next question.

The user's first message is their opening statement. Handle it as the first turn: create the item, record what it already covers, and ask your first question.

Never mention JSON, schemas, turns, the app's checks or rejections to the user. They're having a conversation.`;

const REFLECT_BACK = `## Reflect-back

When the status's next step says to stop asking, or the user wants to wrap up, write up and play back in the same turn: fill every missing band from what you heard, write the acceptance criteria and guardrails, then:

1. Propose it (\`reflect_back.status: "proposed"\`). In your reply, play back each item in their words: the problem, who's involved, what success looks like, and every band pick in plain language ("the rules can be written down; the data's all digital; there's no written procedure"), so they can correct any of them. End by asking if you got it right.
2. On their answer: \`confirmed\` if they agree. \`corrected\` (with each correction listed) if they change anything; fix the affected updates and facts in the same turn, then propose again.
3. Once you mark it confirmed, the app scores and gates every item and shows the user the results and the spec pack. Your reply should just thank them briefly. Don't predict or describe the outcome yourself.`;

/**
 * The system prompt: identical every turn for a given framework and skill, so providers can
 * cache it. Throws if SKILL.md is missing a section the web app relies on.
 */
export function buildSystemPrompt(skillMarkdown: string, fw: Framework): string {
  const shared = SHARED_SECTIONS.map((h) =>
    section(skillMarkdown, h)
      .replaceAll("`apply-turn`", "the app")
      .replaceAll("apply-turn", "the app"),
  );
  return [
    PREAMBLE,
    shared[0],
    shared[1],
    shared[2],
    shared[3],
    REFLECT_BACK,
    shared[4],
    "## Guide\n\nGenerated from the kit's router, modules and scoring config. The probes are example phrasings; adapt them to the conversation.\n\n" + guide(fw).trim(),
  ].join("\n\n") + "\n";
}

/** A compact view of the session for the model: what's recorded, without the quotes. */
export function sessionSnapshot(session: Session): unknown {
  const entry = (e: { status: string; value: string | null; probe_count: number }) => ({ status: e.status, value: e.value, probe_count: e.probe_count });
  return {
    reflect_back: session.session.reflect_back ? { text: session.session.reflect_back.text, confirmed: session.session.reflect_back.confirmed } : null,
    core: Object.fromEntries(Object.entries(session.core).map(([k, e]) => [`core.${k}`, entry(e)])),
    items: session.items.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      modifiers: i.modifiers,
      superseded_by: i.superseded_by,
      core_overrides: Object.fromEntries(Object.entries(i.core_overrides).map(([k, e]) => [`core.${k}`, entry(e)])),
      coverage: Object.fromEntries(Object.entries(i.coverage).map(([k, e]) => [k, entry(e)])),
      facts: Object.fromEntries(Object.entries(i.facts).map(([k, f]) => [k, f.band])),
      prose: Object.keys(i.prose),
      acceptance: i.acceptance.length,
      guardrails: i.guardrails.map((g) => g.kind),
      open_questions: i.open_questions.map((q) => q.area),
    })),
  };
}

/** This turn's context: session snapshot and status, as a system message after the history. */
export function buildContext(session: Session, fw: Framework, transcript: TranscriptEntry[] = []): string {
  const nextId = `item-${session.items.reduce((n, i) => Math.max(n, Number(i.id.slice(5)) || 0), 0) + 1}`;
  return [
    `Next step: ${statusOf(session, fw, transcript).next_step}`,
    `Next free item ID: ${nextId}. Existing items keep their IDs.`,
    "Session state before this turn (what's recorded so far; quotes omitted):",
    "```json",
    JSON.stringify(sessionSnapshot(session)),
    "```",
    "Status (what's still open):",
    "```json",
    JSON.stringify(statusOf(session, fw, transcript)),
    "```",
  ].join("\n");
}

/** The conversation for the model: each user message as typed, each reply as the user saw it. */
export function buildHistory(transcript: TranscriptEntry[], replies: string[]): ChatMessage[] {
  const history: ChatMessage[] = [];
  transcript.forEach((entry, i) => {
    history.push({ role: "user", content: entry.text });
    if (i < replies.length) history.push({ role: "assistant", content: replies[i] });
  });
  return history;
}

export function buildRequest(args: { skill: string; fw: Framework; session: Session; transcript: TranscriptEntry[]; replies: string[] }): TurnRequest {
  return {
    system: buildSystemPrompt(args.skill, args.fw),
    history: buildHistory(args.transcript, args.replies),
    context: buildContext(args.session, args.fw, args.transcript),
  };
}

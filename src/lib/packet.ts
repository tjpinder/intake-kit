// Async intake (HANDOFF.md, "Async intake mode"): the question packet. Code builds it from the
// module YAML with no model call: the item's required areas in the engine's queue order, then the
// checks word for word, then every other area under "if you know". The interviewer sends it to the
// person who knows the answers, or uses it as a meeting agenda.

import type { Framework, ItemType, Modifier } from "./framework.ts";
import type { Item } from "./session.ts";
import { queueFor } from "../engine/plan.ts";
import { MANUAL_QUESTION } from "../engine/turn.ts";
import { shortTitle } from "./title.ts";
import { enforceVerbatim } from "./verbatim.ts";

export interface PacketQuestion {
  /** The coverage ID the answer fills, or the check it settles. */
  area: string;
  check: "manual_work" | "kill_criteria" | null;
  ask: string;
  why: string;
  example: string | null;
}

export interface Packet {
  request: string;
  /** The item's short title, for the header. */
  title: string;
  type: ItemType;
  modifiers: Modifier[];
  /** Required areas in queue order, then the checks. */
  questions: PacketQuestion[];
  /** Everything else that applies: helpful, not required. Included by default. */
  if_you_know: PacketQuestion[];
}

export interface PacketInput {
  request: string;
  /** The item's short title; the request cut to its first clause when there's none. */
  title?: string;
  type: ItemType;
  modifiers?: Modifier[];
}

/** The packet for one request, as code would ask it. */
export function buildPacket(fw: Framework, input: PacketInput): Packet {
  const modifiers = input.modifiers ?? [];
  const item = { id: "item-1", type: input.type, modifiers, spawned_from: null } as unknown as Item;
  const queue = queueFor(item, fw);
  const fromArea = (id: string): PacketQuestion => {
    const a = fw.areas.get(id)!;
    return { area: id, check: null, ask: a.packet.ask, why: a.packet.why, example: a.packet.examples?.[input.type] ?? a.packet.example };
  };
  const questions = queue.map(fromArea);
  const checks = fw.router.checks;
  if (checks?.manual_work.applies_to.includes(input.type)) {
    questions.push({ area: fw.modules[input.type]?.anchor as string, check: "manual_work", ask: MANUAL_QUESTION, why: "Work done by hand today is often worth fixing first, or is what the new thing would replace.", example: "Yes: every Monday I rebuild the sheet from an export, about four hours." });
  }
  if (checks?.kill_criteria.applies_to.includes(input.type)) {
    questions.push({ area: checks.kill_criteria.area, check: "kill_criteria", ask: checks.kill_criteria.question, why: "Agreeing up front when to stop protects everyone if it doesn't work out.", example: "If its numbers disagreed with the WMS two weeks running, we'd switch it off." });
  }
  const asked = new Set(queue);
  const all = ["core", input.type, ...modifiers.map((m) => `mod.${m}`)].flatMap((m) => fw.modules[m]?.areas.map((a) => a.id) ?? []);
  const if_you_know = [...new Set(all)].filter((id) => !asked.has(id)).map(fromArea);
  return { request: input.request, title: input.title?.trim() || shortTitle(input.request), type: input.type, modifiers, questions, if_you_know };
}

const INTRO = [
  "Please answer what you can, in your own words. If you don't know, say so. That's a useful answer.",
  "Real examples help most: the last time it happened, what you saw, who was involved.",
];

/**
 * The packet as text to paste into an email: the short title in the header, the request as it came
 * in. Quote marks hold only the request's own words; examples are unquoted.
 */
export function packetEmail(p: Packet): string {
  const lines = [`# Questions about: ${p.title}`, "", `The request: "${p.request}"`, "", ...INTRO, ""];
  p.questions.forEach((q, i) => lines.push(`${i + 1}. **${q.ask}**`, `   _Why: ${q.why}_${q.example ? `  \n   _For example: ${q.example}_` : ""}`, ""));
  if (p.if_you_know.length) {
    lines.push("## If you know", "", "These help, but skip any you're not sure about.", "");
    p.if_you_know.forEach((q, i) => lines.push(`${p.questions.length + i + 1}. ${q.ask}`, ""));
  }
  return enforceVerbatim(lines.join("\n").trimEnd() + "\n", [p.request]);
}

/** The packet as a meeting agenda, with room for notes under each question. */
export function packetAgenda(p: Packet): string {
  const lines = [`# Intake meeting: ${p.title}`, "", `The request: "${p.request}"`, "", `About ${Math.max(15, Math.round((p.questions.length * 3) / 5) * 5)} minutes. Ask for a real, recent example on each.`, ""];
  p.questions.forEach((q, i) => lines.push(`## ${i + 1}. ${q.ask}`, "", `_Why: ${q.why}_`, "", "Notes:", "", ""));
  if (p.if_you_know.length) {
    lines.push("## If there's time", "");
    p.if_you_know.forEach((q, i) => lines.push(`${p.questions.length + i + 1}. ${q.ask}`, "", "   Notes:", ""));
  }
  return enforceVerbatim(lines.join("\n").trimEnd() + "\n", [p.request]);
}

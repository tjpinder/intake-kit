// The reflect-back the user sees, built from the session file by code. The model proposes the
// reflect-back; what it says in its reply is never the summary. Found in the first live web
// test: the model put the summary only in reflect_back.text, its reply asked something else,
// and the user was asked to confirm a summary they never saw.

import type { Framework } from "./framework.ts";
import { scoreAndGate } from "./gates.ts";
import { bandCheck } from "./score.ts";
import { coverageFor, isCaptured, type CoverageEntry, type Item, type Session } from "./session.ts";

export interface SummaryAnswer {
  area: string;
  label: string;
  /** covered: in their words. assumed: our reading, to confirm. unknown: not known yet. */
  status: CoverageEntry["status"];
  value: string | null;
  /** Taken word for word from a reply the interviewer didn't record. Never used as scoring evidence. */
  captured: boolean;
}

export interface SummaryBand {
  fact: string;
  label: string;
  /** The plain-language description of the band, or "Not known yet". */
  text: string;
  unknown: boolean;
  /** Set when the band shown differs from the pick: its only evidence was captured, or a baseline had no number. */
  note: string | null;
}

export interface SummaryItem {
  id: string;
  title: string;
  type: string;
  problem: string | null;
  today: string | null;
  smallest_version: string | null;
  out_of_scope: string | null;
  mitigation: string | null;
  answers: SummaryAnswer[];
  bands: SummaryBand[];
  acceptance: string[];
  guardrails: string[];
  open_questions: string[];
}

export interface Summary {
  items: SummaryItem[];
  /**
   * Every definitive Don't-build reason the gates would apply, as a question the user confirms
   * with the summary. Don't build needs evidence, and the user is the one who can give it.
   */
  confirm_first: string[];
  /** Items left out of the playback, and why (dropped, or replaced by another item). */
  set_aside: string[];
}

const CORE_LABEL: Record<string, string> = {
  "core.users": "Who's involved",
  "core.outcome": "What success looks like",
  "core.data": "The data",
  "core.systems": "Systems and tools",
  "core.constraints": "Rules and constraints",
  "core.trust": "When it goes wrong",
};

const humanize = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
export const areaLabel = (id: string) => CORE_LABEL[id] ?? humanize(id.split(".").pop()!);

const GATE_FACT_LABEL: Record<string, string> = {
  success_metric: "How success is measured",
  existing_asset: "Something that already does this",
  decision_depends: "Someone acts on the result",
  broken_cause: "Cause",
  workaround_permanent: "The workaround is permanent",
  ai_applies: "Uses AI",
  push: "Pain with today's way",
  pull: "Pull of the new way",
  anxiety: "Worry about the new way",
  habit: "Habit of the old way",
};

function bandText(fw: Framework, fact: string, band: string): string {
  if (band === "unknown") return "Not known yet";
  const described = fw.scoring.criteria[fact]?.describe?.[band];
  return described ?? humanize(band);
}

function factLabel(fw: Framework, fact: string): string {
  return fw.scoring.criteria[fact]?.label ?? fw.scoring.ai_overlay.checks[fact]?.label ?? GATE_FACT_LABEL[fact] ?? humanize(fact);
}

export function buildSummary(session: Session, fw: Framework): Summary {
  const live = session.items.filter((i) => !i.superseded_by && !i.dropped);
  return {
    items: live.map((item) => summarizeItem(session, item, fw)),
    confirm_first: dontBuildQuestions(session, fw),
    set_aside: [
      ...session.items.filter((i) => i.dropped).map((i) => `${i.title}: dropped (${i.dropped!.reason})`),
      ...session.items.filter((i) => i.superseded_by && !i.dropped).map((i) => `${i.title}: replaced by ${session.items.find((x) => x.id === i.superseded_by)?.title ?? i.superseded_by}`),
    ],
  };
}

function summarizeItem(session: Session, item: Item, fw: Framework): SummaryItem {
  const modules = ["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)];
  const answers: SummaryAnswer[] = [];
  for (const m of modules) {
    for (const a of fw.modules[m]?.areas ?? []) {
      const e = coverageFor(session, item, a.id);
      if (!e?.updated_at) continue;
      answers.push({ area: a.id, label: areaLabel(a.id), status: e.status, value: e.value, captured: isCaptured(e) });
    }
  }
  const bands: SummaryBand[] = Object.entries(item.facts).map(([fact, f]) => {
    const { band, reason } = bandCheck(session, item, fact);
    return {
      fact,
      label: factLabel(fw, fact),
      text: bandText(fw, fact, band),
      unknown: band === "unknown",
      note: reason === "captured"
        ? `Left as not known: it rested only on a reply I didn't record properly (I'd have said "${bandText(fw, fact, f.band)}").`
        : reason === "no_number"
          ? "Shown as vague: nothing you said about it has a number to measure against."
          : null,
    };
  });
  return {
    id: item.id,
    title: item.title,
    type: fw.router.types[item.type]?.label ?? item.type,
    problem: item.prose.problem_statement ?? null,
    today: item.prose.current_state ?? null,
    smallest_version: item.prose.mvp ?? null,
    out_of_scope: item.prose.out_of_scope ?? null,
    mitigation: item.prose.mitigation ?? null,
    answers,
    bands,
    acceptance: item.acceptance.map((a) => `${a.kind === "error_case" ? "If it goes wrong: " : ""}Given ${a.given}, when ${a.when}, then ${a.then}.`),
    guardrails: item.guardrails.map((g) => `${humanize(g.kind)}: ${g.text}`),
    open_questions: item.open_questions.map((q) => q.question),
  };
}

const STATUS_NOTE: Record<CoverageEntry["status"], string> = {
  covered: "",
  assumed: " (my reading; please check)",
  unknown: " (not known yet)",
  not_applicable: " (doesn't apply)",
  declined: " (they preferred not to say)",
};

/** The definitive Don't-build reasons the gates would apply if the user confirmed now, as questions. */
export function dontBuildQuestions(session: Session, fw: Framework): string[] {
  return dontBuildChecks(session, fw).map((c) => c.question);
}

/**
 * The same, each with the key an async sign-off confirms it by ("item-2:existing_asset"). A reason
 * not confirmed at sign-off routes the item to Gather more instead.
 */
export function dontBuildChecks(session: Session, fw: Framework): Array<{ key: string; question: string }> {
  if (!session.items.length) return [];
  let preview: Session;
  try {
    preview = scoreAndGate({ ...session, session: { ...session.session, reflect_back: { text: "", confirmed: true, corrections: [] } } }, fw).session;
  } catch {
    return [];
  }
  const out: Array<{ key: string; question: string }> = [];
  for (const item of preview.items) {
    if (item.gate?.decision !== "dont_build" || item.dropped) continue;
    for (const reason of item.gate.reasons) {
      if (reason.startsWith("(also")) continue;
      const by = item.superseded_by ? preview.items.find((i) => i.id === item.superseded_by)?.title : null;
      const add = (k: string, question: string) => out.push({ key: `${item.id}:${k}`, question });
      if (reason.startsWith("An existing report or feature already covers it")) add("existing_asset", `You said something you already have does what "${item.title}" would do, so it wouldn't be built. Is that right?`);
      else if (reason.startsWith("No decision depends on it")) add("decision_depends", `No decision depends on "${item.title}", so it wouldn't be built. Is that right?`);
      else if (reason.startsWith("The user describes its value as trivial")) add("value", `You described "${item.title}" as low value, so it wouldn't be built. Is that right?`);
      else if (reason.startsWith("Superseded by") && by) add("superseded", `"${item.title}" would go away once "${by}" exists, so it wouldn't be built on its own. Is that right?`);
    }
  }
  return out;
}

/** The summary as plain text, for the CLI and for the model's context. */
export function summaryText(summary: Summary): string {
  const out: string[] = [];
  for (const it of summary.items) {
    out.push(`## ${it.title} (${it.type})`, "");
    for (const [label, text] of [["The problem", it.problem], ["Today", it.today], ["Smallest useful version", it.smallest_version], ["Out of scope", it.out_of_scope], ["How risk is reduced", it.mitigation]] as const) {
      if (text) out.push(`- ${label}: ${text}`);
    }
    if (it.answers.length) {
      out.push("", "What you told me:");
      for (const a of it.answers) {
        const value = a.value ?? "";
        out.push(`- ${a.label}: ${value}${a.captured ? " (your words as typed; not yet confirmed)" : STATUS_NOTE[a.status]}`.trimEnd());
      }
    }
    if (it.bands.length) {
      out.push("", "How I'd rate it:");
      for (const b of it.bands) out.push(`- ${b.label}: ${b.text}${b.note ? `. ${b.note}` : ""}`);
    }
    if (it.acceptance.length) out.push("", "It works when:", ...it.acceptance.map((a) => `- ${a}`));
    if (it.guardrails.length) out.push("", "Guardrails:", ...it.guardrails.map((g) => `- ${g}`));
    if (it.open_questions.length) out.push("", "Still open:", ...it.open_questions.map((q) => `- ${q}`));
    out.push("");
  }
  if (summary.set_aside.length) out.push("Set aside:", ...summary.set_aside.map((s) => `- ${s}`), "");
  if (summary.confirm_first.length) out.push("Please confirm:", ...summary.confirm_first.map((q) => `- ${q}`), "");
  return out.join("\n").trim() + "\n";
}

/**
 * Which reply the summary belongs under: the one answering the user message the proposal came
 * in on (the proposal is stamped after that message). Null when nothing is proposed.
 */
export function summaryIndex(session: Session, transcript: Array<{ at: string }>): number | null {
  const rb = session.session.reflect_back;
  if (!rb || rb.confirmed || !rb.proposed_at) return null;
  const i = transcript.filter((t) => t.at <= rb.proposed_at!).length - 1;
  return i >= 0 ? i : null;
}

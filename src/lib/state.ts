// Files intake-kit keeps in the target repo. intake-answers.yaml sits at the repo root and is
// meant to be committed; everything under .intake-kit/ except checks.json is local state and
// is gitignored by the .gitignore written here.

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { TranscriptEntry } from "./grounding.ts";
import type { Session } from "./session.ts";

export const SESSION_FILE = "intake-answers.yaml";

export function paths(dir: string) {
  const state = join(dir, ".intake-kit");
  return {
    session: join(dir, SESSION_FILE),
    stateDir: state,
    marker: join(state, "active"),
    transcript: join(state, "transcript.jsonl"),
    turn: join(state, "turn.json"),
    rejections: join(state, "rejections.jsonl"),
    state: join(state, "state.json"),
    archive: join(state, "archive"),
    gitignore: join(state, ".gitignore"),
    /** Interview engine v2 in the plugin: the model outputs for the turn in progress, one file per call. */
    calls: join(state, "calls"),
    /** The replies shown to the user, one per line, so the next question can follow the conversation. */
    replies: join(state, "replies.jsonl"),
  };
}

export const STATE_GITIGNORE = `# Local intake-kit state. Transcripts hold the user's exact words and stay on this machine.
# checks.json and check.mjs (the CI copy of the checks) are the only files here that belong in the repo.
*
!.gitignore
!checks.json
!check.mjs
`;

export function ensureStateDir(dir: string): void {
  const p = paths(dir);
  mkdirSync(p.stateDir, { recursive: true });
  if (!existsSync(p.gitignore)) writeFileSync(p.gitignore, STATE_GITIGNORE);
}

/** A sortable timestamp safe for file names on every OS. */
export function fileStamp(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

/** Moves a file into .intake-kit/archive/ under a new name. Never deletes anything. */
export function archive(dir: string, file: string, name: string): string {
  const p = paths(dir);
  mkdirSync(p.archive, { recursive: true });
  const target = join(p.archive, name);
  renameSync(file, target);
  return target;
}

/** Writes content straight into .intake-kit/archive/. */
export function archiveText(dir: string, name: string, content: string): string {
  const p = paths(dir);
  mkdirSync(p.archive, { recursive: true });
  const target = join(p.archive, name);
  writeFileSync(target, content);
  return target;
}

export function readTranscript(dir: string): TranscriptEntry[] | null {
  const file = paths(dir).transcript;
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as TranscriptEntry);
}

export function writeTranscript(dir: string, entries: TranscriptEntry[]): void {
  writeFileSync(paths(dir).transcript, entries.map((e) => JSON.stringify(e) + "\n").join(""));
}

export function appendTranscript(dir: string, entry: TranscriptEntry): void {
  appendFileSync(paths(dir).transcript, JSON.stringify(entry) + "\n");
}

export function readReplies(dir: string): string[] {
  const file = paths(dir).replies;
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as string);
}

export function appendReply(dir: string, reply: string): void {
  appendFileSync(paths(dir).replies, JSON.stringify(reply) + "\n");
}

export function readSession(dir: string): Session | null {
  const file = paths(dir).session;
  return existsSync(file) ? (parseYaml(readFileSync(file, "utf8")) as Session) : null;
}

export function writeSession(dir: string, session: Session): void {
  const header = "# Written by intake-kit. Edit with care: every SPEC and ACCEPTANCE line is rendered from this file.\n";
  // No anchors/aliases: shared arrays (e.g. evidence copied into scoring) are written out in full.
  writeFileSync(paths(dir).session, header + stringifyYaml(session, { lineWidth: 0, aliasDuplicateObjects: false }));
}

interface RunState {
  consecutive_rejections: number;
  /** The reply the user was shown after a turn that couldn't be saved, so a stale question isn't captured against. */
  shown_reply?: string | null;
}

export function readRunState(dir: string): RunState {
  const file = paths(dir).state;
  if (!existsSync(file)) return { consecutive_rejections: 0 };
  return JSON.parse(readFileSync(file, "utf8")) as RunState;
}

export function writeRunState(dir: string, state: RunState): void {
  writeFileSync(paths(dir).state, JSON.stringify(state, null, 2) + "\n");
}

/**
 * The kit root: the nearest ancestor of this file holding .claude-plugin/plugin.json (the
 * Claude Code plugin) or kit.json (the standalone kit in .agents/intake-kit/ for Codex).
 * Works from src/ and dist/.
 */
export function pluginRoot(from: string = fileURLToPath(import.meta.url)): string {
  let dir = dirname(from);
  for (;;) {
    if (existsSync(join(dir, ".claude-plugin", "plugin.json")) || existsSync(join(dir, "kit.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`intake-kit: can't find the plugin root above ${from}`);
    dir = parent;
  }
}

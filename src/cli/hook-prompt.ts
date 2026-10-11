// UserPromptSubmit hook: records the user's exact words while an intake is active, so apply-turn
// can check every quote against what was really typed. It never blocks a prompt: any failure
// exits 1, which Claude Code shows as a non-blocking error and the prompt goes through.
//
// The prompt that invokes the intake command starts recording. If no intake is active, it also
// archives any previous transcript so the new interview starts clean. Recording stops when
// apply-turn removes .intake-kit/active after the reflect-back is confirmed.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { appendTranscript, archive, ensureStateDir, fileStamp, paths } from "../lib/state.ts";

// /intake-kit:intake or /intake in Claude Code; $intake in Codex.
const INTAKE_COMMAND = /^\s*(\/(intake-kit:)?intake|\$intake)(\s|$)/;

interface PromptPayload { prompt?: unknown; cwd?: unknown }

function main() {
  const raw = readFileSync(0, "utf8");
  const payload = JSON.parse(raw) as PromptPayload;
  if (typeof payload.prompt !== "string") return;
  const dir = typeof payload.cwd === "string" && payload.cwd ? payload.cwd : process.cwd();
  const p = paths(dir);
  const isCommand = INTAKE_COMMAND.test(payload.prompt);
  const at = new Date().toISOString();

  if (isCommand && !existsSync(p.marker)) {
    ensureStateDir(dir);
    if (existsSync(p.transcript)) archive(dir, p.transcript, `transcript-${fileStamp(at)}.jsonl`);
    writeFileSync(p.marker, "");
  }
  if (!existsSync(p.marker)) return;

  appendTranscript(dir, { role: "user", text: payload.prompt, at, ...(isCommand ? { command: true } : {}) });
}

try {
  main();
} catch (err) {
  process.stderr.write(`intake-kit prompt hook: ${(err as Error).message}. This prompt wasn't recorded, so quotes from it can't be verified.\n`);
  process.exit(1);
}

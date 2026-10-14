// `node dist/intake.mjs <command>` — the intake skill's only way to touch the session file.
//
//   start [--mode stakeholder|builder] [--provider claude|codex] [--grounding transcript|unverified] [--new | --resume]
//   apply-turn [--turn <file>]          (default: .intake-kit/turn.json)
//   render [--overwrite <file>]... [--keep <file>]...
//                                       write the spec pack and briefs; an existing file that would
//                                       change is staged with a diff, never overwritten unasked.
//                                       --keep records that the user kept their own version
//   status                              what's still open, as returned after every turn
//   guide                               the router, areas and bands, as markdown for the skill
//
// Async intake (HANDOFF.md, "Async intake mode"): the interviewer collects answers from someone else.
//   triage --request <text> --type <type> [--modifier m]... [--from <who>] [--title <t>] [--provider claude|codex] [--new]
//                                       start an async intake and write the question packet
//   packet [--format email|agenda]      the question packet again
//   ingest --file <path> --kind reply|notes|transcript --from <who>
//                                       read one pasted source against every area (exit 6 for the call)
//   gaps                                readiness and the follow-up packet (only what's still open)
//   summary                             write up each item and show the summary (exit 6 for the call)
//   correct (--area <id> [--item <id>] | --term <term>) --text <words> [--by <who>]
//                                       the interviewer's correction, recorded as their notes
//   signoff [--confirm <key>]... [--by <who>]
//                                       sign off; each Don't-build reason counts only if its key is confirmed
//
// Options: --dir <repo> (default: current directory). Output is one JSON object on stdout.
// Exit codes: 0 done, 2 turn rejected (retry once), 3 rejected again (don't retry),
// 4 needs a decision from the user, 5 rendered but some files need the user's OK to overwrite,
// 1 unexpected error.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { loadFramework, readTemplates } from "../lib/framework-fs.ts";
import { runEngineTurn } from "../engine/turn.ts";
import { newEngine } from "../engine/types.ts";
import { validateExtract, validateIngest, validateOpening, validatePhrase, validateWriteUp } from "../lib/schemas.ts";
import { runIngest, startAsync } from "../engine/ingest.ts";
import { findGaps, followUpEmail, readinessLines } from "../engine/gaps.ts";
import { AsyncError, correct, runAsyncSummary, signOff } from "../engine/async.ts";
import { buildPacket, packetAgenda, packetEmail } from "../lib/packet.ts";
import type { ItemType, Modifier } from "../lib/framework.ts";
import { ProviderError, type Provider, type TurnRequest } from "../llm/types.ts";
import { guide, statusOf } from "../lib/guide.ts";
import { renderAll } from "../lib/render.ts";
import { buildSummary, summaryText } from "../lib/summary.ts";
import { lineDiff } from "../lib/diff.ts";
import { readConfig } from "../lib/checks.ts";
import {
  appendReply, appendTranscript, archive, archiveText, ensureStateDir, paths, pluginRoot, readReplies, readSession, readTranscript,
  writeRunState, writeSession, writeTranscript,
} from "../lib/state.ts";
import type { Session } from "../lib/session.ts";

const out = (exitCode: number, body: Record<string, unknown>): never => {
  process.stdout.write(JSON.stringify(body, null, 2) + "\n");
  process.exit(exitCode);
};

// INTAKE_KIT_NOW and INTAKE_KIT_SESSION_ID pin the clock and session ID, so a recorded demo replays
// byte for byte (scripts/replay-async-demo.mjs and its test). Unset in normal use.
const now = () => process.env.INTAKE_KIT_NOW ?? new Date().toISOString();
const sessionId = (at: string) => process.env.INTAKE_KIT_SESSION_ID ?? `${at.slice(0, 10)}-${randomBytes(2).toString("hex")}`;

function start(dir: string, opts: { mode: string; provider: string; grounding: string; new: boolean; resume: boolean }) {
  const p = paths(dir);
  const fw = loadFramework(pluginRoot());
  ensureStateDir(dir);
  const existing = readSession(dir);

  if (existing) {
    const done = existing.session.reflect_back?.confirmed === true;
    if (opts.resume && !done) {
      if (existing.session.grounding === "transcript" && !existsSync(p.marker)) writeFileSync(p.marker, "");
      return out(0, { result: "resumed", session_id: existing.session.id, status: statusOf(existing, fw) });
    }
    if (!opts.new) {
      return out(4, {
        result: "needs_decision",
        session_id: existing.session.id,
        complete: done,
        message: done
          ? `${p.session} holds a completed intake. Run start --new to begin another; the old file is archived, not deleted.`
          : `${p.session} holds an intake in progress. Ask the user whether to resume it (start --resume) or start over (start --new; the old file is archived, not deleted).`,
      });
    }
    const archived = archive(dir, p.session, `intake-answers-${existing.session.id}.yaml`);
    // Keep only the transcript from the latest intake command on; archive the rest.
    const transcript = readTranscript(dir);
    if (transcript) {
      const lastCommand = transcript.map((e) => !!e.command).lastIndexOf(true);
      const keep = lastCommand >= 0 ? transcript.slice(lastCommand) : [];
      if (keep.length < transcript.length) {
        const earlier = transcript.slice(0, transcript.length - keep.length);
        archiveText(dir, `transcript-${existing.session.id}.jsonl`, earlier.map((e) => JSON.stringify(e) + "\n").join(""));
        writeTranscript(dir, keep);
      }
    }
    process.stderr.write(`archived the previous intake to ${archived}\n`);
  }

  const startedAt = now();
  const seeded = () => ({ status: "unknown" as const, value: null, quotes: [], probe_count: 0 });
  const session: Session = {
    schema_version: 1,
    framework_version: fw.router.framework_version,
    session: {
      id: sessionId(startedAt),
      started_at: startedAt,
      mode: opts.mode as Session["session"]["mode"],
      provider: opts.provider as Session["session"]["provider"],
      grounding: opts.grounding as Session["session"]["grounding"],
      reflect_back: null,
      asked: {},
      engine: newEngine(),
    },
    core: { users: seeded(), outcome: seeded(), data: seeded(), systems: seeded(), constraints: seeded(), trust: seeded() },
    items: [],
  };
  writeSession(dir, session);
  writeRunState(dir, { consecutive_rejections: 0 });

  const warnings: string[] = [];
  if (opts.grounding === "transcript") {
    if (!existsSync(p.marker)) writeFileSync(p.marker, "");
    if (!readTranscript(dir)?.length) {
      warnings.push("No transcript has been recorded yet, so quotes can't be verified. The prompt hook may not be installed or enabled; check /hooks. Every quoted answer will be rejected until it records the user's messages.");
    }
  }
  return out(0, { result: "started", session_id: session.session.id, session_file: p.session, warnings, status: statusOf(session, fw) });
}

function renderCommand(dir: string, overwrite: string[], keep: string[]) {
  const session = readSession(dir);
  if (!session) return out(4, { result: "no_session", message: "No intake in progress. Run start first." });
  if (!session.session.reflect_back?.confirmed) {
    return out(4, { result: "not_ready", message: "Nothing is rendered until the reflect-back is confirmed and the items are gated." });
  }
  const both = overwrite.filter((f) => keep.includes(f));
  if (both.length) return out(4, { result: "bad_option", message: `Use --overwrite or --keep for a file, not both: ${both.join(", ")}` });
  const root = pluginRoot();
  const checks = existsSync(join(paths(dir).stateDir, "checks.json")) ? readConfig(dir).config : null;
  const rendered = renderAll(session, loadFramework(root), readTemplates(root), checks);
  const unknown = [...overwrite, ...keep].filter((f) => !rendered.has(f));
  if (unknown.length) return out(4, { result: "bad_option", message: `--overwrite/--keep name files this intake doesn't render: ${unknown.join(", ")}` });

  // The ledger records, per file, what intake-kit last wrote (or found already matching), and
  // which proposed content the user chose to keep their own file over. A file still matching
  // what was written hasn't been edited, so it's refreshed without asking. A kept file isn't
  // asked about again until the proposed content changes.
  const ledgerFile = join(paths(dir).stateDir, "rendered.json");
  const raw = existsSync(ledgerFile) ? JSON.parse(readFileSync(ledgerFile, "utf8")) : {};
  const ledger: { written: Record<string, string>; kept: Record<string, string> } =
    raw.written || raw.kept ? { written: raw.written ?? {}, kept: raw.kept ?? {} } : { written: raw, kept: {} };
  const hash = (text: string) => createHash("sha256").update(text).digest("hex");
  const write = (file: string, content: string) => {
    writeFileSync(join(dir, file), content);
    ledger.written[file] = hash(content);
    delete ledger.kept[file];
  };

  const staged = join(paths(dir).stateDir, "render");
  type Status = "written" | "unchanged" | "updated" | "overwritten" | "kept" | "needs_confirmation";
  const files: Array<{ file: string; status: Status; diff?: string; staged?: string }> = [];
  for (const [file, content] of rendered) {
    const target = join(dir, file);
    if (!existsSync(target)) {
      write(file, content);
      files.push({ file, status: "written" });
      continue;
    }
    const current = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
    if (current === content) {
      ledger.written[file] = hash(content);
      files.push({ file, status: "unchanged" });
    } else if (ledger.written[file] === hash(current)) {
      write(file, content);
      files.push({ file, status: "updated" });
    } else if (overwrite.includes(file)) {
      write(file, content);
      files.push({ file, status: "overwritten" });
    } else if (keep.includes(file) || ledger.kept[file] === hash(content)) {
      ledger.kept[file] = hash(content);
      files.push({ file, status: "kept" });
    } else {
      const stagedFile = join(staged, file);
      mkdirSync(dirname(stagedFile), { recursive: true });
      writeFileSync(stagedFile, content);
      files.push({ file, status: "needs_confirmation", diff: lineDiff(current, content), staged: stagedFile });
    }
  }
  mkdirSync(paths(dir).stateDir, { recursive: true });
  writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + "\n");
  const pending = files.filter((f) => f.status === "needs_confirmation").map((f) => f.file);
  return out(pending.length ? 5 : 0, {
    result: pending.length ? "needs_confirmation" : "rendered",
    files,
    ...(pending.length
      ? { message: `These files already exist and would change: ${pending.join(", ")}. Show the user each diff and ask. Then run render once with --overwrite <file> for each one they approve and --keep <file> for each one they want left as it is.` }
      : {}),
  });
}

/** A call the engine needs that Claude hasn't answered yet this turn. */
class NeedCall extends ProviderError {
  readonly call: string;
  readonly request: TurnRequest;
  constructor(call: string, request: TurnRequest) {
    super(`needs ${call}`, { kind: "config" });
    this.call = call;
    this.request = request;
  }
}

const VALIDATE: Record<string, (d: unknown) => { ok: boolean; errors: string[] }> = {
  classify_opening: validateOpening, phrase: validatePhrase, extract: validateExtract, write_up: validateWriteUp, ingest: validateIngest,
};

/** The outputs Claude has written to .intake-kit/calls, each checked against its call's schema. Exits on a bad file. */
function readCallQueues(dir: string): Record<string, unknown[]> {
  const p = paths(dir);
  const queues: Record<string, unknown[]> = {};
  if (!existsSync(p.calls)) return queues;
  for (const file of readdirSync(p.calls).filter((f) => f.endsWith(".json"))) {
    const name = file.slice(0, -5);
    if (!VALIDATE[name]) return out(4, { result: "bad_call_file", message: `${file} isn't a call this engine makes` });
    let data: unknown;
    try { data = JSON.parse(readFileSync(join(p.calls, file), "utf8")); } catch (err) { return out(2, { result: "invalid", call: name, errors: [`not JSON: ${(err as Error).message}`] }); }
    const list = Array.isArray(data) ? data : [data];
    for (const [i, d] of list.entries()) {
      const v = VALIDATE[name](d);
      if (!v.ok) return out(2, { result: "invalid", call: name, entry: i, errors: v.errors, message: `Fix ${file} and run the command again.` });
    }
    queues[name] = list;
  }
  return queues;
}

/** Claude as the model: each call is answered from its queue, or stops with NeedCall. */
function queueProvider(queues: Record<string, unknown[]>): Provider {
  return {
    name: "claude",
    async complete(request: TurnRequest) {
      const name = request.format!.name;
      const next = queues[name]?.shift();
      if (next === undefined) throw new NeedCall(name, request);
      return { text: JSON.stringify(next), model: "claude", usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 } };
    },
  };
}

/** Exit 6: the engine needs one call; Claude answers it in .intake-kit/calls and reruns the same command. */
function needsCall(dir: string, err: NeedCall, command: string): never {
  const already = queuesUsed(paths(dir).calls, err.call);
  return out(6, {
    result: "needs",
    call: err.call,
    write_to: join(".intake-kit", "calls", `${err.call}.json`),
    how: already
      ? `Add your answer as one more entry to the JSON array already in that file (it holds ${already}), then run ${command} again.`
      : `Write a JSON array holding your one answer, then run ${command} again.`,
    instructions: err.request.system,
    input: err.request.context,
    schema: err.request.format?.name,
  });
}

/**
 * One user turn through interview engine v2, with Claude as the model. The engine decides
 * everything; when it needs a model call (classify the opening, phrase the next question, extract
 * the reply, write up an item), this stops with exit 6 and the call's instructions. Claude writes
 * its answer to .intake-kit/calls/<call>.json (a JSON array: one entry per call of that kind this
 * turn) and runs `turn` again. The turn is saved only once it completes.
 */
async function turnCommand(dir: string, message: string | undefined) {
  const p = paths(dir);
  const session = readSession(dir);
  if (!session) return out(4, { result: "no_session", message: "No intake in progress. Run start first." });
  // Without the prompt hook (grounding unverified), Claude passes the user's message itself.
  if (message !== undefined) {
    ensureStateDir(dir);
    appendTranscript(dir, { role: "user", text: message, at: now() });
  }
  const transcript = readTranscript(dir) ?? [];
  const users = transcript.filter((t) => t.role === "user");
  const engine = session.session.engine;
  if (users.length === 0 || (engine && engine.turns >= users.length && engine.phase !== "opening")) {
    return out(4, { result: "waiting", message: "Nothing new from the user yet. Ask your question and wait for their reply." });
  }

  // The outputs Claude has written for this turn, checked against each call's schema first.
  const queues: Record<string, unknown[]> = {};
  if (existsSync(p.calls)) {
    for (const file of readdirSync(p.calls).filter((f) => f.endsWith(".json"))) {
      const name = file.slice(0, -5);
      if (!VALIDATE[name]) return out(4, { result: "bad_call_file", message: `${file} isn't a call this engine makes` });
      let data: unknown;
      try { data = JSON.parse(readFileSync(join(p.calls, file), "utf8")); } catch (err) { return out(2, { result: "invalid", call: name, errors: [`not JSON: ${(err as Error).message}`] }); }
      const list = Array.isArray(data) ? data : [data];
      for (const [i, d] of list.entries()) {
        const v = VALIDATE[name](d);
        if (!v.ok) return out(2, { result: "invalid", call: name, entry: i, errors: v.errors, message: `Fix ${file} and run turn again.` });
      }
      queues[name] = list;
    }
  }
  const provider: Provider = {
    name: "claude",
    async complete(request: TurnRequest) {
      const name = request.format!.name;
      const next = queues[name]?.shift();
      if (next === undefined) throw new NeedCall(name, request);
      return { text: JSON.stringify(next), model: "claude", usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 } };
    },
  };
  const fw = loadFramework(pluginRoot());
  let outcome;
  try {
    outcome = await runEngineTurn({ provider, fw, session, transcript, replies: readReplies(dir), now });
  } catch (err) {
    if (!(err instanceof NeedCall)) throw err;
    const already = queuesUsed(p.calls, err.call);
    return out(6, {
      result: "needs",
      call: err.call,
      write_to: join(".intake-kit", "calls", `${err.call}.json`),
      how: already
        ? `Add your answer as one more entry to the JSON array already in that file (it holds ${already}), then run turn again.`
        : "Write a JSON array holding your one answer, then run turn again.",
      instructions: err.request.system,
      input: err.request.context,
      schema: err.request.format?.name,
    });
  }
  if (outcome.result !== "applied") return out(3, { result: "send_again", message: "The answers in .intake-kit/calls didn't fit. Ask the user to send their message again.", events: outcome.events });
  writeSession(dir, outcome.session);
  appendReply(dir, outcome.reply);
  if (existsSync(p.calls)) rmSync(p.calls, { recursive: true, force: true });
  const phase = outcome.session.session.engine?.phase;
  if (outcome.confirmed && existsSync(p.marker)) rmSync(p.marker); // interview over: stop recording prompts
  return out(0, {
    result: "applied",
    reply: outcome.reply,
    // The playback is built from the session by code; show it under the reply, word for word.
    ...(phase === "summary" ? { summary: summaryText(buildSummary(outcome.session, fw)) } : {}),
    ...(outcome.confirmed ? { gates: outcome.session.items.map((i) => ({ item: i.id, title: i.title, decision: i.gate?.decision, reasons: i.gate?.reasons, revisit_trigger: i.gate?.revisit_trigger })) } : {}),
    events: outcome.events,
  });
}

// ---- Async intake ---------------------------------------------------------------------------

const TYPES: ItemType[] = ["broken", "manual_process", "known_idea", "exploratory", "data_report"];
const MODIFIERS: Modifier[] = ["integration", "compliance", "migration"];

function asyncSession(dir: string): Session {
  const s = readSession(dir);
  if (!s) return out(4, { result: "no_session", message: "No intake in progress. Run triage first." });
  if (s.session.channel !== "async") return out(4, { result: "not_async", message: "This intake is a live interview. Use turn, or start an async one with triage --new." });
  return s;
}

/** Writes the packet as email text and as a meeting agenda, under .intake-kit. */
function writePacket(dir: string, s: Session): { email: string; agenda: string } {
  const fw = loadFramework(pluginRoot());
  const item = s.items.find((i) => !i.spawned_from)!;
  const request = s.session.sources?.find((x) => x.kind === "request")?.text ?? item.title;
  const p = buildPacket(fw, { request, type: item.type, modifiers: item.modifiers });
  const email = join(paths(dir).stateDir, "packet.md");
  const agenda = join(paths(dir).stateDir, "agenda.md");
  writeFileSync(email, packetEmail(p));
  writeFileSync(agenda, packetAgenda(p));
  return { email, agenda };
}

function triage(dir: string, o: { request?: string; type?: string; modifiers: string[]; from?: string; title?: string; new: boolean; provider: string }) {
  if (!o.request?.trim()) return out(4, { result: "bad_option", message: "--request is required: the request in one line, in the words it came in." });
  if (!o.type || !TYPES.includes(o.type as ItemType)) return out(4, { result: "bad_option", message: `--type must be one of ${TYPES.join(", ")}` });
  for (const m of o.modifiers) if (!MODIFIERS.includes(m as Modifier)) return out(4, { result: "bad_option", message: `--modifier must be one of ${MODIFIERS.join(", ")}` });
  const p = paths(dir);
  ensureStateDir(dir);
  const existing = readSession(dir);
  if (existing) {
    if (!o.new) return out(4, { result: "needs_decision", session_id: existing.session.id, message: `${p.session} holds an intake already. Run triage --new to start another; the old file is archived, not deleted.` });
    process.stderr.write(`archived the previous intake to ${archive(dir, p.session, `intake-answers-${existing.session.id}.yaml`)}\n`);
  }
  const at = now();
  const fw = loadFramework(pluginRoot());
  const session = startAsync(fw, { id: sessionId(at), request: o.request.trim(), type: o.type as ItemType, modifiers: o.modifiers as Modifier[], title: o.title, from: o.from ?? "the requester", provider: o.provider as Session["session"]["provider"], now: at });
  writeSession(dir, session);
  const files = writePacket(dir, session);
  return out(0, { result: "triaged", session_id: session.session.id, session_file: p.session, packet: files.email, agenda: files.agenda, readiness: readinessLines(findGaps(session, fw)) });
}

function packetCommand(dir: string, format: string) {
  const s = asyncSession(dir);
  const files = writePacket(dir, s);
  const file = format === "agenda" ? files.agenda : files.email;
  return out(0, { result: "packet", file, text: readFileSync(file, "utf8") });
}

async function ingestCommand(dir: string, o: { file?: string; kind?: string; from?: string }) {
  const s = asyncSession(dir);
  if (s.session.engine?.phase === "confirmed") return out(4, { result: "signed_off", message: "This intake is signed off. Start another with triage --new." });
  if (!o.file || !existsSync(o.file)) return out(4, { result: "bad_option", message: "--file must name the file holding the pasted reply, notes or transcript." });
  if (!o.kind || !["reply", "notes", "transcript"].includes(o.kind)) return out(4, { result: "bad_option", message: "--kind must be reply, notes or transcript" });
  if (!o.from?.trim()) return out(4, { result: "bad_option", message: "--from is required: who the answers came from." });
  const text = readFileSync(o.file, "utf8").trim();
  if (!text) return out(4, { result: "bad_option", message: `${o.file} is empty` });
  const fw = loadFramework(pluginRoot());
  let outcome;
  try {
    outcome = await runIngest({ provider: queueProvider(readCallQueues(dir)), fw, session: s, source: { kind: o.kind as "reply", from: o.from.trim(), text }, now: now() });
  } catch (err) {
    if (err instanceof NeedCall) return needsCall(dir, err, "ingest with the same options");
    throw err;
  }
  if (outcome.result !== "applied") return out(3, { result: "failed", message: "The answers in .intake-kit/calls didn't fit, so nothing from this source was recorded. Run ingest again.", events: outcome.events });
  // The session can't have moved on to a summary that no longer matches: back to collecting.
  if (outcome.session.session.engine!.phase === "summary") outcome.session.session.engine!.phase = "collecting";
  writeSession(dir, outcome.session);
  if (existsSync(paths(dir).calls)) rmSync(paths(dir).calls, { recursive: true, force: true });
  return gapsOut(dir, outcome.session, { result: "ingested", events: outcome.events });
}

function gapsOut(dir: string, s: Session, extra: Record<string, unknown> = {}) {
  const fw = loadFramework(pluginRoot());
  const r = findGaps(s, fw);
  const followup = followUpEmail(s, r);
  const file = join(paths(dir).stateDir, "followup.md");
  if (followup) writeFileSync(file, followup);
  else if (existsSync(file)) rmSync(file);
  return out(0, {
    result: "gaps", ...extra,
    readiness: readinessLines(r),
    open: r.gaps.length,
    ...(followup ? { followup: file, followup_text: followup } : { next: "Nothing is open. Run summary when you're ready to check it." }),
  });
}

async function summaryCommand(dir: string) {
  const s = asyncSession(dir);
  const fw = loadFramework(pluginRoot());
  let outcome;
  try {
    outcome = await runAsyncSummary({ provider: queueProvider(readCallQueues(dir)), fw, session: s, now: now() });
  } catch (err) {
    if (err instanceof NeedCall) return needsCall(dir, err, "summary");
    if (err instanceof AsyncError) return out(4, { result: "not_now", message: err.message });
    throw err;
  }
  writeSession(dir, outcome.session);
  if (existsSync(paths(dir).calls)) rmSync(paths(dir).calls, { recursive: true, force: true });
  return out(0, {
    result: "summary",
    summary: outcome.summary,
    confirm: outcome.confirm,
    readiness: readinessLines(findGaps(outcome.session, fw)),
    next: outcome.confirm.length
      ? "Check the summary. Correct anything with correct, then sign off with signoff, adding --confirm <key> for each Don't-build reason you agree with."
      : "Check the summary. Correct anything with correct, then sign off with signoff.",
    events: outcome.events,
  });
}

function correctCommand(dir: string, o: { item?: string; area?: string; term?: string; text?: string; by?: string }) {
  const s = asyncSession(dir);
  try {
    const next = correct(s, loadFramework(pluginRoot()), { item: o.item, area: o.area, term: o.term, text: o.text ?? "", by: o.by ?? "the interviewer", now: now() });
    writeSession(dir, next);
    return out(0, { result: "corrected", next: "Run summary to see the summary written up again." });
  } catch (err) {
    if (err instanceof AsyncError) return out(4, { result: "bad_correction", message: err.message });
    throw err;
  }
}

function signoffCommand(dir: string, o: { confirm: string[]; by?: string }) {
  const s = asyncSession(dir);
  try {
    const next = signOff(s, loadFramework(pluginRoot()), { confirm: o.confirm, by: o.by ?? "the interviewer" });
    writeSession(dir, next);
    return out(0, { result: "signed_off", gates: next.items.map((i) => ({ item: i.id, title: i.title, decision: i.gate?.decision, reasons: i.gate?.reasons, revisit_trigger: i.gate?.revisit_trigger })), next: "Run render to write the spec pack." });
  } catch (err) {
    if (err instanceof AsyncError) return out(4, { result: "not_now", message: err.message });
    throw err;
  }
}

function queuesUsed(dir: string, call: string): number {
  const file = join(dir, `${call}.json`);
  if (!existsSync(file)) return 0;
  try { const d = JSON.parse(readFileSync(file, "utf8")); return Array.isArray(d) ? d.length : 1; } catch { return 0; }
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: "string" },
      turn: { type: "string" },
      message: { type: "string" },
      mode: { type: "string", default: "stakeholder" },
      provider: { type: "string", default: "claude" },
      grounding: { type: "string", default: "transcript" },
      new: { type: "boolean", default: false },
      resume: { type: "boolean", default: false },
      overwrite: { type: "string", multiple: true, default: [] },
      keep: { type: "string", multiple: true, default: [] },
      request: { type: "string" },
      type: { type: "string" },
      modifier: { type: "string", multiple: true, default: [] },
      from: { type: "string" },
      title: { type: "string" },
      format: { type: "string", default: "email" },
      file: { type: "string" },
      kind: { type: "string" },
      item: { type: "string" },
      area: { type: "string" },
      term: { type: "string" },
      text: { type: "string" },
      by: { type: "string" },
      confirm: { type: "string", multiple: true, default: [] },
    },
  });
  const dir = values.dir ?? process.cwd();
  const [command] = positionals;

  const choice = (name: string, value: string, allowed: string[]) => {
    if (!allowed.includes(value)) out(4, { result: "bad_option", message: `--${name} must be one of ${allowed.join(", ")}` });
  };

  switch (command) {
    case "start":
      choice("mode", values.mode!, ["stakeholder", "builder"]);
      choice("provider", values.provider!, ["claude", "codex"]);
      choice("grounding", values.grounding!, ["transcript", "unverified"]);
      if (values.new && values.resume) out(4, { result: "bad_option", message: "use --new or --resume, not both" });
      return start(dir, { mode: values.mode!, provider: values.provider!, grounding: values.grounding!, new: values.new!, resume: values.resume! });
    case "turn":
      return await turnCommand(dir, values.message);
    case "render":
      return renderCommand(dir, values.overwrite as string[], values.keep as string[]);
    case "status": {
      const session = readSession(dir);
      if (!session) return out(4, { result: "no_session", message: "No intake in progress. Run start first." });
      return out(0, { result: "status", session_id: session.session.id, status: statusOf(session, loadFramework(pluginRoot()), readTranscript(dir) ?? []) });
    }
    case "guide":
      process.stdout.write(guide(loadFramework(pluginRoot())));
      return;
    case "triage":
      choice("provider", values.provider!, ["claude", "codex"]);
      return triage(dir, { request: values.request, type: values.type, modifiers: values.modifier as string[], from: values.from, title: values.title, new: values.new!, provider: values.provider! });
    case "packet":
      choice("format", values.format!, ["email", "agenda"]);
      return packetCommand(dir, values.format!);
    case "ingest":
      return await ingestCommand(dir, { file: values.file, kind: values.kind, from: values.from });
    case "gaps":
      return gapsOut(dir, asyncSession(dir));
    case "summary":
      return await summaryCommand(dir);
    case "correct":
      return correctCommand(dir, { item: values.item, area: values.area, term: values.term, text: values.text, by: values.by });
    case "signoff":
      return signoffCommand(dir, { confirm: values.confirm as string[], by: values.by });
    default:
      return out(4, { result: "bad_command", message: "usage: intake.mjs start | turn [--message text] | render | status | guide | triage | packet | ingest | gaps | summary | correct | signoff  (see the header of src/cli/intake.ts)" });
  }
}

main().catch((err) => {
  process.stderr.write(`intake-kit: ${(err as Error).message}\n`);
  process.exit(1);
});

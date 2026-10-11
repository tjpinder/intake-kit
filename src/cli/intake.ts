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
// Options: --dir <repo> (default: current directory). Output is one JSON object on stdout.
// Exit codes: 0 done, 2 turn rejected (retry once), 3 rejected again (don't retry),
// 4 needs a decision from the user, 5 rendered but some files need the user's OK to overwrite,
// 1 unexpected error.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { loadFramework } from "../lib/framework.ts";
import { applyTurn } from "../lib/apply-turn.ts";
import { guide, statusOf } from "../lib/guide.ts";
import { renderAll } from "../lib/render.ts";
import { lineDiff } from "../lib/diff.ts";
import { readConfig } from "../lib/checks.ts";
import {
  archive, archiveText, ensureStateDir, paths, pluginRoot, readRunState, readSession, readTranscript,
  writeRunState, writeSession, writeTranscript,
} from "../lib/state.ts";
import type { Session } from "../lib/session.ts";

const out = (exitCode: number, body: Record<string, unknown>): never => {
  process.stdout.write(JSON.stringify(body, null, 2) + "\n");
  process.exit(exitCode);
};

const now = () => new Date().toISOString();

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
      id: `${startedAt.slice(0, 10)}-${randomBytes(2).toString("hex")}`,
      started_at: startedAt,
      mode: opts.mode as Session["session"]["mode"],
      provider: opts.provider as Session["session"]["provider"],
      grounding: opts.grounding as Session["session"]["grounding"],
      reflect_back: null,
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

function applyTurnCommand(dir: string, turnFile: string) {
  const p = paths(dir);
  const session = readSession(dir);
  if (!session) return out(4, { result: "no_session", message: "No intake in progress. Run start first." });
  if (!existsSync(turnFile)) return out(4, { result: "no_turn", message: `Write the turn JSON to ${turnFile} first.` });

  let turn: unknown;
  try {
    turn = JSON.parse(readFileSync(turnFile, "utf8"));
  } catch (err) {
    turn = { __unparseable: (err as Error).message };
  }
  const transcript = session.session.grounding === "transcript" ? (readTranscript(dir) ?? []) : null;
  const fw = loadFramework(pluginRoot());
  const result = applyTurn(session, turn, { fw, transcript, now: now() });
  const state = readRunState(dir);

  if (!result.applied) {
    const attempt = state.consecutive_rejections + 1;
    writeFileSync(p.rejections, JSON.stringify({ at: now(), attempt, rejections: result.rejections }) + "\n", { flag: "a" });
    if (attempt === 1) {
      writeRunState(dir, { consecutive_rejections: 1 });
      return out(2, {
        result: "rejected",
        retry: true,
        message: "Nothing was saved. Fix these and write the whole turn again, then rerun apply-turn. Don't show the reply to the user yet.",
        rejections: result.rejections,
      });
    }
    writeRunState(dir, { consecutive_rejections: 0 });
    return out(3, {
      result: "rejected",
      retry: false,
      message: "Rejected twice in a row, so nothing from this turn was saved. Say your reply to the user and carry on; capture these answers again on a later turn.",
      rejections: result.rejections,
    });
  }

  writeSession(dir, result.session);
  writeRunState(dir, { consecutive_rejections: 0 });
  if (result.confirmed && existsSync(p.marker)) rmSync(p.marker); // interview over: stop recording prompts
  return out(0, {
    result: "applied",
    scored: result.confirmed,
    ...(result.confirmed
      ? { gates: result.session.items.map((i) => ({ item: i.id, title: i.title, decision: i.gate?.decision, reasons: i.gate?.reasons, revisit_trigger: i.gate?.revisit_trigger })) }
      : { status: statusOf(result.session, fw) }),
  });
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
  const rendered = renderAll(session, loadFramework(root), join(root, "templates"), checks);
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

function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: "string" },
      turn: { type: "string" },
      mode: { type: "string", default: "stakeholder" },
      provider: { type: "string", default: "claude" },
      grounding: { type: "string", default: "transcript" },
      new: { type: "boolean", default: false },
      resume: { type: "boolean", default: false },
      overwrite: { type: "string", multiple: true, default: [] },
      keep: { type: "string", multiple: true, default: [] },
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
    case "apply-turn":
      return applyTurnCommand(dir, values.turn ?? paths(dir).turn);
    case "render":
      return renderCommand(dir, values.overwrite as string[], values.keep as string[]);
    case "status": {
      const session = readSession(dir);
      if (!session) return out(4, { result: "no_session", message: "No intake in progress. Run start first." });
      return out(0, { result: "status", session_id: session.session.id, status: statusOf(session, loadFramework(pluginRoot())) });
    }
    case "guide":
      process.stdout.write(guide(loadFramework(pluginRoot())));
      return;
    default:
      return out(4, { result: "bad_command", message: "usage: intake.mjs start | apply-turn | render | status | guide  (see the header of src/cli/intake.ts)" });
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`intake-kit: ${(err as Error).message}\n`);
  process.exit(1);
}

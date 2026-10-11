// `node check.mjs [command]` — intake-kit's guardrail checks. The same file runs from the plugin
// (dist/check.mjs), from a target repo's CI (.intake-kit/check.mjs, copied there by init) and
// from session hooks.
//
//   run [--report] [--json] [--ci]   run the checks (default command). --report writes
//                                    audits/intake-kit-audit.md; --ci reads the pull request
//                                    from GitHub Actions and runs the evals
//   init [--flag <glob>]... [--eval-command <cmd>] [--label <name>] [--overwrite-workflow]
//                                    write .intake-kit/checks.json, copy this script into the
//                                    repo and add the CI workflow
//   hook                             SessionStart / SessionEnd / PostToolUse hook (stdin payload)
//
// Options: --dir <repo> (default: current directory).
// Exit codes for run: 0 nothing failed, 1 a check failed or errored. init: 0, or 4 when the
// workflow exists and would change, or the intake isn't finished. hook: always 0 unless it crashes.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parse as parseYaml } from "yaml";
import {
  blocks, CHECK_IDS, DEFAULT_CONFIG, formatReport, formatText, matchesAny, readConfig, runChecks,
  type CheckResult, type ChecksConfig, type PullRequestContext,
} from "../lib/checks.ts";
import { STATE_GITIGNORE } from "../lib/state.ts";
import type { Session } from "../lib/session.ts";

declare const __INTAKE_KIT_VERSION__: string | undefined;
const VERSION = typeof __INTAKE_KIT_VERSION__ === "string" ? __INTAKE_KIT_VERSION__ : "dev";

const WORKFLOW = `# Added by intake-kit /guardrails. Runs the guardrail checks from .intake-kit/check.mjs on
# every pull request and blocks the merge when one fails. Configure in .intake-kit/checks.json.
name: intake-kit guardrails

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  guardrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: intake-kit checks
        run: node .intake-kit/check.mjs run --ci --report
`;

function pullRequestFromActions(dir: string): PullRequestContext | null {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return null;
  const event = JSON.parse(readFileSync(eventPath, "utf8")) as {
    pull_request?: { labels?: Array<{ name: string }>; base?: { sha?: string }; head?: { sha?: string } };
  };
  const pr = event.pull_request;
  if (!pr) return null;
  const labels = (pr.labels ?? []).map((l) => l.name);
  const r = spawnSync("git", ["diff", "--name-only", `${pr.base?.sha}...${pr.head?.sha}`], { cwd: dir, encoding: "utf8" });
  if (r.status !== 0) return { labels, changedFiles: [], error: (r.stderr || r.error?.message || "git diff failed").trim() };
  return { labels, changedFiles: r.stdout.split("\n").map((l) => l.trim()).filter(Boolean) };
}

function run(dir: string, opts: { report: boolean; json: boolean; ci: boolean }) {
  const pullRequest = opts.ci ? pullRequestFromActions(dir) : null;
  const { results } = runChecks(dir, { runEvals: true, pullRequest });
  if (opts.report) {
    mkdirSync(join(dir, "audits"), { recursive: true });
    const context = opts.ci ? (pullRequest ? "CI, pull request" : "CI") : "local";
    writeFileSync(join(dir, "audits", "intake-kit-audit.md"), formatReport(results, { date: new Date().toISOString().slice(0, 10), version: VERSION, context }));
  }
  process.stdout.write(opts.json ? JSON.stringify({ results, blocks: blocks(results) }, null, 2) + "\n" : formatText(results) + "\n");
  process.exit(blocks(results) ? 1 : 0);
}

function init(dir: string, opts: { flags: string[]; evalCommand: string | null; label: string | null; overwriteWorkflow: boolean }) {
  const sessionFile = join(dir, "intake-answers.yaml");
  const session = existsSync(sessionFile) ? (parseYaml(readFileSync(sessionFile, "utf8")) as Session) : null;
  if (!session?.session?.reflect_back?.confirmed) {
    return done(4, { result: "not_ready", message: "Run the intake first: guardrails are generated from a finished intake." });
  }
  const bad = opts.flags.filter((g) => isAbsolute(g) || g.includes(".."));
  if (bad.length) return done(4, { result: "bad_option", message: `Flagged paths must be repo-relative globs: ${bad.join(", ")}` });

  const stateDir = join(dir, ".intake-kit");
  mkdirSync(stateDir, { recursive: true });
  const previous = existsSync(join(stateDir, "checks.json")) ? readConfig(dir).config : DEFAULT_CONFIG;
  const config: ChecksConfig = {
    version: 1,
    enabled: previous.enabled,
    flagged_paths: [...new Set(opts.flags.map((g) => g.replace(/\\/g, "/")))],
    review_label: opts.label ?? previous.review_label,
    eval_command: opts.evalCommand ?? previous.eval_command,
    evals_dir: previous.evals_dir,
  };
  writeFileSync(join(stateDir, "checks.json"), JSON.stringify(config, null, 2) + "\n");

  // Keep check.mjs and checks.json committable; refresh the .gitignore only if it's ours.
  const gitignore = join(stateDir, ".gitignore");
  if (!existsSync(gitignore) || readFileSync(gitignore, "utf8").startsWith("# Local intake-kit state.")) writeFileSync(gitignore, STATE_GITIGNORE);

  const self = fileURLToPath(import.meta.url);
  const vendored = join(stateDir, "check.mjs");
  const copied = self.endsWith(".mjs") && self !== vendored;
  if (copied) copyFileSync(self, vendored);

  const workflowFile = join(dir, ".github", "workflows", "intake-kit.yml");
  let workflow: "written" | "unchanged" | "overwritten" | "needs_confirmation" = "written";
  if (existsSync(workflowFile)) {
    const current = readFileSync(workflowFile, "utf8").replace(/\r\n/g, "\n");
    workflow = current === WORKFLOW ? "unchanged" : opts.overwriteWorkflow ? "overwritten" : "needs_confirmation";
  }
  if (workflow === "written" || workflow === "overwritten") {
    mkdirSync(dirname(workflowFile), { recursive: true });
    writeFileSync(workflowFile, WORKFLOW);
  }

  const files = [".intake-kit/checks.json", ...(copied ? [".intake-kit/check.mjs"] : []), ".github/workflows/intake-kit.yml"];
  return done(workflow === "needs_confirmation" ? 4 : 0, {
    result: workflow === "needs_confirmation" ? "needs_confirmation" : "initialized",
    config,
    workflow,
    commit: files,
    ...(workflow === "needs_confirmation"
      ? { message: ".github/workflows/intake-kit.yml already exists and differs. Show the user, and rerun with --overwrite-workflow only if they agree." }
      : {}),
  });
}

interface HookPayload {
  hook_event_name?: string;
  cwd?: string;
  tool_input?: { file_path?: string };
}

function hook() {
  const payload = JSON.parse(readFileSync(0, "utf8")) as HookPayload;
  const dir = payload.cwd || process.cwd();
  const stateDir = join(dir, ".intake-kit");
  const lastAudit = join(stateDir, "last-audit.json");

  switch (payload.hook_event_name) {
    case "SessionEnd": {
      if (!existsSync(join(dir, "intake-answers.yaml")) || !existsSync(stateDir)) return;
      const { results } = runChecks(dir, { runEvals: false, pullRequest: null });
      writeFileSync(lastAudit, JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + "\n");
      return;
    }
    case "SessionStart": {
      if (!existsSync(lastAudit)) return;
      const { results } = JSON.parse(readFileSync(lastAudit, "utf8")) as { results: CheckResult[] };
      const failing = results.filter((r) => r.status === "fail" || r.status === "error");
      if (!failing.length) return;
      const message = `intake-kit: ${failing.length} guardrail check${failing.length === 1 ? "" : "s"} failed at the end of the last session: ${failing.map((r) => `${r.id} (${r.summary})`).join("; ")}. Run /intake-kit:audit for details.`;
      process.stdout.write(JSON.stringify({ systemMessage: message, hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: message } }) + "\n");
      return;
    }
    case "PostToolUse": {
      const file = payload.tool_input?.file_path;
      if (!file || !existsSync(join(stateDir, "checks.json"))) return;
      const { config } = readConfig(dir);
      const rel = isAbsolute(file) ? relative(dir, file) : file;
      if (rel.startsWith("..") || !matchesAny(rel, config.flagged_paths)) return;
      const message = `intake-kit: ${rel.replace(/\\/g, "/")} is a flagged path. The pull request will need the "${config.review_label}" label and a human review before it can merge (see GUARDRAILS.md).`;
      process.stdout.write(JSON.stringify({ systemMessage: message, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message } }) + "\n");
      return;
    }
  }
}

function done(code: number, body: Record<string, unknown>): never {
  process.stdout.write(JSON.stringify(body, null, 2) + "\n");
  process.exit(code);
}

function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: "string" },
      report: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      ci: { type: "boolean", default: false },
      flag: { type: "string", multiple: true, default: [] },
      "eval-command": { type: "string" },
      label: { type: "string" },
      "overwrite-workflow": { type: "boolean", default: false },
    },
  });
  const dir = values.dir ?? process.cwd();
  const [command = "run"] = positionals;
  switch (command) {
    case "run":
      return run(dir, { report: values.report!, json: values.json!, ci: values.ci! });
    case "init":
      return init(dir, { flags: values.flag as string[], evalCommand: values["eval-command"] ?? null, label: values.label ?? null, overwriteWorkflow: values["overwrite-workflow"]! });
    case "hook":
      return hook();
    default:
      return done(4, { result: "bad_command", message: `usage: ${basename(process.argv[1] ?? "check.mjs")} run | init | hook  (checks: ${CHECK_IDS.join(", ")})` });
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`intake-kit check: ${(err as Error).message}\n`);
  process.exit(1);
}

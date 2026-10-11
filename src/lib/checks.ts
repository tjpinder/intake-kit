// The kit's guardrail checks. They read only what's in the target repo (intake-answers.yaml,
// the rendered files and .intake-kit/checks.json), never the plugin's framework files, so the
// same code runs from the plugin, from a session hook and from CI.
//
// Each check reports pass, fail, skipped (didn't apply or couldn't run here, with the reason),
// error (something broke) or off (disabled in checks.json). Nothing is reported as a pass
// unless it actually ran and passed.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { CoverageEntry, Item, Session } from "./session.ts";
import { CHECK_IDS, CHECK_LABELS, DEFAULT_CONFIG, type CheckId, type CheckStatus, type ChecksConfig } from "./check-meta.ts";

export { CHECK_IDS, CHECK_LABELS, DEFAULT_CONFIG, type CheckId, type CheckStatus, type ChecksConfig };

export interface CheckResult {
  id: CheckId;
  status: CheckStatus;
  summary: string;
  details: string[];
}

export interface PullRequestContext {
  labels: string[];
  changedFiles: string[];
  /** Set when the changed files couldn't be listed; the check then reports an error. */
  error?: string;
}

export interface RunOptions {
  /** Run the eval command. Off for session hooks; on for /audit and CI. */
  runEvals: boolean;
  /** Set in CI on a pull request; null everywhere else. */
  pullRequest: PullRequestContext | null;
}

const pass = (id: CheckId, summary: string, details: string[] = []): CheckResult => ({ id, status: "pass", summary, details });
const fail = (id: CheckId, summary: string, details: string[] = []): CheckResult => ({ id, status: "fail", summary, details });
const skip = (id: CheckId, summary: string): CheckResult => ({ id, status: "skipped", summary, details: [] });

export function readConfig(dir: string): { config: ChecksConfig; found: boolean } {
  const file = join(dir, ".intake-kit", "checks.json");
  if (!existsSync(file)) return { config: DEFAULT_CONFIG, found: false };
  const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<ChecksConfig>;
  const config = { ...DEFAULT_CONFIG, ...raw };
  const unknown = config.enabled.filter((c) => !CHECK_IDS.includes(c));
  if (unknown.length) throw new Error(`.intake-kit/checks.json enables unknown checks: ${unknown.join(", ")}`);
  if (!Array.isArray(config.flagged_paths) || !config.flagged_paths.every((p) => typeof p === "string")) {
    throw new Error(".intake-kit/checks.json: flagged_paths must be a list of glob strings");
  }
  return { config, found: true };
}

/** Minimal glob: `**` spans directories, `*` and `?` stay within one. Paths use forward slashes. */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      re += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

export function matchesAny(path: string, globs: string[]): boolean {
  const p = path.replace(/\\/g, "/").replace(/^\.\//, "");
  return globs.some((g) => globToRegExp(g).test(p));
}

/** Lines under a `## heading` in a markdown file, up to the next `## `. */
export function section(markdown: string, heading: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return [];
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

const readIf = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : null);

function goItems(session: Session): Item[] {
  return session.items.filter((i) => i.gate?.decision === "go");
}

/** Every recorded coverage entry by ID: shared core, item overrides and item areas. */
function entriesById(session: Session): Map<string, CoverageEntry[]> {
  const map = new Map<string, CoverageEntry[]>();
  const add = (id: string, e: CoverageEntry) => map.set(id, [...(map.get(id) ?? []), e]);
  for (const [k, e] of Object.entries(session.core)) add(`core.${k}`, e);
  for (const item of session.items) {
    for (const [k, e] of Object.entries(item.core_overrides)) add(`core.${k}`, e);
    for (const [id, e] of Object.entries(item.coverage)) add(id, e);
  }
  return map;
}

const CITE = /\[([a-z0-9_.]+)\] "(.*?)"(?= · \[|$)/g;

function traceability(dir: string, session: Session): CheckResult {
  const id = "traceability";
  if (goItems(session).length === 0) return skip(id, "No item reached Go, so there's no SPEC or ACCEPTANCE to trace.");
  const entries = entriesById(session);
  const problems: string[] = [];
  let cited = 0;
  for (const file of ["SPEC.md", "ACCEPTANCE.md"]) {
    const text = readIf(join(dir, file));
    if (text == null) { problems.push(`${file} is missing; run the render step of the intake.`); continue; }
    let heading = "";
    text.split(/\r?\n/).forEach((line, n) => {
      if (line.startsWith("## ")) heading = line.slice(3).trim();
      if (!line.startsWith("- ")) return;
      const where = `${file}:${n + 1}`;
      if (heading === "Open questions") {
        const area = line.match(/\[([a-z0-9_.]+)\]$/)?.[1];
        if (!area) problems.push(`${where}: open question doesn't name its area`);
        else if (!entries.has(area) && !/^[a-z_]+\.[a-z0-9_]+(\.[a-z0-9_]+)?$/.test(area)) problems.push(`${where}: unknown area ${area}`);
        return;
      }
      const cites = [...line.matchAll(CITE)];
      if (cites.length === 0) { problems.push(`${where}: requirement doesn't cite an answer: ${line.slice(0, 80)}`); return; }
      for (const [, area, quote] of cites) {
        const found = entries.get(area);
        if (!found) problems.push(`${where}: cites ${area}, which isn't in intake-answers.yaml`);
        else if (found.every((e) => e.status === "unknown")) problems.push(`${where}: cites ${area}, which is still unknown`);
        else if (!found.some((e) => e.quotes.includes(quote))) problems.push(`${where}: "${quote}" isn't a recorded quote for ${area}`);
        else cited++;
      }
    });
  }
  return problems.length
    ? fail(id, `${problems.length} requirement line${problems.length === 1 ? "" : "s"} can't be traced to the user's words.`, problems)
    : pass(id, `${cited} citation${cited === 1 ? "" : "s"} checked against intake-answers.yaml.`);
}

function evalGate(dir: string, session: Session, config: ChecksConfig, opts: RunOptions): CheckResult {
  const id = "eval_gate";
  const ai = goItems(session).filter((i) => i.scoring?.ai_overlay.applies);
  if (ai.length === 0) return skip(id, "No Go item uses an LLM, so no eval set is required.");
  const names = ai.map((i) => i.id).join(", ");
  const evalsDir = join(dir, config.evals_dir);
  const files = existsSync(evalsDir) ? readdirSync(evalsDir).filter((f) => !f.startsWith(".")) : [];
  if (files.length === 0) return fail(id, `${names} use${ai.length === 1 ? "s" : ""} an LLM but ${config.evals_dir}/ has no eval set.`);
  if (!config.eval_command) return fail(id, `${config.evals_dir}/ exists but checks.json has no eval_command, so the evals can't be run.`);
  if (!opts.runEvals) return skip(id, "Evals aren't run from session hooks; they run in /audit and CI.");
  const r = spawnSync(config.eval_command, { cwd: dir, shell: true, encoding: "utf8", timeout: 10 * 60 * 1000 });
  if (r.error) return { id, status: "error", summary: `Couldn't run the eval command: ${r.error.message}`, details: [] };
  const tail = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split(/\r?\n/).slice(-15);
  return r.status === 0 ? pass(id, `\`${config.eval_command}\` passed.`, tail) : fail(id, `\`${config.eval_command}\` exited ${r.status}.`, tail);
}

function killCriteria(dir: string, session: Session): CheckResult {
  const id = "kill_criteria";
  if (goItems(session).length === 0) return skip(id, "No item reached Go, so there's nothing to guard yet.");
  const text = readIf(join(dir, "GUARDRAILS.md"));
  if (text == null) return fail(id, "GUARDRAILS.md is missing; run the render step of the intake.");
  const missing = [["Kill criteria", "kill criteria"], ["Manual fallback", "a manual fallback"]]
    .filter(([heading]) => !section(text, heading).some((l) => l.startsWith("- ")))
    .map(([, what]) => what);
  return missing.length
    ? fail(id, `GUARDRAILS.md has no ${missing.join(" and no ")}. Ask the owner what would make them switch it off, and what they'd do if it stopped working.`)
    : pass(id, "GUARDRAILS.md has kill criteria and a manual fallback.");
}

function flaggedPaths(config: ChecksConfig, opts: RunOptions): CheckResult {
  const id = "flagged_paths";
  if (config.flagged_paths.length === 0) return skip(id, "No paths are flagged in .intake-kit/checks.json.");
  if (!opts.pullRequest) return skip(id, "Not running on a pull request.");
  if (opts.pullRequest.error) return { id, status: "error", summary: `Couldn't list the files this pull request changes: ${opts.pullRequest.error}`, details: [] };
  const touched = opts.pullRequest.changedFiles.filter((f) => matchesAny(f, config.flagged_paths));
  if (touched.length === 0) return pass(id, "No flagged paths changed in this pull request.");
  if (opts.pullRequest.labels.includes(config.review_label)) return pass(id, `Flagged paths changed and the PR has the ${config.review_label} label.`, touched);
  return fail(id, `This pull request changes flagged paths without the ${config.review_label} label.`, touched);
}

function openAssumptions(dir: string, session: Session): CheckResult {
  const id = "open_assumptions";
  const assumed = new Set<string>();
  for (const [k, e] of Object.entries(session.core)) if (e.status === "assumed") assumed.add(`core.${k}`);
  for (const item of session.items) {
    for (const [k, e] of Object.entries(item.core_overrides)) if (e.status === "assumed") assumed.add(`core.${k}`);
    for (const [area, e] of Object.entries(item.coverage)) if (e.status === "assumed") assumed.add(area);
  }
  if (assumed.size === 0) return pass(id, "No answers were recorded as assumptions.");
  const text = readIf(join(dir, "DECISIONS.md"));
  if (text == null) return fail(id, "DECISIONS.md is missing; run the render step of the intake.");
  const lines = section(text, "Assumptions").filter((l) => l.startsWith("- "));
  const problems: string[] = [];
  for (const area of [...assumed].sort()) {
    const line = lines.find((l) => l.startsWith(`- **${area}**`));
    const owner = line?.match(/Owner:\s*(.+)$/)?.[1].trim();
    if (!line) problems.push(`${area} isn't listed under Assumptions`);
    else if (!owner || /^_?unassigned_?$/i.test(owner)) problems.push(`${area} has no owner`);
  }
  return problems.length
    ? fail(id, `${problems.length} assumption${problems.length === 1 ? "" : "s"} without an owner. Edit the Owner: field in DECISIONS.md.`, problems)
    : pass(id, `${assumed.size} assumption${assumed.size === 1 ? "" : "s"}, each with an owner.`);
}

export function runChecks(dir: string, opts: RunOptions): { results: CheckResult[]; configFound: boolean } {
  const sessionText = readIf(join(dir, "intake-answers.yaml"));
  let config: ChecksConfig;
  let configFound: boolean;
  try {
    ({ config, found: configFound } = readConfig(dir));
  } catch (err) {
    return { results: CHECK_IDS.map((id) => ({ id, status: "error" as const, summary: (err as Error).message, details: [] })), configFound: true };
  }
  if (sessionText == null) {
    return { results: CHECK_IDS.map((id) => skip(id, "No intake-answers.yaml in this repo; run the intake first.")), configFound };
  }
  const session = parseYaml(sessionText) as Session;
  if (!session.session?.reflect_back?.confirmed) {
    return { results: CHECK_IDS.map((id) => skip(id, "The intake isn't finished: the reflect-back hasn't been confirmed.")), configFound };
  }

  const run: Record<CheckId, () => CheckResult> = {
    traceability: () => traceability(dir, session),
    eval_gate: () => evalGate(dir, session, config, opts),
    kill_criteria: () => killCriteria(dir, session),
    flagged_paths: () => flaggedPaths(config, opts),
    open_assumptions: () => openAssumptions(dir, session),
  };
  const results = CHECK_IDS.map((id): CheckResult => {
    if (!config.enabled.includes(id)) return { id, status: "off", summary: "Disabled in .intake-kit/checks.json.", details: [] };
    try {
      return run[id]();
    } catch (err) {
      return { id, status: "error", summary: `The check itself failed: ${(err as Error).message}`, details: [] };
    }
  });
  return { results, configFound };
}

/** A failure or an error blocks; skipped and off don't, but are always reported as such. */
export function blocks(results: CheckResult[]): boolean {
  return results.some((r) => r.status === "fail" || r.status === "error");
}

const ICON: Record<CheckStatus, string> = { pass: "pass", fail: "FAIL", skipped: "skipped", error: "ERROR", off: "off" };

export function formatText(results: CheckResult[]): string {
  const lines = results.map((r) => `${ICON[r.status].padEnd(8)} ${r.id}: ${r.summary}${r.details.length ? "\n" + r.details.map((d) => `           ${d}`).join("\n") : ""}`);
  const count = (s: CheckStatus) => results.filter((r) => r.status === s).length;
  lines.push("", `${count("pass")} passed, ${count("fail")} failed, ${count("error")} errored, ${count("skipped")} skipped, ${count("off")} off.`);
  return lines.join("\n");
}

export function formatReport(results: CheckResult[], meta: { date: string; version: string; context: string }): string {
  const count = (s: CheckStatus) => results.filter((r) => r.status === s).length;
  const out = [
    "# intake-kit audit",
    "",
    `Run ${meta.date} by intake-kit ${meta.version} (${meta.context}). Skipped checks didn't run here and aren't passes.`,
    "",
    "| Check | Result | Summary |",
    "| --- | --- | --- |",
    ...results.map((r) => `| ${r.id} | ${ICON[r.status]} | ${r.summary.replace(/\|/g, "\\|")} |`),
    "",
    `**${count("pass")} passed, ${count("fail")} failed, ${count("error")} errored, ${count("skipped")} skipped, ${count("off")} off.**`,
  ];
  for (const r of results.filter((r) => r.details.length)) {
    out.push("", `## ${r.id}`, "", ...r.details.map((d) => `- ${d}`));
  }
  out.push("", "## What each check covers", "", ...CHECK_IDS.map((id) => `- **${id}**: ${CHECK_LABELS[id]}`));
  return out.join("\n") + "\n";
}

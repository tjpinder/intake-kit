import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadFramework } from "../src/lib/framework.ts";
import { renderAll } from "../src/lib/render.ts";
import { scoreAndGate } from "../src/lib/gates.ts";
import { writeSession } from "../src/lib/state.ts";
import { blocks, globToRegExp, matchesAny, runChecks, section, type CheckResult, type RunOptions } from "../src/lib/checks.ts";
import type { Session } from "../src/lib/session.ts";
import { makeItem, makeSession } from "./helpers.ts";

const fw = loadFramework(".");
const CHECK = resolve("dist/check.mjs");
const INTAKE = resolve("dist/intake.mjs");
const dirs: string[] = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const LOCAL: RunOptions = { runEvals: true, pullRequest: null };
const fixture = (): Session => parseYaml(readFileSync("tests/fixtures/session/pick-exception-scored.yaml", "utf8"));

/** A temp repo holding a session and its rendered files. */
function repo(session: Session = fixture()): string {
  const dir = mkdtempSync(join(tmpdir(), "intake-kit-checks-"));
  dirs.push(dir);
  writeSession(dir, session);
  if (session.session.reflect_back?.confirmed) {
    for (const [file, text] of renderAll(session, fw, "templates")) writeFileSync(join(dir, file), text);
  }
  return dir;
}

const result = (results: CheckResult[], id: string) => results.find((r) => r.id === id)!;
const edit = (dir: string, file: string, from: string | RegExp, to: string) => {
  const path = join(dir, file);
  const text = readFileSync(path, "utf8");
  assert.ok(typeof from === "string" ? text.includes(from) : from.test(text), `test setup: ${from} not in ${file}`);
  writeFileSync(path, text.replace(from, to));
};
const ownAssumptions = (dir: string) => edit(dir, "DECISIONS.md", "Owner: _unassigned_", "Owner: Dana (ops supervisor)");
const config = (dir: string, c: object) => {
  mkdirSync(join(dir, ".intake-kit"), { recursive: true });
  writeFileSync(join(dir, ".intake-kit", "checks.json"), JSON.stringify({ version: 1, ...c }));
};

describe("the worked example, as rendered", () => {
  test("fails only open_assumptions until core.trust has an owner", () => {
    const dir = repo();
    const { results } = runChecks(dir, LOCAL);
    assert.deepEqual(results.map((r) => [r.id, r.status]), [
      ["traceability", "pass"], ["eval_gate", "skipped"], ["kill_criteria", "pass"], ["flagged_paths", "skipped"], ["open_assumptions", "fail"],
    ]);
    assert.deepEqual(result(results, "open_assumptions").details, ["core.trust has no owner"]);
    assert.equal(blocks(results), true);
    ownAssumptions(dir);
    assert.equal(blocks(runChecks(dir, LOCAL).results), false);
  });
});

describe("traceability", () => {
  test("a requirement with its citation removed fails", () => {
    const dir = repo();
    edit(dir, "SPEC.md", / \[core\.users\] "[^"]+"/, "");
    const r = result(runChecks(dir, LOCAL).results, "traceability");
    assert.equal(r.status, "fail");
    assert.match(r.details[0], /^SPEC\.md:\d+: requirement doesn't cite an answer/);
  });

  test("a quote the user never said fails", () => {
    const dir = repo();
    edit(dir, "ACCEPTANCE.md", '"filter by shift and count by picker"', '"filter by anything you like"');
    assert.match(result(runChecks(dir, LOCAL).results, "traceability").details[0], /isn't a recorded quote for data_report\.grain/);
  });

  test("citing an area that's still unknown fails", () => {
    const dir = repo();
    edit(dir, "SPEC.md", "[core.users]", "[data_report.truth]");
    assert.match(result(runChecks(dir, LOCAL).results, "traceability").details.join("\n"), /data_report\.truth, which is still unknown/);
  });

  test("a missing SPEC fails; no Go item skips", () => {
    const dir = repo();
    rmSync(join(dir, "SPEC.md"));
    assert.equal(result(runChecks(dir, LOCAL).results, "traceability").status, "fail");
    const none = scoreAndGate(makeSession([makeItem("item-1", { facts: { existing_asset: "covers" } })]), fw).session;
    assert.equal(result(runChecks(repo(none), LOCAL).results, "traceability").status, "skipped");
  });
});

describe("kill criteria and fallback", () => {
  test("an empty Kill criteria section fails, naming what's missing", () => {
    const dir = repo();
    edit(dir, "GUARDRAILS.md", /## Kill criteria\n\n- [^\n]+/, "## Kill criteria\n\n_Nothing recorded._");
    const r = result(runChecks(dir, LOCAL).results, "kill_criteria");
    assert.equal(r.status, "fail");
    assert.match(r.summary, /no kill criteria\b/);
    assert.doesNotMatch(r.summary, /manual fallback/);
  });
});

describe("eval gate", () => {
  function aiRepo(): string {
    const facts = {
      rule_clarity: "judgment", input_structured: "under_40", ways_done: "8+", documentation: "none", steps_apps: "over_100", stability: "some",
      ai_applies: "yes", eval_ability: "pass", error_cost: "pass", human_review: "pass", simpler_option: "pass", fallback: "pass", sensitive_data: "pass",
    };
    const session = scoreAndGate(makeSession([makeItem("item-1", { facts })]), fw).session;
    assert.equal(session.items[0].gate?.decision, "go", "test setup: AI candidate should reach Go");
    return repo(session);
  }

  test("no eval set fails", () => {
    assert.match(result(runChecks(aiRepo(), LOCAL).results, "eval_gate").summary, /evals\/ has no eval set/);
  });

  test("an eval set with no command fails", () => {
    const dir = aiRepo();
    mkdirSync(join(dir, "evals"));
    writeFileSync(join(dir, "evals", "cases.jsonl"), "{}\n");
    assert.match(result(runChecks(dir, LOCAL).results, "eval_gate").summary, /no eval_command/);
  });

  test("the eval command's exit code decides; hooks don't run it", () => {
    const dir = aiRepo();
    mkdirSync(join(dir, "evals"));
    writeFileSync(join(dir, "evals", "cases.jsonl"), "{}\n");
    config(dir, { eval_command: `node -e "process.exit(0)"` });
    assert.equal(result(runChecks(dir, LOCAL).results, "eval_gate").status, "pass");
    config(dir, { eval_command: `node -e "console.log('2 of 10 wrong'); process.exit(1)"` });
    const failed = result(runChecks(dir, LOCAL).results, "eval_gate");
    assert.equal(failed.status, "fail");
    assert.deepEqual(failed.details, ["2 of 10 wrong"]);
    assert.equal(result(runChecks(dir, { runEvals: false, pullRequest: null }).results, "eval_gate").status, "skipped");
  });
});

describe("flagged paths", () => {
  const pr = (changedFiles: string[], labels: string[] = []): RunOptions => ({ runEvals: true, pullRequest: { changedFiles, labels } });
  function flagged(): string {
    const dir = repo();
    config(dir, { flagged_paths: ["src/pricing/**", "templates/*.html"] });
    return dir;
  }

  test("a PR touching a flagged path without the label fails, listing the files", () => {
    const r = result(runChecks(flagged(), pr(["src/pricing/rates.ts", "README.md"])).results, "flagged_paths");
    assert.equal(r.status, "fail");
    assert.deepEqual(r.details, ["src/pricing/rates.ts"]);
  });

  test("with the label it passes; untouched flagged paths pass", () => {
    assert.equal(result(runChecks(flagged(), pr(["src/pricing/rates.ts"], ["needs-review"])).results, "flagged_paths").status, "pass");
    assert.equal(result(runChecks(flagged(), pr(["docs/x.md"])).results, "flagged_paths").status, "pass");
  });

  test("skipped outside a PR or with nothing flagged; error when changes can't be listed", () => {
    assert.equal(result(runChecks(flagged(), LOCAL).results, "flagged_paths").summary, "Not running on a pull request.");
    assert.equal(result(runChecks(repo(), pr(["src/pricing/rates.ts"])).results, "flagged_paths").status, "skipped");
    const broken: RunOptions = { runEvals: true, pullRequest: { changedFiles: [], labels: [], error: "bad revision" } };
    assert.equal(result(runChecks(flagged(), broken).results, "flagged_paths").status, "error");
  });
});

describe("open assumptions", () => {
  test("an item-level assumption needs its own owner", () => {
    const item = makeItem("item-1", { coverage: { "data_report.grain": { status: "assumed", value: "Shift, probably", quotes: ["probably by shift"], probe_count: 1 } } });
    const dir = repo(scoreAndGate(makeSession([item]), fw).session);
    assert.deepEqual(result(runChecks(dir, LOCAL).results, "open_assumptions").details, ["data_report.grain has no owner"]);
  });

  test("no assumptions is a real pass", () => {
    assert.equal(result(runChecks(repo(scoreAndGate(makeSession([makeItem("item-1")]), fw).session), LOCAL).results, "open_assumptions").status, "pass");
  });
});

describe("config and state", () => {
  test("a check disabled in checks.json is reported off, never pass", () => {
    const dir = repo();
    config(dir, { enabled: ["traceability", "kill_criteria", "flagged_paths", "eval_gate"] });
    const r = result(runChecks(dir, LOCAL).results, "open_assumptions");
    assert.equal(r.status, "off");
    assert.equal(blocks(runChecks(dir, LOCAL).results), false);
  });

  test("an invalid checks.json errors every check, and errors block", () => {
    const dir = repo();
    config(dir, { enabled: ["traceability", "vibes"] });
    const { results } = runChecks(dir, LOCAL);
    assert.ok(results.every((r) => r.status === "error"));
    assert.equal(blocks(results), true);
  });

  test("no intake, or an unfinished one: everything skipped, nothing passes", () => {
    const empty = mkdtempSync(join(tmpdir(), "intake-kit-checks-"));
    dirs.push(empty);
    assert.ok(runChecks(empty, LOCAL).results.every((r) => r.status === "skipped"));
    assert.ok(runChecks(repo(makeSession([makeItem("item-1")], { confirmed: false })), LOCAL).results.every((r) => r.status === "skipped"));
  });
});

describe("globs and sections", () => {
  test("** spans folders, * and ? don't", () => {
    assert.ok(matchesAny("src/pricing/a/b.ts", ["src/pricing/**"]));
    assert.ok(matchesAny("src/pricing", ["src/pricing/**"]) === false);
    assert.ok(matchesAny("pricing.ts", ["**/pricing.ts"]));
    assert.ok(matchesAny("a/b/pricing.ts", ["**/pricing.ts"]));
    assert.ok(!matchesAny("templates/x/y.html", ["templates/*.html"]));
    assert.ok(matchesAny("templates\\y.html", ["templates/*.html"]), "Windows separators");
    assert.ok(globToRegExp("a?c").test("abc") && !globToRegExp("a?c").test("a/c"));
    assert.ok(!matchesAny("src/pricingX.ts", ["src/pricing.ts"]), "dots are literal");
  });

  test("section reads up to the next heading", () => {
    assert.deepEqual(section("## A\n- x\n## B\n- y", "A"), ["- x"]);
    assert.deepEqual(section("## A\n- x", "C"), []);
  });
});

describe("check CLI", () => {
  const cli = (dir: string, args: string[], env: Record<string, string> = {}, input?: string) =>
    spawnSync(process.execPath, [CHECK, ...args, "--dir", dir], { encoding: "utf8", env: { ...process.env, GITHUB_EVENT_PATH: "", ...env }, input });

  test("run exits 1 on a failure and 0 once fixed; --report writes the audit", () => {
    const dir = repo();
    const failed = cli(dir, ["run", "--report"]);
    assert.equal(failed.status, 1);
    assert.match(failed.stdout, /FAIL\s+open_assumptions/);
    const report = readFileSync(join(dir, "audits", "intake-kit-audit.md"), "utf8");
    assert.match(report, /\| open_assumptions \| FAIL \|/);
    assert.match(report, /\| flagged_paths \| skipped \| No paths are flagged in \.intake-kit\/checks\.json\. \|/);
    ownAssumptions(dir);
    assert.equal(cli(dir, ["run"]).status, 0);
  });

  test("--ci reads the pull request from GitHub Actions and git", () => {
    const dir = repo();
    ownAssumptions(dir);
    const git = (...args: string[]) => {
      const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" });
      assert.equal(r.status, 0, r.stderr);
      return r.stdout.trim();
    };
    git("init", "-q");
    git("add", "-A");
    git("commit", "-qm", "base");
    const base = git("rev-parse", "HEAD");
    mkdirSync(join(dir, "src", "pricing"), { recursive: true });
    writeFileSync(join(dir, "src", "pricing", "rates.ts"), "export const rate = 1;\n");
    git("add", "-A");
    git("commit", "-qm", "head");
    const head = git("rev-parse", "HEAD");
    config(dir, { flagged_paths: ["src/pricing/**"] });
    const event = (labels: string[]) => {
      const file = join(dir, "event.json");
      writeFileSync(file, JSON.stringify({ pull_request: { labels: labels.map((name) => ({ name })), base: { sha: base }, head: { sha: head } } }));
      return { GITHUB_EVENT_PATH: file };
    };
    const blocked = cli(dir, ["run", "--ci"], event([]));
    assert.equal(blocked.status, 1, blocked.stdout);
    assert.match(blocked.stdout, /FAIL\s+flagged_paths[\s\S]*src\/pricing\/rates\.ts/);
    assert.equal(cli(dir, ["run", "--ci"], event(["needs-review"])).status, 0);
  });

  test("init writes the config, a standalone copy of the checks and the workflow", () => {
    const dir = repo();
    const r = cli(dir, ["init", "--flag", "src/pricing/**", "--label", "pricing-review"]);
    assert.equal(r.status, 0, r.stdout);
    const body = JSON.parse(r.stdout);
    assert.deepEqual(body.commit, [".intake-kit/checks.json", ".intake-kit/check.mjs", ".github/workflows/intake-kit.yml"]);
    const cfg = JSON.parse(readFileSync(join(dir, ".intake-kit", "checks.json"), "utf8"));
    assert.deepEqual(cfg.flagged_paths, ["src/pricing/**"]);
    assert.equal(cfg.review_label, "pricing-review");
    assert.match(readFileSync(join(dir, ".github", "workflows", "intake-kit.yml"), "utf8"), /node \.intake-kit\/check\.mjs run --ci --report/);
    assert.match(readFileSync(join(dir, ".intake-kit", ".gitignore"), "utf8"), /^!check\.mjs$/m);

    // The vendored copy runs with nothing from the plugin: this is what CI executes.
    const vendored = spawnSync(process.execPath, [join(dir, ".intake-kit", "check.mjs"), "run", "--dir", dir], { encoding: "utf8", cwd: tmpdir() });
    assert.match(vendored.stdout, /open_assumptions/);
  });

  test("init won't replace a workflow that differs unless told to; refuses before the intake is done", () => {
    const dir = repo();
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(join(dir, ".github", "workflows", "intake-kit.yml"), "name: mine\n");
    const r = cli(dir, ["init"]);
    assert.equal(r.status, 4);
    assert.equal(readFileSync(join(dir, ".github", "workflows", "intake-kit.yml"), "utf8"), "name: mine\n");
    assert.equal(cli(dir, ["init", "--overwrite-workflow"]).status, 0);
    assert.equal(cli(repo(makeSession([makeItem("item-1")], { confirmed: false })), ["init"]).status, 4);
    assert.equal(cli(dir, ["init", "--flag", "../outside/**"]).status, 4);
  });

  test("hooks: session end records, session start reports failures, edits to flagged paths remind", () => {
    const dir = repo();
    cli(dir, ["init", "--flag", "src/pricing/**"]);
    const hook = (payload: object) => spawnSync(process.execPath, [CHECK, "hook"], { encoding: "utf8", input: JSON.stringify({ cwd: dir, ...payload }) });

    assert.equal(hook({ hook_event_name: "SessionEnd" }).status, 0);
    assert.ok(existsSync(join(dir, ".intake-kit", "last-audit.json")));
    const start = JSON.parse(hook({ hook_event_name: "SessionStart" }).stdout);
    assert.match(start.systemMessage, /1 guardrail check failed[\s\S]*open_assumptions/);
    assert.equal(start.hookSpecificOutput.hookEventName, "SessionStart");

    const edited = hook({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: join(dir, "src", "pricing", "rates.ts") } });
    assert.match(JSON.parse(edited.stdout).systemMessage, /src\/pricing\/rates\.ts is a flagged path/);
    assert.equal(hook({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: join(dir, "README.md") } }).stdout, "");

    ownAssumptions(dir);
    hook({ hook_event_name: "SessionEnd" });
    assert.equal(hook({ hook_event_name: "SessionStart" }).stdout, "", "nothing to report once checks pass");
  });

  test("hooks stay silent in repos without an intake", () => {
    const empty = mkdtempSync(join(tmpdir(), "intake-kit-checks-"));
    dirs.push(empty);
    for (const event of ["SessionEnd", "SessionStart", "PostToolUse"]) {
      const r = spawnSync(process.execPath, [CHECK, "hook"], { encoding: "utf8", input: JSON.stringify({ cwd: empty, hook_event_name: event, tool_input: { file_path: "x" } }) });
      assert.equal(r.status, 0);
      assert.equal(r.stdout, "");
    }
    assert.equal(existsSync(join(empty, ".intake-kit")), false);
  });
});

describe("render after /guardrails", () => {
  const render = (dir: string, ...args: string[]) => JSON.parse(spawnSync(process.execPath, [INTAKE, "render", "--dir", dir, ...args], { encoding: "utf8" }).stdout);

  test("an untouched GUARDRAILS.md is refreshed with the flagged paths; an edited one needs the user's OK", () => {
    const fresh = mkdtempSync(join(tmpdir(), "intake-kit-checks-"));
    dirs.push(fresh);
    writeSession(fresh, fixture());
    render(fresh);
    spawnSync(process.execPath, [CHECK, "init", "--flag", "src/pricing/**", "--dir", fresh]);
    const second = render(fresh);
    assert.equal(second.files.find((f: { file: string }) => f.file === "GUARDRAILS.md").status, "updated");
    const guardrails = readFileSync(join(fresh, "GUARDRAILS.md"), "utf8");
    assert.match(guardrails, /## Flagged paths\n\n- `src\/pricing\/\*\*`\n\nA pull request that changes any of these needs the `needs-review` label/);
    assert.match(guardrails, /## CI checks\n\n- \*\*traceability\*\*/);

    writeFileSync(join(fresh, "GUARDRAILS.md"), guardrails + "\nMy own note.\n");
    spawnSync(process.execPath, [CHECK, "init", "--flag", "src/billing/**", "--dir", fresh]);
    const third = render(fresh);
    assert.equal(third.files.find((f: { file: string }) => f.file === "GUARDRAILS.md").status, "needs_confirmation");
    assert.match(readFileSync(join(fresh, "GUARDRAILS.md"), "utf8"), /My own note\./);
  });
});

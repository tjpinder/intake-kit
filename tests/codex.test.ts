// The Codex packaging in .agents/: generated from the plugin, free of Claude-only syntax, and
// runnable on its own with nothing from the plugin around it. Not tested in Codex itself.

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
// @ts-expect-error: plain JS build script without type declarations
import { buildCodex, codexSkill } from "../scripts/build-codex.mjs";
import type { V2Step } from "./helpers.ts";

const dirs: string[] = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const temp = (prefix: string) => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
};

function tree(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.set(relative(root, path).replace(/\\/g, "/"), readFileSync(path, "utf8"));
    }
  };
  walk(root);
  return out;
}

describe(".agents/ is generated and current", () => {
  test("the committed copy matches a fresh build byte for byte", () => {
    const fresh = temp("intake-kit-codex-");
    buildCodex(".", fresh);
    const expected = tree(fresh);
    const actual = tree(".agents");
    assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort(), "run npm run build");
    for (const [file, text] of expected) assert.equal(actual.get(file), text, `${file} is stale; run npm run build`);
  });
});

describe("Codex skills", () => {
  for (const name of ["intake", "intake-guardrails", "intake-audit"]) {
    test(`${name}: only name and description in frontmatter, no Claude-only syntax`, () => {
      const text = readFileSync(join(".agents", "skills", name, "SKILL.md"), "utf8");
      const front = text.match(/^---\n([\s\S]*?)\n---\n/)![1];
      assert.deepEqual(Object.keys(parseYaml(front)), ["name", "description"]);
      assert.equal(parseYaml(front).name, name);
      assert.doesNotMatch(text, /CLAUDE_PLUGIN_ROOT|allowed-tools|^!`|\/intake-kit:/m);
      assert.match(text, /## Where the kit lives/);
      assert.match(text, /node "<KIT>\/dist\/doctor\.mjs"/);
    });
  }

  test("intake starts unverified and runs the guide itself", () => {
    const text = readFileSync(".agents/skills/intake/SKILL.md", "utf8");
    assert.match(text, /start --provider codex --grounding unverified/);
    assert.match(text, /## Preflight[\s\S]*guide` and read its output before your first question[\s\S]*## How every turn works/);
  });

  test("a skill edit that breaks a rewrite fails the build instead of shipping", () => {
    assert.throws(() => codexSkill("intake", "---\nname: intake\n---\n# Intake\n\nNo preflight here.\n", "d"), /expected 1/);
  });
});

describe("the standalone kit runs with nothing from the plugin", () => {
  test("a full intake, render and check from a copied .agents/ folder", () => {
    const repo = temp("intake-kit-codex-repo-");
    cpSync(".agents", join(repo, ".agents"), { recursive: true });
    const kit = join(repo, ".agents", "intake-kit", "dist");
    const node = (script: string, args: string[], input?: string) =>
      spawnSync(process.execPath, [join(kit, script), ...args, ...(script === "hook-prompt.mjs" ? [] : ["--dir", repo])], { encoding: "utf8", input, cwd: tmpdir() });

    assert.match(node("doctor.mjs", []).stdout, /^intake-kit \d+\.\d+\.\d+ ready/);
    assert.match(spawnSync(process.execPath, [join(kit, "intake.mjs"), "guide"], { encoding: "utf8" }).stdout, /## Entry types/);

    const convo = JSON.parse(readFileSync("tests/fixtures/conversations/pick-exception.json", "utf8"));
    assert.equal(node("intake.mjs", ["start", "--provider", "codex", "--grounding", "unverified"]).status, 0);
    convo.steps.forEach((step: V2Step, i: number) => {
      // No prompt hook: Codex passes the user's message itself, then answers the engine's calls.
      const answers = new Map<string, unknown[]>();
      for (const m of step.model) answers.set(m.call, [...(answers.get(m.call) ?? []), m.output]);
      let args = ["turn", "--message", step.user];
      for (let guard = 0; ; guard++) {
        assert.ok(guard < 10, `step ${i}: turn never finished`);
        const r = node("intake.mjs", args);
        args = ["turn"];
        if (r.status === 0) break;
        assert.equal(r.status, 6, `step ${i}: ${r.stdout}`);
        const body = JSON.parse(r.stdout);
        const file = join(repo, body.write_to);
        const sofar = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
        mkdirSync(join(repo, ".intake-kit", "calls"), { recursive: true });
        writeFileSync(file, JSON.stringify([...sofar, answers.get(body.call)!.shift()]));
      }
    });
    const session = parseYaml(readFileSync(join(repo, "intake-answers.yaml"), "utf8"));
    assert.equal(session.session.provider, "codex");
    assert.equal(session.session.grounding, "unverified");
    assert.deepEqual(session.items.map((i: { gate: { decision: string } }) => i.gate.decision), ["go", "dont_build"]);

    assert.equal(node("intake.mjs", ["render"]).status, 0);
    assert.match(readFileSync(join(repo, "SPEC.md"), "utf8"), /\[core\.users\] "I build it, the three shift leads use it on Tuesday/);
    const checks = node("check.mjs", ["run"]);
    // In the v2 worked example the vague trust answer gets its probe and a real answer, so nothing stays assumed.
    assert.match(checks.stdout, /pass\s+traceability[\s\S]*pass\s+open_assumptions/);
  });

  test("the example Codex hook records $intake prompts", () => {
    const repo = temp("intake-kit-codex-hook-");
    const hook = JSON.parse(readFileSync(".agents/intake-kit/codex-hooks.example.json", "utf8")).hooks.UserPromptSubmit[0].hooks[0];
    assert.equal(hook.command, "node .agents/intake-kit/dist/hook-prompt.mjs");
    cpSync(".agents", join(repo, ".agents"), { recursive: true });
    const r = spawnSync(process.execPath, [join(repo, ".agents", "intake-kit", "dist", "hook-prompt.mjs")], {
      encoding: "utf8",
      input: JSON.stringify({ prompt: "$intake our orders aren't integrating", cwd: repo, hook_event_name: "UserPromptSubmit" }),
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(readFileSync(join(repo, ".intake-kit", "transcript.jsonl"), "utf8"), /"command":true/);
  });
});

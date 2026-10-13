// Generates the Codex packaging in .agents/ from the Claude Code plugin, so there is one source.
//
//   .agents/intake-kit/            the standalone kit: kit.json, dist/, framework/, templates/
//   .agents/skills/intake/         $intake
//   .agents/skills/intake-guardrails/   $intake-guardrails
//   .agents/skills/intake-audit/   $intake-audit
//
// Codex skills read only `name` and `description` from frontmatter and have no documented
// path substitution or `!` command injection, so each Claude skill is rewritten: paths point
// at the kit two folders up from the skill, and the injected commands become steps the model
// runs itself. Every rewrite must match exactly; if a skill changes so a rewrite no longer
// applies, the build fails rather than shipping a broken Codex skill.
//
// Called by scripts/build.mjs, so `npm run build` regenerates it. Untested in Codex itself
// (see HANDOFF.md).

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const OUT = ".agents";
const KIT = "<KIT>";

const SKILLS = [
  { from: "intake", to: "intake" },
  { from: "guardrails", to: "intake-guardrails" },
  { from: "audit", to: "intake-audit" },
];

const COMMANDS = [
  ["/intake-kit:intake", "$intake"],
  ["/intake-kit:guardrails", "$intake-guardrails"],
  ["/intake-kit:audit", "$intake-audit"],
];

function replaceExactly(text, from, to, count, where) {
  const found = text.split(from).length - 1;
  if (found !== count) throw new Error(`build-codex: expected ${count} × ${JSON.stringify(from)} in ${where}, found ${found}`);
  return text.split(from).join(to);
}

const KIT_NOTE = `## Where the kit lives

This skill's scripts, framework and templates are in the \`intake-kit\` folder next to the \`skills\` folder that holds this skill: \`.agents/intake-kit\` if the kit was copied into this repo, or \`~/.agents/intake-kit\` if it was installed for your user. Below, \`${KIT}\` means that folder's path. Work it out once from where you read this file, and use it as a full path in every command.
`;

const PREFLIGHT_CLAUDE = '!`node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.mjs"`\n\nIf the line above doesn\'t read';
const PREFLIGHT_CODEX = 'Run `node "' + KIT + '/dist/doctor.mjs"` before anything else.\n\nIf it doesn\'t print';

export function codexSkill(name, source, description) {
  let body = source.replace(/^---\n[\s\S]*?\n---\n/, "");
  body = replaceExactly(body, PREFLIGHT_CLAUDE, PREFLIGHT_CODEX, 1, `${name} preflight`);
  if (!/^# .+\n/m.test(body)) throw new Error(`build-codex: ${name} has no title to put the kit note under`);
  body = body.replace(/^(# .+\n)/m, `$1\n${KIT_NOTE}`);

  if (name === "intake") {
    body = replaceExactly(
      body,
      "Don't attempt the interview another way.",
      "Don't attempt the interview another way.\n\nThen run `node \"" + KIT + "/dist/intake.mjs\" guide` and read its output before your first question (see Guide at the end of this file).",
      1,
      "intake preflight guide",
    );
    body = replaceExactly(
      body,
      '!`node "${CLAUDE_PLUGIN_ROOT}/dist/intake.mjs" guide`',
      'Before your first question, run `node "' + KIT + '/dist/intake.mjs" guide` and keep its output in mind for the whole interview. It is the router, every coverage area and every allowed band.',
      1,
      "intake guide",
    );
    body = replaceExactly(
      body,
      '1. **Start.** Run `node "${CLAUDE_PLUGIN_ROOT}/dist/intake.mjs" start`.',
      '1. **Start.** Run `node "' + KIT + '/dist/intake.mjs" start --provider codex --grounding unverified`. (If this repo has the optional intake-kit prompt hook in `.codex/hooks.json`, use `--grounding transcript` instead.)',
      1,
      "intake start",
    );
    body = replaceExactly(
      body,
      '2. **Each time the user speaks** (the opening statement is the first time), run `node "${CLAUDE_PLUGIN_ROOT}/dist/intake.mjs" turn`.',
      '2. **Each time the user speaks** (the opening statement is the first time), run `node "' + KIT + '/dist/intake.mjs" turn --message "<their message, exactly as typed>"`. (With the optional prompt hook, leave out `--message`: the hook records it.) When it exits 6, answer the call and run `turn` again without `--message`.',
      1,
      "intake turn",
    );
    body = replaceExactly(
      body,
      "The engine checks every quote against what they typed and drops anything else, so an answer you can't quote isn't recorded.",
      "The engine checks every quote against the message you passed (or, with the optional prompt hook, what they typed) and drops anything else, so an answer you can't quote isn't recorded. Without the hook the session is marked unverified, so pass their message exactly.",
      1,
      "intake quotes",
    );
  }

  body = body.split("${CLAUDE_PLUGIN_ROOT}").join(KIT);
  for (const [claude, codex] of COMMANDS) body = body.split(claude).join(codex);
  if (/CLAUDE_PLUGIN_ROOT|^!`|\/intake-kit:/m.test(body)) throw new Error(`build-codex: Claude-only syntax left in ${name}`);
  return `---\nname: ${name}\ndescription: ${description}\n---\n${body}`;
}

export function buildCodex(root = ".", outDir = join(root, OUT)) {
  const version = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8")).version;
  rmSync(outDir, { recursive: true, force: true });

  const kit = join(outDir, "intake-kit");
  mkdirSync(kit, { recursive: true });
  writeFileSync(join(kit, "kit.json"), JSON.stringify({ name: "intake-kit", version, generated_from: "the intake-kit Claude Code plugin; don't edit by hand" }, null, 2) + "\n");
  cpSync(join(root, "dist"), join(kit, "dist"), { recursive: true });
  cpSync(join(root, "templates"), join(kit, "templates"), { recursive: true });
  mkdirSync(join(kit, "framework"), { recursive: true });
  for (const f of ["router.yaml", "scoring.yaml"]) cpSync(join(root, "skills", "intake", f), join(kit, "framework", f));
  cpSync(join(root, "skills", "intake", "modules"), join(kit, "framework", "modules"), { recursive: true });
  writeFileSync(join(kit, "codex-hooks.example.json"), JSON.stringify({
    hooks: {
      UserPromptSubmit: [{ hooks: [{ type: "command", command: "node .agents/intake-kit/dist/hook-prompt.mjs", timeout: 10 }] }],
    },
  }, null, 2) + "\n");

  for (const { from, to } of SKILLS) {
    const source = readFileSync(join(root, "skills", from, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
    const description = source.match(/^description: (.+)$/m)?.[1];
    if (!description) throw new Error(`build-codex: skills/${from}/SKILL.md has no description`);
    const dir = join(outDir, "skills", to);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), codexSkill(to, source, description.replace(/\/intake-kit:(\w+)/g, (_, c) => `$${c === "intake" ? "intake" : `intake-${c}`}`)));
  }
}


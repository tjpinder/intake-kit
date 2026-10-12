# AGENTS.md

Guidance for coding agents (Codex, Claude Code and others) working on the intake-kit repo itself. To use the kit from Codex in another repo, see "Using intake-kit from Codex" below.

## What this is

intake-kit turns a plain-language intake interview into a build-ready spec pack with guardrails. It ships as a Claude Code plugin (`.claude-plugin/`, `skills/`, `hooks/`) and as a standalone kit for Codex (`.agents/`). `HANDOFF.md` is the spec; its "Build decisions" sections win over anything earlier in it.

## Rules

- **One source.** Everything in `.agents/`, `dist/` and `src/lib/generated/` is generated. Edit `src/`, `skills/`, `templates/` and `schema/`, then run `npm run build`. Never hand-edit generated files.
- **The model never scores.** Scores, quadrants and gates are computed by code from `skills/intake/scoring.yaml`. Don't add a turn field that lets a model set them.
- **Every quote is the user's words.** Don't weaken grounding (`src/lib/grounding.ts`) or the citation rule in rendered files.
- **Never overwrite a user's file without asking.** Rendering and `/guardrails` stage changes and ask.
- **No outside framework dependencies.** The guardrail checks are the kit's own; HANDOFF.md explains why. Don't add a runtime dependency on another framework or its CLI.
- **Synthetic data only.** No real customer, employee or former-employer data, and no secrets.

## Commands

```sh
npm install           # dev tools only
npm run build         # bundles src/cli/*.ts into dist/ and regenerates .agents/
npm test              # builds first; unit, golden-file, grounding and end-to-end tests
npm run typecheck
npm run golden:update # after an intended change to rendering; review the diff
node scripts/dogfood.mjs
```

Run commands one at a time, without `&&`, `||` or pipes; they need to work in PowerShell as well as bash.

## Using intake-kit from Codex

Copy the `.agents/` folder into the root of the repo you want to run an intake in (or into `~/.agents/` to have it everywhere). Codex then finds three skills:

| Skill | Does |
| --- | --- |
| `$intake` | Runs the guided intake and renders the spec pack |
| `$intake-guardrails` | Writes GUARDRAILS.md's flagged paths, `.intake-kit/checks.json` and a CI workflow |
| `$intake-audit` | Runs the guardrail checks and writes `audits/intake-kit-audit.md` |

Node 22 or later is required. Without a prompt hook, Codex sessions are marked `grounding: unverified`: quotes aren't checked against what the user typed. To turn checking on, copy the hook in `.agents/intake-kit/codex-hooks.example.json` into the repo's `.codex/hooks.json`, approve it with `/hooks`, and start intakes with `--grounding transcript`.

**Status: untested in Codex.** The `.agents/` packaging is generated and its scripts are tested end to end without Codex, but no Codex session has run these skills yet. Installing the Claude Code plugin into Codex isn't supported: its skills rely on Claude Code's `${CLAUDE_PLUGIN_ROOT}` substitution and `!` command injection.

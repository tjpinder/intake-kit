# intake-kit

Turn a vague ops request into a build-ready spec in 30 minutes.

intake-kit is a Claude Code plugin. It runs a guided intake interview, scores what it hears, gates each item (Go, Gather more, Don't build, Fix not build), and writes a spec pack with guardrails derived from what the user actually said.

> **Status:** in development. All three commands work in Claude Code. The Codex packaging is built but not yet tested in Codex. The worked example and the docs site are still to come. See [HANDOFF.md](HANDOFF.md) for the full spec.

## Prerequisites

- **Node.js 22 or later.** Claude Code's native installer doesn't include Node, so check with `node --version`. If it's missing or older, install it from [nodejs.org](https://nodejs.org). Every command checks this first and stops with a clear message if Node isn't available.
- **Claude Code 2.1.292 or later** for the one-command install below. Older versions can use the two-step install.

## Install

```sh
claude plugin install intake-kit --marketplace tjpinder/intake-kit
```

Or, on older Claude Code versions, inside a session:

```
/plugin marketplace add tjpinder/intake-kit
/plugin install intake-kit@intake-kit
```

## Commands

| Command | Does |
| --- | --- |
| `/intake-kit:intake` | Runs the guided intake and renders the spec pack |
| `/intake-kit:guardrails` | Writes GUARDRAILS.md, `.intake-kit/checks.json` and a CI workflow from the intake |
| `/intake-kit:audit` | Runs the kit's checks and writes `audits/intake-kit-audit.md` |

## Codex

Copy the `.agents/` folder into a repo (or into `~/.agents/`) and Codex finds `$intake`, `$intake-guardrails` and `$intake-audit`. Node 22 or later is required. See [AGENTS.md](AGENTS.md) for details, including the optional prompt hook that turns on quote checking. **Not yet tested in Codex itself.**

## Guardrail checks

`/intake-kit:guardrails` copies the checks into your repo (`.intake-kit/check.mjs`) and adds `.github/workflows/intake-kit.yml`, so every pull request runs them with nothing else to install. A failing check blocks the merge.

| Check | Fails when |
| --- | --- |
| `traceability` | A SPEC or ACCEPTANCE requirement doesn't cite a real answer in the user's words |
| `eval_gate` | An item that uses an LLM has no eval set, or its evals fail |
| `kill_criteria` | GUARDRAILS.md has no kill criteria or no manual fallback |
| `flagged_paths` | A pull request changes a flagged path without the review label |
| `open_assumptions` | An assumption in DECISIONS.md has no owner |

A check that doesn't apply, or can't run where it is (for example `flagged_paths` outside a pull request), is reported as skipped, never as a pass. Hooks only remind: they record the checks at the end of a session, mention failures at the start of the next one, and flag edits to flagged paths.

## Development

```sh
npm install        # dev tools only; users never need this
npm run build      # bundles src/cli/*.ts into dist/*.mjs (committed)
npm test
npm run typecheck
claude plugin validate .
claude --plugin-dir .   # load the plugin from this checkout for one session
```

## License

MIT

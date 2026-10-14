# intake-kit

**Paste stakeholder notes → coverage, conflicts and a round-2 packet.**

intake-kit turns a vague ops request into a build-ready spec. You send the requester a question packet, then paste back whatever comes back: their email reply, your meeting notes, a call transcript. intake-kit reads it against every question, shows what's covered and what conflicts, and writes a round-2 packet that asks only what's still open. When you sign off, it gates each item (Go, Gather more, Don't build, Fix not build) and writes the spec pack.

It never fills a gap itself. Every answer is quoted in the stakeholder's own words, and code checks each quote against what was pasted. Your own notes are a paraphrase, so anything resting only on them stays "needs confirming" until the stakeholder says it.

## What it looks like

From [a recorded worked example](examples/async-example/walkthrough.md) (synthetic sources, replayed with no model calls):

**1. Paste Sam's email.** Eight of nine required questions answered, and one business term flagged:

```text
Daily short-pick report: 8 of 9 required answered; still open: data_report.definition: only partly answered;
existing-asset check: no clear yes or no; "short pick": no confirmed definition.
```

**2. Paste your notes from a call with the DC manager.** Sam said 7am; she said 6am. intake-kit doesn't pick one. It asks, in the round-2 packet:

```text
1. We have two different answers here: "Report must be ready by 7am Monday." and "Report must be ready by 6am Monday.". Which is right?
6. Our notes define "short pick" as "A short pick is when the confirmed quantity is less than the task quantity; cancelled lines don't count;
   wrong-location scans do count.". Is that right? Please say what counts and what doesn't, in your own words.
```

("Monday" is the model's one-line paraphrase drifting: Sam's report is daily. It's a [known issue](docs/evals/how-we-tested-it.md#known-issues-not-fixed-logged); the quotes it records are always exact.)

**3. Sign off now, and it refuses to guess.** The report would be easy to build, but "short pick" is only defined in your notes:

```text
Daily short-pick report: Gather more
  - "short pick" has no confirmed definition
```

`DEFINITIONS.md` says the same thing to whoever builds it: _"The owner hasn't defined it yet. Don't interpret it: ask."_

**4. Paste Sam's round-2 reply.** 6am is settled, "short pick" is defined in his words, and the report reaches **Go**. The Monday spreadsheet it replaces is **Don't build**, a decision you confirm on its own at sign-off.

The spec pack: `SPEC.md`, `ACCEPTANCE.md`, `GUARDRAILS.md`, `DECISIONS.md`, `DEFINITIONS.md` (every business term, defined by the owner), `SOW_DRAFT.md` (scope, assumptions and acceptance; pricing and legal terms left blank), plus `CLAUDE.md` and `FIRST_PROMPT.md` to start the build. See [the full output](examples/async-example/output/final/).

## How it works

- **Code runs the intake; the model only reads.** Code decides what to ask, what counts as an answer, when two answers conflict, what's still open, and every gate. The model's jobs are narrow and checked: read a document against the questions, and write up bands and prose at the end.
- **No invented answers.** A quote that isn't in what was pasted is dropped, and an answer with no quote isn't recorded.
- **Don't build needs evidence.** Missing information means Gather more, never Don't build. Each Don't-build reason is confirmed on its own at sign-off.
- **No confirmed definition, no Go.** Business terms ("short pick", "on-time", "fill rate") must be defined by the owner, not interpreted.

[How we tested it](docs/evals/how-we-tested-it.md): the failures, the fixes and the numbers, each tied to a commit.

Why it works this way: [How to turn a vague automation request into a build-ready spec](https://startvest.ai/blog/vague-request-to-build-ready-spec), the method behind intake-kit and the two decisions that changed it.

> **Status:** in development. The async intake (`/intake-kit:collect`) and the live interview (`/intake-kit:intake`) both work in Claude Code. The web app plays a [recorded sample](https://agreeable-hill-0ede1650f.5.azurestaticapps.net/?sample); live web intakes are paused, and the web app has no async screens yet. The Codex packaging is built but not yet tested in Codex. See [HANDOFF.md](HANDOFF.md) for the full spec.

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
| `/intake-kit:collect` | **The async intake:** triage a request, send the question packet, paste back replies, notes or transcripts, follow up on what's open, sign off and render the spec pack |
| `/intake-kit:intake` | The live interview, for when the person who knows the answers is the one typing |
| `/intake-kit:guardrails` | Writes GUARDRAILS.md, `.intake-kit/checks.json` and a CI workflow from the intake |
| `/intake-kit:audit` | Runs the kit's checks and writes `audits/intake-kit-audit.md` |

## Codex

Copy the `.agents/` folder into a repo (or into `~/.agents/`) and Codex finds `$intake-collect`, `$intake`, `$intake-guardrails` and `$intake-audit`. Node 22 or later is required. See [AGENTS.md](AGENTS.md) for details, including the optional prompt hook that turns on quote checking. **Not yet tested in Codex itself.**

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
node scripts/replay-async-example.mjs   # replay the recorded worked example, no model calls
```

## License

MIT

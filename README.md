# intake-kit

Turn a vague ops request into a build-ready spec in 30 minutes.

intake-kit is a Claude Code plugin. It runs a guided intake interview, scores what it hears, gates each item (Go, Gather more, Don't build, Fix not build), and writes a spec pack with guardrails derived from what the user actually said.

> **Status:** in development. `/intake-kit:intake` runs the full interview, gates each item and renders the spec pack; `/guardrails` and `/audit` aren't built yet. See [HANDOFF.md](HANDOFF.md) for the full spec.

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

---
name: audit
description: Run intake-kit's guardrail checks on this repo and write audits/intake-kit-audit.md.
disable-model-invocation: true
allowed-tools:
  - Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/check.mjs run*)
  - Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/check.mjs" run*)
  - PowerShell(node ${CLAUDE_PLUGIN_ROOT}/dist/check.mjs run*)
  - PowerShell(node "${CLAUDE_PLUGIN_ROOT}/dist/check.mjs" run*)
  - Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.mjs")
  - PowerShell(node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.mjs")
  - Read(./audits/intake-kit-audit.md)
---

# Audit

## Preflight

!`node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.mjs"`

If the line above doesn't read `intake-kit <version> ready`, stop. Tell the user intake-kit needs Node 22 or later, show what the check printed, and point them to https://nodejs.org.

## Run

Run exactly: `node "${CLAUDE_PLUGIN_ROOT}/dist/check.mjs" run --report --json`

It writes `audits/intake-kit-audit.md` and prints every result. Exit 1 means a check failed or errored; that's a result to report, not something to fix by rerunning.

## Report

Tell the user, for each check, exactly what the results say: **pass**, **fail**, **skipped** (it didn't run here, and why), **error** or **off**. Rules:

- Never describe a skipped, errored or off check as passing, and never summarise the run as "all good" unless every check that applies passed.
- For each failure, say what to do about it in a sentence, using its details. For example, open_assumptions: "Put a name in the Owner: field for each assumption in DECISIONS.md." kill_criteria: "Ask the process owner what would make them switch it off, then add it to GUARDRAILS.md."
- Skipped checks often just mean "not on a pull request" or "no LLM involved". Say so plainly.
- If everything that ran passed, say that, and name what was skipped.

Point them to `audits/intake-kit-audit.md` for the full report. Don't change any files to make a check pass unless the user asks.

---
name: intake-audit
description: Run intake-kit's guardrail checks on this repo and write audits/intake-kit-audit.md.
---

# Audit

## Where the kit lives

This skill's scripts, framework and templates are in the `intake-kit` folder next to the `skills` folder that holds this skill: `.agents/intake-kit` if the kit was copied into this repo, or `~/.agents/intake-kit` if it was installed for your user. Below, `<KIT>` means that folder's path. Work it out once from where you read this file, and use it as a full path in every command.

## Preflight

Run `node "<KIT>/dist/doctor.mjs"` before anything else.

If it doesn't print `intake-kit <version> ready`, stop. Tell the user intake-kit needs Node 22 or later, show what the check printed, and point them to https://nodejs.org.

## Run

Run exactly: `node "<KIT>/dist/check.mjs" run --report --json`

It writes `audits/intake-kit-audit.md` and prints every result. Exit 1 means a check failed or errored; that's a result to report, not something to fix by rerunning.

## Report

Tell the user, for each check, exactly what the results say: **pass**, **fail**, **skipped** (it didn't run here, and why), **error** or **off**. Rules:

- Never describe a skipped, errored or off check as passing, and never summarise the run as "all good" unless every check that applies passed.
- For each failure, say what to do about it in a sentence, using its details. For example, open_assumptions: "Put a name in the Owner: field for each assumption in DECISIONS.md." kill_criteria: "Ask the process owner what would make them switch it off, then add it to GUARDRAILS.md."
- Skipped checks often just mean "not on a pull request" or "no LLM involved". Say so plainly.
- If everything that ran passed, say that, and name what was skipped.

Point them to `audits/intake-kit-audit.md` for the full report. Don't change any files to make a check pass unless the user asks.

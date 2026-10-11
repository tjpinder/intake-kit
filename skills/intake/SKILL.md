---
name: intake
description: Run a guided intake interview that turns a plain-language request into a build-ready spec pack. Use at the start of a new build or when someone describes a problem to solve.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/*)
---

# /intake

## Preflight

!`node "${CLAUDE_PLUGIN_ROOT}/dist/doctor.mjs"`

<!-- No shell operators on the line above: it must run unchanged in bash and in PowerShell 5.1. If Node is missing or too old, the command fails and Claude Code aborts the skill with the error visible. -->

If the line above doesn't read `intake-kit <version> ready`, stop. Tell the user intake-kit needs Node 22 or later, show what the check printed, and point them to https://nodejs.org. Don't attempt the steps below another way.

## Status

Not built yet (step 0 scaffold). Tell the user this command is a placeholder and stop.

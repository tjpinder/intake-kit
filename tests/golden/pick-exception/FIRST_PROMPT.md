# First prompt

Paste this into a new Claude Code session in this repo to start the build.

```
Read SPEC.md, ACCEPTANCE.md, GUARDRAILS.md and DECISIONS.md in full before doing anything.

We're building: Daily pick-exception report.

1. Plan first. Give me a short plan: the smallest slice that proves the idea, the files you'll touch, and how you'll test it. Wait for my OK.
2. Build only that slice. Start with this criterion: Given a shift with short picks and wrong-location scans, when the daily report runs, then each picker's exceptions for that shift are counted, excluding cancelled lines.
3. Write tests from ACCEPTANCE.md, including the error cases, before the code they cover.
4. Stop and ask before touching anything in Out of scope, or anything that depends on the 1 open question in SPEC.md.
5. Check GUARDRAILS.md before anything that touches data handling or a review point.
```

# Statement of work (draft): Daily short-pick report; Sam builds the report by hand in Excel from a WMS export

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14), after sign-off. This is a draft for the interviewer to finish, not a contract. Every line comes from the intake. Pricing, timeline, payment and legal terms are never generated: they're left as marked blanks.

## Background and objective

### Daily short-pick report (`item-1`)

> Shift leads need a daily short-pick report per picker to target retraining, because today they mostly guess.

- Sam wants short picks per picker down by a third within two months. [core.outcome] "If it works, I'd like short picks per picker down by a third within two months."

### Sam builds the report by hand in Excel from a WMS export (`item-2`)

- Sam wants short picks per picker down by a third within two months. [core.outcome] "If it works, I'd like short picks per picker down by a third within two months."

## Scope and deliverables

### Daily short-pick report (`item-1`)

**Discovery.** Answer the open questions in DISCOVERY_BRIEF.md, then re-run the intake to a sign-off:

- Should wrong-location scans always count as short picks, or are there exceptions? Who can answer: Priya (DC manager). What would settle it: Final rule definition agreed with Priya. [data_report.definition]
- How exactly do you calculate "short pick"? What's in and what's out? Give one real example and the right number. Who can answer: Whoever owns the process. What would settle it: The owner's definition in their own words, and one real example with the correct result. [term-1]
- Recommended: give one real example of "over pick" and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-2]

### Sam builds the report by hand in Excel from a WMS export (`item-2`)

**Discovery.** Answer the open questions in DISCOVERY_BRIEF.md, then re-run the intake to a sign-off:

- The last time, step by step, with screens, what was typed and what was checked? [manual_process.walkthrough]
- Frequency, count per run, time per run, peaks? [manual_process.volume]
- What decision or outcome depends on this, and who makes it? Who can answer: Whoever asked for it, or whoever will act on the result. What would settle it: A named decision or outcome that changes once this exists, and who owns it. [core.outcome]
- What number would show this worked, and what is that number today? Who can answer: Whoever owns the outcome, and whoever keeps today's numbers. What would settle it: A baseline measured today (a time, count or cost) and the target that would count as success. [core.outcome]
- What is the current way costing, or what is this worth if it works? Who can answer: Whoever owns the outcome, or whoever pays for the current way. What would settle it: An estimate of the cost today or the gain, in hours, errors or money, even a rough one. [core.outcome]

## Out of scope

- No customer or pricing data; cancelled lines don't count; over picks are not included.

## Acceptance

### Daily short-pick report (`item-1`)

- [ ] Every open question answered in the owner's words, with who answered it.
- [ ] Every term in DEFINITIONS.md confirmed by the owner.

### Sam builds the report by hand in Excel from a WMS export (`item-2`)

- [ ] Every open question answered in the owner's words, with who answered it.
- [ ] Every term in DEFINITIONS.md confirmed by the owner.

## Assumptions

- **data_report.definition** (`item-1`): A short pick is when the confirmed quantity is less than the task quantity; cancelled lines don't count; wrong-location scans do count. ("Counting: a short pick is when the confirmed quantity is less than the task quantity. Cancelled lines don't count. I think wrong-location scans should count too but I'm not totally sure, Priya might know."). Owner: _unassigned_
- **"over pick"** can not be seen in the system's data, by the owner's definition. How it will be measured is still open. Owner: _unassigned_

## Dependencies and constraints

- Sam uses Excel and WMS export; the reporting copy is accessed. [core.systems] "Today it takes me about four hours every Monday morning to put together in Excel, by hand, from a WMS export. "
- All data comes from WMS pick confirmations, read from the reporting copy; no customer or pricing data, just badge numbers and locations. [core.data] "Data: everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations."
- Priya signs off on retraining; no customer or pricing data is used. [core.constraints] "Priya (DC manager) signs off on any retraining."
- Shift leads use the output to target retraining. [core.users] "so the shift leads can target retraining"

## Risks

- Stop if: If the report disagrees with WMS two weeks in a row, switch it off and revert to manual reporting. [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet." · [data_report.truth] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."
- Fallback: Fallback is Sam's manual Excel report from WMS export. [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet." · [data_report.existing] "Today it takes me about four hours every Monday morning to put together in Excel, by hand, from a WMS export."

## Success measures

### Daily short-pick report (`item-1`)

- Sam wants short picks per picker down by a third within two months. [core.outcome] "If it works, I'd like short picks per picker down by a third within two months."

### Sam builds the report by hand in Excel from a WMS export (`item-2`)

_To be agreed: the intake has no measurable target against a baseline yet (listed under Risks)._

## Change control

- Any change to scope, definitions or acceptance goes back through the intake and is signed off again.

## Commercial terms

- Price: [To be completed]
- Timeline and milestones: [To be completed]
- Payment terms: [To be completed]
- Legal terms and signatures: [To be completed]

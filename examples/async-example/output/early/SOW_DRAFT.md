# Statement of work (draft): Daily short-pick report; Sam builds the report in Excel by hand from a WMS export

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14), after sign-off. This is a draft for the interviewer to finish, not a contract. Every line comes from the intake. Pricing, timeline, payment and legal terms are never generated: they're left as marked blanks.

## Background and objective

### Daily short-pick report (`item-1`)

> Shift leads need a daily report showing short picks per picker to target retraining, since right now they mostly guess.

- Short picks per picker should be down by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

### Sam builds the report in Excel by hand from a WMS export (`item-2`)

- Short picks per picker should be down by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

## Scope and deliverables

### Daily short-pick report (`item-1`)

**Discovery.** Answer the open questions in DISCOVERY_BRIEF.md, then re-run the intake to a sign-off:

- Should wrong-location scans always count as short picks, or are there exceptions? Who can answer: Priya (DC manager). What would settle it: Written rule or confirmation from Priya. [data_report.definition]
- Should the report be ready by 6am or 7am, and who needs it first? Who can answer: Priya (DC manager). What would settle it: Confirmation of timing requirement. [core.constraints]
- Apps touched, access method, changes expected in 6 months? [core.systems]
- How exactly do you calculate "short-pick"? What's in and what's out? Give one real example and the right number. Who can answer: Whoever owns the process. What would settle it: The owner's definition in their own words, and one real example with the correct result. [term-1]
- Recommended: give one real example of "over pick" and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-2]

### Sam builds the report in Excel by hand from a WMS export (`item-2`)

**Discovery.** Answer the open questions in DISCOVERY_BRIEF.md, then re-run the intake to a sign-off:

- The last time, step by step, with screens, what was typed and what was checked? [manual_process.walkthrough]
- Frequency, count per run, time per run, peaks? [manual_process.volume]
- What decision or outcome depends on this, and who makes it? Who can answer: Whoever asked for it, or whoever will act on the result. What would settle it: A named decision or outcome that changes once this exists, and who owns it. [core.outcome]
- What number would show this worked, and what is that number today? Who can answer: Whoever owns the outcome, and whoever keeps today's numbers. What would settle it: A baseline measured today (a time, count or cost) and the target that would count as success. [core.outcome]
- What is the current way costing, or what is this worth if it works? Who can answer: Whoever owns the outcome, or whoever pays for the current way. What would settle it: An estimate of the cost today or the gain, in hours, errors or money, even a rough one. [core.outcome]
- Still unknown: Apps touched, access method, changes expected in 6 months. [core.systems]

## Out of scope

- No customer or pricing data; cancelled lines and over picks are not included.

## Acceptance

### Daily short-pick report (`item-1`)

- [ ] Every open question answered in the owner's words, with who answered it.
- [ ] Every term in DEFINITIONS.md confirmed by the owner.

### Sam builds the report in Excel by hand from a WMS export (`item-2`)

- [ ] Every open question answered in the owner's words, with who answered it.
- [ ] Every term in DEFINITIONS.md confirmed by the owner.

## Assumptions

- **data_report.definition** (`item-1`): A short pick is when the confirmed quantity is less than the task quantity; cancelled lines don't count; wrong-location scans do count. ("a short pick is when the confirmed quantity is less than the task quantity. Cancelled lines don't count. I think wrong-location scans should count too but I'm not totally sure, Priya might know."). Owner: _unassigned_
- **data_report.truth** (`item-1`): WMS pick confirmations are the source of truth if numbers disagree. ("if dashboard and report disagree, WMS pick confirmations win"). Owner: _unassigned_
- **"over pick"** can not be seen in the system's data, by the owner's definition. How it will be measured is still open. Owner: _unassigned_

## Dependencies and constraints

- All data comes from WMS pick confirmations, using the reporting copy; no customer or pricing data, just badge numbers and locations. [core.data] "everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations."
- The report needs to be there by 7am. [core.constraints] "it needs to be there by 7am when I get in."
- Shift leads use the report to target retraining. [core.users] "so the shift leads can target retraining"

## Risks

- Stop if: If the numbers in the new report disagreed with the WMS two weeks in a row Sam would switch it off and go back to the spreadsheet. [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."

## Success measures

### Daily short-pick report (`item-1`)

- Short picks per picker should be down by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

### Sam builds the report in Excel by hand from a WMS export (`item-2`)

_To be agreed: the intake has no measurable target against a baseline yet (listed under Risks)._

## Change control

- Any change to scope, definitions or acceptance goes back through the intake and is signed off again.

## Commercial terms

- Price: [To be completed]
- Timeline and milestones: [To be completed]
- Payment terms: [To be completed]
- Legal terms and signatures: [To be completed]

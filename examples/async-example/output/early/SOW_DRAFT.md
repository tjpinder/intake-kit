# Statement of work (draft): Daily short-pick report; Monday Excel export

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14), after sign-off. This is a draft for the interviewer to finish, not a contract. Every line comes from the intake. Pricing, timeline, payment and legal terms are never generated: they're left as marked blanks.

## Background and objective

### Daily short-pick report (`item-1`)

> Shift leads need a daily report showing short picks per picker so they can target retraining.

- Sam wants short picks per picker down by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

### Monday Excel export (`item-2`)

- Sam wants short picks per picker down by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

## Scope and deliverables

### Daily short-pick report (`item-1`)

**Discovery.** Answer the open questions in DISCOVERY_BRIEF.md, then re-run the intake to a sign-off:

- Should wrong-location scans always count as short picks, and are there any exceptions? Who can answer: Priya (DC manager). What would settle it: Confirmation from Priya. [data_report.definition]
- Is 6am the final deadline for report delivery, or is there flexibility? Who can answer: Priya (DC manager). What would settle it: Confirmation from Priya. [data_report.delivery]
- How exactly do you calculate short-pick? What's in and what's out? Give one real example and the right number. Who can answer: Whoever owns the process. What would settle it: The owner's definition in their own words, and one real example with the correct result. [term-1]
- Recommended: give one real example of over pick and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-2]

### Monday Excel export (`item-2`)

**Discovery.** Answer the open questions in DISCOVERY_BRIEF.md, then re-run the intake to a sign-off:

- The last time, step by step, with screens, what was typed and what was checked? [manual_process.walkthrough]
- Frequency, count per run, time per run, peaks? [manual_process.volume]
- What decision or outcome depends on this, and who makes it? Who can answer: Whoever asked for it, or whoever will act on the result. What would settle it: A named decision or outcome that changes once this exists, and who owns it. [core.outcome]
- What number would show this worked, and what is that number today? Who can answer: Whoever owns the outcome, and whoever keeps today's numbers. What would settle it: A baseline measured today (a time, count or cost) and the target that would count as success. [core.outcome]
- What is the current way costing, or what is this worth if it works? Who can answer: Whoever owns the outcome, or whoever pays for the current way. What would settle it: An estimate of the cost today or the gain, in hours, errors or money, even a rough one. [core.outcome]

## Out of scope

- No customer or pricing data; cancelled lines and over picks are not included.

## Acceptance

### Daily short-pick report (`item-1`)

- [ ] Every open question answered in the owner's words, with who answered it.
- [ ] Every term in DEFINITIONS.md confirmed by the owner.

### Monday Excel export (`item-2`)

- [ ] Every open question answered in the owner's words, with who answered it.
- [ ] Every term in DEFINITIONS.md confirmed by the owner.

## Assumptions

- **"over pick"** can not be seen in the system's data, by the owner's definition. How it will be measured is still open. Owner: _unassigned_

## Dependencies and constraints

- Data is exported from WMS and processed in Excel by hand. [core.systems] "everything comes from WMS pick confirmations."
- Everything comes from WMS pick confirmations; no customer or pricing data, just badge numbers and locations. [core.data] "everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations."
- The report needs to be there by 7am when Sam gets in. [core.constraints] "it needs to be there by 7am when I get in."
- Shift leads use the report to target retraining. [core.users] "so the shift leads can target retraining"

## Risks

- Stop if: If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet. [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet." · [data_report.truth] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."
- Fallback: Go back to the manual Excel process if the automated report fails or disagrees with WMS. [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."

## Success measures

### Daily short-pick report (`item-1`)

- Sam wants short picks per picker down by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

### Monday Excel export (`item-2`)

_To be agreed: the intake has no measurable target against a baseline yet (listed under Risks)._

## Change control

- Any change to scope, definitions or acceptance goes back through the intake and is signed off again.

## Commercial terms

- Price: [To be completed]
- Timeline and milestones: [To be completed]
- Payment terms: [To be completed]
- Legal terms and signatures: [To be completed]

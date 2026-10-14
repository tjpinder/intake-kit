# Statement of work (draft): Daily short-pick report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14), after sign-off. This is a draft for the interviewer to finish, not a contract. Every line comes from the intake. Pricing, timeline, payment and legal terms are never generated: they're left as marked blanks.

## Background and objective

> Building a daily short-pick report per picker so shift leads can target retraining and reduce errors.

- The goal is to reduce short picks per picker by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

## Scope and deliverables

**Build.** Automate the report to show short picks per picker, per shift, per day, ready by 6am Monday.

Deliverable: what SPEC.md describes, meeting every check in ACCEPTANCE.md, within GUARDRAILS.md.

## Out of scope

- Do not include over picks or customer/pricing data; cancelled lines are excluded.
- **Sam builds the report manually in Excel from WMS export**: Don't build. Superseded by item-1, which reaches Go. Revisit if item-1 isn't built, or doesn't replace this.

## Acceptance

- [ ] **Given** WMS pick confirmations are available and the report is generated automatically, **when** the report is delivered by 6am Monday showing short picks per picker, per shift, per day, **then** shift leads can use it to select pickers for retraining. [core.data] "everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations." · [data_report.delivery] "it needs to be there by 7am when I get in." · [data_report.grain] "The WMS dashboard only shows building totals, nothing per picker." · [data_report.decision] "the shift leads would use it every Tuesday to pick which pickers get pulled for retraining."
- [ ] **Given** The report disagrees with WMS pick confirmations for two consecutive weeks, **when** Sam reviews the numbers, **then** Sam switches off the automated report and returns to manual Excel reporting. [data_report.truth] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet." · [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."

## Assumptions

- **"over pick"** can not be seen in the system's data, by the owner's definition. How it will be measured is still open. Owner: _unassigned_

## Dependencies and constraints

- WMS is used, accessed via reporting copy. [core.systems] "everything comes from WMS pick confirmations. We can read the reporting copy."
- Data comes from WMS pick confirmations, reporting copy, with badge numbers and locations. [core.data] "everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations."
- Report must be ready by 6am Monday. [core.constraints] "it needs to be there by 7am when I get in."
- Sam builds the report, three shift leads use it, Priya signs off on retraining. [core.users] "I build the current version, the three shift leads use it, and Priya (DC manager) signs off on any retraining."

## Risks

- Stop if: If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet. [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet." · [data_report.truth] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."
- Fallback: Manual Excel reporting from WMS exports is the fallback if the automated report fails. [data_report.existing] "Today it takes me about four hours every Monday morning to put together in Excel, by hand, from a WMS export." · [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."

## Success measures

- The goal is to reduce short picks per picker by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

## Change control

- Any change to scope, definitions or acceptance goes back through the intake and is signed off again.

## Commercial terms

- Price: [To be completed]
- Timeline and milestones: [To be completed]
- Payment terms: [To be completed]
- Legal terms and signatures: [To be completed]

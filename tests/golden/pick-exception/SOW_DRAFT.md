# Statement of work (draft): Daily pick-exception report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-10-7f3a, 2026-10-10), after sign-off. This is a draft for the interviewer to finish, not a contract. Every line comes from the intake. Pricing, timeline, payment and legal terms are never generated: they're left as marked blanks.

## Background and objective

> Shift leads choose retraining by guesswork because pick exceptions aren't visible by picker and shift.

- Baseline: about 4 hours every Monday building the sheet. Target: no manual build; exceptions visible by 7am daily [core.outcome] "it eats my whole Monday morning, call it four hours"

## Scope and deliverables

**Build.** A daily HTML report of short picks and location mismatches by shift and picker, ready by 7am.

Deliverable: what SPEC.md describes, meeting every check in ACCEPTANCE.md, within GUARDRAILS.md.

## Out of scope

- Automatically assigning retraining; changing WMS exception codes.
- **Monday Excel exception summary**: Don't build. Superseded by item-1, which reaches Go. Revisit if item-1 isn't built, or doesn't replace this.

## Acceptance

- [ ] **Given** a shift with short picks and wrong-location scans, **when** the daily report runs, **then** each picker's exceptions for that shift are counted, excluding cancelled lines. [data_report.definition] "short picks and wrong-location scans, not the cancelled lines" · [data_report.grain] "filter by shift and count by picker"
- [ ] **Given** a normal working day, **when** the supervisor arrives at 7am, **then** the report is already there. [data_report.delivery] "I want it there when I walk in at seven"
- [ ] **Given** a count looks wrong to a shift lead, **when** they check it before acting, **then** they can trace each number back to the WMS pick confirmations. [core.trust] "if it's wrong I'd just look at the shift lead and ask" · [core.data] "it all comes out of the WMS pick confirmations"

## Assumptions

- **core.trust**: A wrong count would send the wrong picker to retraining; shift lead reviews before acting ("if it's wrong I'd just look at the shift lead and ask"). Owner: _unassigned_

## Dependencies and constraints

- WMS (read-only SQL access via reporting replica), Excel; no upgrades planned [core.systems] "we've got read access to the reporting copy"
- WMS pick confirmations and exception codes; WMS is the system of record; no customer or pricing data [core.data] "it all comes out of the WMS pick confirmations"
- Must be ready before the 7am shift huddle [core.constraints] "I want it there when I walk in at seven"
- Ops supervisor builds it; shift leads use it to plan retraining [core.users] "I build it, the shift leads use it Tuesday"

## Risks

- Stop if: Stop using the report for retraining decisions if a shift lead finds a count that doesn't match the WMS. [core.trust] "if it's wrong I'd just look at the shift lead and ask"
- Fallback: Shift leads check any count they doubt with the supervisor before acting. [core.trust] "if it's wrong I'd just look at the shift lead and ask"

## Success measures

- Baseline: about 4 hours every Monday building the sheet. Target: no manual build; exceptions visible by 7am daily [core.outcome] "it eats my whole Monday morning, call it four hours"

## Change control

- Any change to scope, definitions or acceptance goes back through the intake and is signed off again.

## Commercial terms

- Price: [To be completed]
- Timeline and milestones: [To be completed]
- Payment terms: [To be completed]
- Legal terms and signatures: [To be completed]

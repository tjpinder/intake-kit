# Spec: Daily short-pick report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14). Every requirement line cites the coverage area and the user's own words it came from. Change the answers and re-render rather than editing this file by hand.

## Open questions

- Apps touched, access method, changes expected in 6 months? [core.systems]
- Recommended: give one real example of "short-pick" and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-1]
- Recommended: give one real example of "over pick" and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-2]

## Problem

> Shift leads need a daily report showing short picks per picker to target retraining and reduce errors.

- Shift leads use the report to pick which pickers get pulled for retraining. [data_report.decision] "the shift leads would use it every Tuesday to pick which pickers get pulled for retraining."

## Users

- Shift leads use the report to target retraining. [core.users] "so the shift leads can target retraining"

## Current state

> Sam manually builds a weekly Excel report from WMS exports, taking about four hours; the WMS dashboard only shows building totals.

## Success metric

- Short picks per picker should be down by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

## MVP

> Automate a daily report per picker, per shift, per day, ready by 6am, using WMS pick confirmations and the defined short pick rules.

- A short pick is when the confirmed quantity is less than the task quantity; cancelled lines don't count; wrong-location scans do count. [data_report.definition] "a short pick is when the confirmed quantity is less than the task quantity. Cancelled lines don't count. I think wrong-location scans should count too but I'm not totally sure, Priya might know."
- The report is per picker, per shift, per day. [data_report.grain] "A daily short-pick report per picker"

## Out of scope

> Exclude over picks and any customer or pricing data; cancelled lines do not count.

## Data

- All data comes from WMS pick confirmations, using the reporting copy; no customer or pricing data, just badge numbers and locations. [core.data] "everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations."
- WMS pick confirmations are the source of truth if numbers disagree. [data_report.truth] "if dashboard and report disagree, WMS pick confirmations win"

## Systems

_Nothing recorded._

## Constraints

- The report must be ready by 6am. [core.constraints] "it needs to be there by 7am when I get in."

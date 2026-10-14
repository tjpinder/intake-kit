# Spec: Daily short-pick report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14). Every requirement line cites the coverage area and the user's own words it came from. Change the answers and re-render rather than editing this file by hand.

## Open questions

- Is there a written SOP or example output for the short-pick report process? Who can answer: Sam or Priya. What would settle it: Sample Excel report or written instructions. [manual_process.documentation]
- Recommended: give one real example of "short pick" and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-1]
- Recommended: give one real example of "over pick" and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-2]

## Problem

> Building a daily short-pick report per picker so shift leads can target retraining and reduce errors.

- Shift leads use the report to pick which pickers get retraining. [data_report.decision] "the shift leads would use it every Tuesday to pick which pickers get pulled for retraining."

## Users

- Sam builds the report, three shift leads use it, Priya signs off on retraining. [core.users] "I build the current version, the three shift leads use it, and Priya (DC manager) signs off on any retraining."

## Current state

> Sam manually builds a report in Excel from WMS exports, taking about four hours every Monday.

## Success metric

- The goal is to reduce short picks per picker by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

## MVP

> Automate the report to show short picks per picker, per shift, per day, ready by 6am Monday.

- A short pick is a pick confirmed with fewer units than the task asked for; cancelled lines don't count; wrong-location scans do count. [data_report.definition] "a short pick is when the confirmed quantity is less than the task quantity. Cancelled lines don't count. I think wrong-location scans should count too but I'm not totally sure, Priya might know."
- The report is per picker, per shift, per day. [data_report.grain] "The WMS dashboard only shows building totals, nothing per picker."
- Report must be ready by 6am Monday. [data_report.delivery] "it needs to be there by 7am when I get in."

## Out of scope

> Do not include over picks or customer/pricing data; cancelled lines are excluded.

## Data

- Data comes from WMS pick confirmations, reporting copy, with badge numbers and locations. [core.data] "everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations."
- WMS is the system of record; its number wins if there's a disagreement. [data_report.truth] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."

## Systems

- WMS is used, accessed via reporting copy. [core.systems] "everything comes from WMS pick confirmations. We can read the reporting copy."

## Constraints

- Report must be ready by 6am Monday. [core.constraints] "it needs to be there by 7am when I get in."

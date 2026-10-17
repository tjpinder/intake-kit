# Spec: Daily short-pick report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14). Every requirement line cites the coverage area and the user's own words it came from. Change the answers and re-render rather than editing this file by hand.

## Open questions

- Are there any other edge cases or exceptions (besides cancelled lines and wrong-location scans) that should be included or excluded from the short pick count? Who can answer: Priya (DC manager). What would settle it: Written rule or example cases for short pick counting. [data_report.definition]
- Is there a step-by-step SOP or template for building the current report, or is it all in Sam's head? Who can answer: Sam. What would settle it: Sample Excel template or written instructions. [manual_process.documentation]
- Recommended: give one real example of over pick and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-2]

## Problem

> Shift leads need a daily report of short picks per picker to target retraining and reduce errors.

- Shift leads will target retraining based on the report. [data_report.decision] "so the shift leads can target retraining"

## Users

- Shift leads use the report to target retraining. [core.users] "so the shift leads can target retraining"

## Current state

> Sam spends about four hours every Monday building the report in Excel from a WMS export; the WMS dashboard only shows building totals.

## Success metric

- Sam wants short picks per picker down by a third within two months. [core.outcome] "I'd like short picks per picker down by a third within two months."

## MVP

> Automate a daily per-picker short-pick report, ready by 6am, using WMS pick confirmations, with cancelled lines excluded and wrong-location scans counted.

- A short pick is when the confirmed quantity is less than the task quantity; cancelled lines don't count; Sam thinks wrong-location scans should count but is not sure. [data_report.definition] "a short pick is when the confirmed quantity is less than the task quantity. Cancelled lines don't count. I think wrong-location scans should count too but I'm not totally sure, Priya might know."
- The report is per picker and daily. [data_report.grain] "A daily short-pick report per picker"
- The report must be ready by 6am. [data_report.delivery] "it needs to be there by 7am when I get in."

## Out of scope

> Over picks and anything not in WMS pick confirmations are out of scope.

## Data

- Everything comes from WMS pick confirmations; no customer or pricing data, just badge numbers and locations. [core.data] "everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations."
- WMS is the source of truth; if the report disagrees with WMS two weeks in a row, Sam would stop using it. [data_report.truth] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."

## Systems

- Data is exported from WMS and processed in Excel by hand. [core.systems] "everything comes from WMS pick confirmations."

## Constraints

- The report must be ready by 6am. [core.constraints] "it needs to be there by 7am when I get in."

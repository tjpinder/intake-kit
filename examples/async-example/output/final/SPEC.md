# Spec: Daily short-pick report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14). Every requirement line cites the coverage area and the user's own words it came from. Change the answers and re-render rather than editing this file by hand.

## Open questions

- Is there a written SOP or example file for the manual report process? Who can answer: Sam or Priya. What would settle it: Sample Excel template or written instructions. [manual_process.documentation]
- Has the manual report ever produced incorrect counts or needed correction? Who can answer: Sam. What would settle it: Past error logs or emails. [broken.recurrence]
- Are there any fields in the WMS export that are not needed or should be excluded from the automated report? Who can answer: Sam. What would settle it: Sample WMS export file. [mod.integration.payload]
- Recommended: give one real example of "short pick" and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-1]
- Recommended: give one real example of "over pick" and the right count, so the build can be checked against it. Who can answer: Whoever owns the process. What would settle it: A real case and its correct result. [term-2]

## Problem

> Shift leads need a daily report showing short picks per picker so they can target retraining and reduce errors.

- Shift leads will use it to target retraining. [data_report.decision] "so the shift leads can target retraining"

## Users

- Shift leads use the output to target retraining. [core.users] "so the shift leads can target retraining"

## Current state

> Sam builds the report manually in Excel from WMS exports, taking about four hours every Monday morning.

## Success metric

- Sam wants short picks per picker down by a third within two months. [core.outcome] "If it works, I'd like short picks per picker down by a third within two months."

## MVP

> Automate a daily report per picker, per shift, per day, ready by 6am, counting short picks as defined.

- A short pick is a pick confirmed with fewer units than the task asked for; cancelled lines don't count; wrong-location scans do count; example: task said 5, confirmed 4, so 1 short pick. [data_report.definition] "Counting: a short pick is when the confirmed quantity is less than the task quantity. Cancelled lines don't count. I think wrong-location scans should count too but I'm not totally sure, Priya might know."
- The report is per picker and daily. [data_report.grain] "A daily short-pick report per picker"
- Report must be ready by 6am. [data_report.delivery] "it needs to be there by 7am when I get in."

## Out of scope

> No customer or pricing data is used; over picks are not included in the report.

## Data

- All data comes from WMS pick confirmations, read from the reporting copy; no customer or pricing data, just badge numbers and locations. [core.data] "Data: everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations."
- WMS is the source of truth; if the report disagrees with WMS two weeks in a row, it will be switched off. [data_report.truth] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."

## Systems

- Sam uses Excel and WMS export; the reporting copy is accessed. [core.systems] "Today it takes me about four hours every Monday morning to put together in Excel, by hand, from a WMS export. "

## Constraints

- Priya signs off on retraining; no customer or pricing data is used. [core.constraints] "Priya (DC manager) signs off on any retraining."

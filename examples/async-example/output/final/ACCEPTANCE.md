# Acceptance: Daily short-pick report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70). Each criterion cites the coverage areas and the user's words it rests on. Write tests from these before writing the code they cover.

## Criteria

- [ ] **Given** WMS pick confirmations are available and the report is generated automatically, **when** the report is delivered by 6am Monday showing short picks per picker, per shift, per day, **then** shift leads can use it to select pickers for retraining. [core.data] "everything comes from WMS pick confirmations. We can read the reporting copy. No customer or pricing data in it, just badge numbers and locations." · [data_report.delivery] "it needs to be there by 7am when I get in." · [data_report.grain] "The WMS dashboard only shows building totals, nothing per picker." · [data_report.decision] "the shift leads would use it every Tuesday to pick which pickers get pulled for retraining."

## Error cases

- [ ] **Given** The report disagrees with WMS pick confirmations for two consecutive weeks, **when** Sam reviews the numbers, **then** Sam switches off the automated report and returns to manual Excel reporting. [data_report.truth] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet." · [core.trust] "If the numbers in the new report disagreed with the WMS two weeks in a row I'd switch it off and go back to my spreadsheet."

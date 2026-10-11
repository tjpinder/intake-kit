# Acceptance: Daily pick-exception report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-10-7f3a). Each criterion cites the coverage areas and the user's words it rests on. Write tests from these before writing the code they cover.

## Criteria

- [ ] **Given** a shift with short picks and wrong-location scans, **when** the daily report runs, **then** each picker's exceptions for that shift are counted, excluding cancelled lines. [data_report.definition] "short picks and wrong-location scans, not the cancelled lines" · [data_report.grain] "filter by shift and count by picker"
- [ ] **Given** a normal working day, **when** the supervisor arrives at 7am, **then** the report is already there. [data_report.delivery] "I want it there when I walk in at seven"

## Error cases

- [ ] **Given** a count looks wrong to a shift lead, **when** they check it before acting, **then** they can trace each number back to the WMS pick confirmations. [core.trust] "if it's wrong I'd just look at the shift lead and ask" · [core.data] "it all comes out of the WMS pick confirmations"

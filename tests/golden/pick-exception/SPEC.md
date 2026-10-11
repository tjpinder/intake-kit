# Spec: Daily pick-exception report

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-10-7f3a, 2026-10-10). Every requirement line cites the coverage area and the user's own words it came from. Change the answers and re-render rather than editing this file by hand.

## Open questions

- When the WMS dashboard total and the pick-confirmation count disagree, which one is right? Who can answer: WMS admin. What would settle it: One day where the two numbers differ. [data_report.truth]

## Problem

> Shift leads choose retraining by guesswork because pick exceptions aren't visible by picker and shift.

- Pick which pickers get retraining that week [data_report.decision] "so I know who to pull for retraining"

## Users

- Ops supervisor builds it; shift leads use it to plan retraining [core.users] "I build it, the shift leads use it Tuesday"

## Current state

> The ops supervisor exports WMS data and builds a weekly Excel summary every Monday, about four hours.

## Success metric

- Baseline: about 4 hours every Monday building the sheet. Target: no manual build; exceptions visible by 7am daily [core.outcome] "it eats my whole Monday morning, call it four hours"

## MVP

> A daily HTML report of short picks and location mismatches by shift and picker, ready by 7am.

- Short pick or location mismatch exception code on a confirmed pick; excludes cancelled lines [data_report.definition] "short picks and wrong-location scans, not the cancelled lines"
- Per picker, per shift, daily [data_report.grain] "filter by shift and count by picker"
- HTML page refreshed by 7am [data_report.delivery] "I want it there when I walk in at seven"

## Out of scope

> Automatically assigning retraining; changing WMS exception codes.

## Data

- WMS pick confirmations and exception codes; WMS is the system of record; no customer or pricing data [core.data] "it all comes out of the WMS pick confirmations"

## Systems

- WMS (read-only SQL access via reporting replica), Excel; no upgrades planned [core.systems] "we've got read access to the reporting copy"

## Constraints

- Must be ready before the 7am shift huddle [core.constraints] "I want it there when I walk in at seven"

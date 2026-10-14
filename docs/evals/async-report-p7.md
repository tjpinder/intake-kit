# Async intake evals (2026-10-14)

Commit 52e84c3. Kit (ingest, write-up): gpt-4.1. Simulated requester: gpt-4.1-mini. Triage (type and modifiers) comes from each persona card, since it's the interviewer's call in async mode: routing isn't measured here.

| Format | Runs | Completed | Gates match | Ungrounded quotes | First answer filled (avg) |
| --- | --- | --- | --- | --- | --- |
| email | 1 | 1/1 | 1/1 | 0 | 100% |
| notes | 1 | 1/1 | 1/1 | 0 | 0% |
| transcript | 0 | n/a | n/a | 0 | 0% |

| Persona | Format | Run | Completed | Gates | Match | First answer filled | Follow-ups | Open at sign-off | Ungrounded | Dropped quotes | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| enablement-kit | email | 1 | yes | known_idea: gather_more | yes | 13/13 | 1 | 0 | 0 | 0 | $0.062 |
| enablement-kit | notes | 1 | yes | known_idea: gather_more | yes | 0/13 | 2 | 18 | 0 | 0 | $0.101 |

## Notes

## Remaining note (not tuned: feature freeze)

- The notes run still flags some loose terms ("synthetic data", "adoption reports", "pilot ROI kits") despite the tighter term rule. Each adds a Gather more reason until the owner defines it or the interviewer marks it as not a term. Revisit after the demo ships.

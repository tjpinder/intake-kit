# Persona eval report

Run 2026-10-12. Interviewer: gpt-4.1-mini (the real turn loop, same prompt and checks as the web app). Simulated user: gpt-4.1-mini, which sees each persona's situation and voice but never its expected outcome.

Rates are across runs. Completed means the user confirmed the reflect-back within 30 turns. Gates are scored only for completed runs. Checks covers each persona's extra expectations (modifiers, AI overlay, quadrant, unknown critical areas). Retried means the model's first attempt at a turn was rejected by the app's checks; failed means nothing from that turn could be saved.

| Persona | Runs | Completed | Routed | Items | Gates | Checks | Ungrounded quotes | Retried turns | Failed turns | Avg turns | Avg cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ops-supervisor-report | 3 | 100% | 100% | 67% | 0% | – | 0 | 13% | 3% | 10.3 | $0.057 |
| orders-not-integrating | 3 | 100% | 100% | 100% | 100% | 100% | 0 | 6% | 0% | 12.0 | $0.062 |
| invoice-matching-clerk | 3 | 100% | 100% | 100% | 100% | 67% | 0 | 18% | 11% | 9.3 | $0.061 |
| ai-sops | 3 | 100% | 100% | 100% | 100% | 100% | 0 | 20% | 7% | 10.0 | $0.061 |
| where-could-ai-help | 3 | 100% | 100% | 100% | 100% | – | 0 | 20% | 20% | 15.0 | $0.115 |
| vague-impatient | 3 | 100% | 100% | 100% | 100% | 67% | 0 | 7% | 0% | 9.3 | $0.044 |
| **All** | 18 | 100% | 100% | 94% | 83% | 83% | 0 | 14% | 8% | 11.0 | $0.066 |

## What went wrong, per run

- **ops-supervisor-report** run 1: missing items: manual_process; gates: data_report got gather_more (want go); manual_process got none (want dont_build); 1 items, want at least 2
- **ops-supervisor-report** run 2: gates: data_report got gather_more (want go); manual_process got gather_more (want dont_build)
- **ops-supervisor-report** run 3: gates: data_report got gather_more (want go); manual_process got gather_more (want dont_build)
- **invoice-matching-clerk** run 1: quadrant: none
- **vague-impatient** run 2: only 0 critical areas unknown

## Not run

- Claude as interviewer: no ANTHROPIC_API_KEY was set, so the parity comparison covers Azure OpenAI only.


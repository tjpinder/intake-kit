# Persona eval report

Run 2026-10-11. Interviewer: gpt-4.1-mini (the real turn loop, same prompt and checks as the web app). Simulated user: gpt-4.1-mini, which sees each persona's situation and voice but never its expected outcome.

Rates are across runs. Completed means the user confirmed the reflect-back within 30 turns. Gates are scored only for completed runs. Checks covers each persona's extra expectations (modifiers, AI overlay, quadrant, unknown critical areas). Retried means the model's first attempt at a turn was rejected by the app's checks; failed means nothing from that turn could be saved.

| Persona | Runs | Completed | Routed | Items | Gates | Checks | Ungrounded quotes | Retried turns | Failed turns | Avg turns | Avg cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ops-supervisor-report | 1 | 100% | 100% | 0% | 0% | – | 0 | 13% | 8% | 24.0 | $0.147 |
| **All** | 1 | 100% | 100% | 0% | 0% | – | 0 | 13% | 8% | 24.0 | $0.147 |

## What went wrong, per run

- **ops-supervisor-report** run 1: missing items: manual_process; gates: data_report got go (want go); manual_process got none (want dont_build); 1 items, want at least 2

## Not run

- Claude as interviewer: no ANTHROPIC_API_KEY was set, so the parity comparison covers Azure OpenAI only.


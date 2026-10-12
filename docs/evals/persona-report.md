# Persona eval report

Run 2026-10-12. Interviewer: gpt-4.1-mini (the real turn loop, same prompt and checks as the web app). Simulated user: gpt-4.1-mini, which sees each persona's situation and voice but never its expected outcome.

Rates are across runs. Completed means the user confirmed the reflect-back within 30 turns. Gates are scored only for completed runs. Checks covers each persona's extra expectations (modifiers, AI overlay, quadrant, unknown critical areas). Retried means the model's first attempt at a turn was rejected by the app's checks; failed means nothing from that turn could be saved.

| Persona | Runs | Completed | Routed | Items | Gates | Checks | Ungrounded quotes | Retried turns | Failed turns | Avg turns | Avg cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ops-supervisor-report | 3 | 67% | 100% | 67% | 100% | – | 0 | 10% | 0% | 10.3 | $0.054 |
| orders-not-integrating | 3 | 100% | 100% | 100% | 100% | 100% | 0 | 7% | 4% | 15.0 | $0.079 |
| invoice-matching-clerk | 3 | 100% | 100% | 100% | 100% | 100% | 0 | 0% | 0% | 10.0 | $0.050 |
| ai-sops | 3 | 100% | 100% | 100% | 100% | 100% | 0 | 3% | 0% | 10.3 | $0.050 |
| where-could-ai-help | 3 | 100% | 100% | 100% | 100% | – | 0 | 8% | 0% | 12.7 | $0.067 |
| vague-impatient | 3 | 100% | 100% | 100% | 100% | 67% | 0 | 9% | 0% | 11.7 | $0.056 |
| **All** | 18 | 94% | 100% | 94% | 100% | 92% | 0 | 6% | 1% | 11.7 | $0.059 |

## What went wrong, per run

- **ops-supervisor-report** run 1: didn't complete; interviewer: Azure OpenAI didn't answer within 60s.; missing items: manual_process; 1 items, want at least 2
- **vague-impatient** run 1: only 1 critical areas unknown

## Not run

- Claude as interviewer: no ANTHROPIC_API_KEY was set, so the parity comparison covers Azure OpenAI only.


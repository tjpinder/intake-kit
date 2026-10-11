# Persona eval report

Run 2026-10-11. Interviewer: gpt-4.1-mini (the real turn loop, same prompt and checks as the web app). Simulated user: gpt-4.1-mini, which sees each persona's situation and voice but never its expected outcome.

Rates are across runs. Completed means the user confirmed the reflect-back within 30 turns. Gates are scored only for completed runs. Checks covers each persona's extra expectations (modifiers, AI overlay, quadrant, unknown critical areas). Retried means the model's first attempt at a turn was rejected by the app's checks; failed means nothing from that turn could be saved.

| Persona | Runs | Completed | Routed | Items | Gates | Checks | Ungrounded quotes | Retried turns | Failed turns | Avg turns | Avg cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ops-supervisor-report | 3 | 67% | 100% | 0% | 0% | – | 0 | 12% | 2% | 22.0 | $0.127 |
| orders-not-integrating | 3 | 100% | 100% | 100% | 100% | 0% | 0 | 14% | 2% | 19.7 | $0.115 |
| invoice-matching-clerk | 3 | 67% | 100% | 100% | 100% | 50% | 0 | 13% | 0% | 12.7 | $0.068 |
| ai-sops | 3 | 100% | 100% | 100% | 100% | 100% | 0 | 23% | 5% | 20.7 | $0.143 |
| where-could-ai-help | 3 | 33% | 100% | 33% | 100% | – | 0 | 16% | 5% | 27.7 | $0.168 |
| vague-impatient | 3 | 100% | 100% | 100% | 100% | 100% | 0 | 10% | 0% | 17.3 | $0.087 |
| **All** | 18 | 78% | 100% | 72% | 86% | 64% | 0 | 15% | 3% | 20.0 | $0.118 |

## What went wrong, per run

- **ops-supervisor-report** run 1: missing items: manual_process; gates: data_report got gather_more (want go); manual_process got none (want dont_build); 1 items, want at least 2
- **ops-supervisor-report** run 2: didn't complete; missing items: manual_process; 1 items, want at least 2
- **ops-supervisor-report** run 3: missing items: manual_process; gates: data_report got gather_more (want go); manual_process got none (want dont_build); 1 items, want at least 2
- **orders-not-integrating** run 1: modifiers: has [], want [integration]
- **orders-not-integrating** run 2: modifiers: has [], want [integration]
- **orders-not-integrating** run 3: modifiers: has [], want [integration]
- **invoice-matching-clerk** run 1: quadrant: none
- **invoice-matching-clerk** run 3: didn't complete; interviewer: Azure OpenAI returned 500: {"error":{"message":"Internal server error","code":null,"status":500}}
- **where-could-ai-help** run 1: didn't complete
- **where-could-ai-help** run 2: 1 items, want at least 3
- **where-could-ai-help** run 3: didn't complete; 2 items, want at least 3

## Not run

- Claude as interviewer: no ANTHROPIC_API_KEY was set, so the parity comparison covers Azure OpenAI only.


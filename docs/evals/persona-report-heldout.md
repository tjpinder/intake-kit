# Persona eval report

Run 2026-10-14 on commit 42a2e1c. Interviewer: gpt-4.1 (interview engine v2: code runs the interview; the model classifies and phrases, as in the web app). Simulated user: gpt-4.1-mini, which sees each persona's situation and voice but never its expected outcome.

Rates are across runs. Completed means the user confirmed the reflect-back within 30 turns. Gates are scored only for completed runs. Checks covers each persona's extra expectations (modifiers, AI overlay, quadrant, unknown critical areas, items that mustn't appear, areas the interviewer must record, band picks). Captured answers are the user's replies stored word for word because the interviewer didn't record them; they never count as scoring evidence. Retried means the model's first attempt at a turn was rejected by the app's checks; failed means nothing from that turn could be saved.

| Persona | Runs | Completed | Routed | Items | Gates | Checks | Ungrounded quotes | Captured answers (avg) | Retried turns | Failed turns | Avg turns | Avg cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| orders-not-integrating | 1 | 100% | 100% | 100% | 100% | 0% | 0 | 0.0 | 0% | 0% | 14.0 | $0.100 |
| invoice-matching-clerk | 1 | 100% | 100% | 100% | 100% | 100% | 0 | 0.0 | 0% | 0% | 12.0 | $0.085 |
| ai-sops | 1 | 100% | 100% | 100% | 100% | 100% | 0 | 0.0 | 0% | 0% | 17.0 | $0.091 |
| where-could-ai-help | 1 | 100% | 100% | 0% | 100% | – | 0 | 0.0 | 0% | 0% | 9.0 | $0.078 |
| vague-impatient | 1 | 100% | 100% | 100% | 100% | 100% | 0 | 0.0 | 0% | 0% | 7.0 | $0.035 |
| **All** | 5 | 100% | 100% | 80% | 100% | 75% | 0 | 0.0 | 0% | 0% | 11.8 | $0.078 |

## What went wrong, per run

- **orders-not-integrating** run 1: modifiers: has [], want [integration]
- **where-could-ai-help** run 1: 1 items, want at least 3

## Not run

- Claude as interviewer: no ANTHROPIC_API_KEY was set, so the parity comparison covers Azure OpenAI only.


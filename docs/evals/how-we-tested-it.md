# How we tested it

intake-kit claims it turns a vague request into a build-ready spec without making anything up. This page shows the evidence: what failed, what we changed, and the numbers, each tied to a commit. All test data is synthetic: the personas, the worked example's sources and every recorded model answer.

## The rules every run is held to

- **Zero invented quotes.** Every quote stored as someone's answer must be a span of what they actually said or wrote. Code checks this; a quote that isn't there is dropped, and an answer with no quote isn't recorded.
- **No loops.** An interview always ends: a turn budget in live mode, the interviewer's decision in async mode.
- **The summary always renders.**
- **Gates match ground truth** on the personas in at least 5 of 6 runs, and every run is tied to a commit hash.
- **Don't build needs evidence.** Missing information means Gather more, never Don't build.

## 1. The first live test failed (Oct 13)

The first web version let the model run the conversation. A live intake on a real request failed in every way that matters:
- answers were heard but not recorded
- the same area was asked again and again
- an item was invented from a hypothetical
- the summary never rendered

**Diagnosis from the transcript.** Every failure traced to a decision the model owned:

| Failure | Decision the model owned |
| --- | --- |
| Answers heard but not recorded (up to 75% of turns on gpt-4.1-mini, about 50% of first attempts on gpt-4.1) | Recording |
| Outcome asked four or more times | Which area it was asking |
| Answers filed under the wrong area | Where an answer belongs |
| An item invented from a hypothetical; the real follow-on item never created | Creating items |
| Summary proposed before constraints were asked | When the interview is done |
| "I've shared the summary" with nothing rendered | Producing the summary |

## 2. The inversion: code runs the interview (v2)

Every fix that moved a decision into code held, so v2 moved all of them. Code decides what to ask, when to probe, when an answer counts, when to create an item and when the interview is done. The model does four narrow jobs, each a small structured call that code checks:
- classify the opening
- phrase the one question code chose
- classify one reply
- write up bands and prose at the end

## 3. The v2 gates (Oct 14)

The tuning personas were 1 (ops supervisor, a report) and 7 (an enablement kit), three runs each, with the interviewer on gpt-4.1 and the simulated user on gpt-4.1-mini.

| Gate | Commit | Gates matched | Invented quotes | What missed |
| --- | --- | --- | --- | --- |
| First | `0754e4c` | **0 of 6** | 0 | Summary looped; persona 7 always misrouted; a manual-work "yes" read as no; an existing tool forced Don't build |
| Second, after one fix round | `89cde19` | **4 of 6** | 0 | Persona 1: one "yes" confirmed every Don't-build question; a report's decision contradicted |
| Second, extract on mini only | `89cde19` | 5 of 6 | 0 | Measurement only, at about three-quarters of the cost |

The second gate missed the 5-of-6 bar, so we took the spec's fallback: the Claude Code plugin became the primary way to use it, and the web app stayed sample-only.

## 4. A second live test, then a different way to collect answers

A live web test of v2 on the enablement request (gpt-4.1, 15 turns) got the type, quadrant and gate right, with zero invented quotes and no loops. It also exposed gaps, all now fixed with tests:
- the gate's reasons didn't list every unmet Go requirement
- the discovery brief had no open questions
- re-rendering appended duplicate criteria
- the designated checks didn't run for known ideas
- the decision card promised a brief that was empty

It also showed the real problem. The person running an intake usually isn't the person who knows the answers, and relaying a live chat puts them in the middle of every turn. So **async intake** became the primary mode:
1. Send a question packet.
2. Paste back the reply, meeting notes or call transcript.
3. Code reads it against every area, flags conflicts, and writes a round-2 packet with only what's still open.

Reading a document and saying which areas it answers is classification, the job models do most reliably.

## 5. Async: smoke tests on a real model

The same three synthetic sources ran through ingest on gpt-4.1, four rounds, about $0.03 each:
1. an email reply
2. the interviewer's call notes (which disagree on a deadline)
3. a follow-up

| Round | Commit | Found | Fixed |
| --- | --- | --- | --- |
| 1 | `59fe232` | gpt-4.1 filled 8 of 8 expected areas (mini 6 of 8, missing the decision); a false conflict; a hedged definition confirmed; a term split in two | conflict rule; hedged definitions stay drafts; refinements update the same term |
| 2 | `c6a81c3` | notes answers dropped (wrong item ID); a definition lost its base | answers land on the item the area belongs to; drafts shown to the model |
| 3 | `70cd651` | conflict flagged and settled correctly; **notes alone confirmed answers** | the source rule (below) |
| 4 | `b2d6672` | source rule working; gates reported | source tracking fix |

Ingest stays on gpt-4.1: mini missed the anchor area for a report.

**The source rule.** The interviewer's notes are a paraphrase. An answer resting only on notes stays assumed, and a definition from notes stays a draft, until the stakeholder confirms it in their own words. The follow-up packet asks them to.

## 6. Regression runs before the merge

| Run | Mode | Commit | Result | Invented quotes |
| --- | --- | --- | --- | --- |
| Persona 7 (email, notes) | async | `3e7de4b` | 1 of 2: the simulated requester invented a baseline the persona doesn't have | 0 |
| Persona 7, after tightening the simulated requester | async | `52e84c3` | **2 of 2** | 0 |
| Held-out personas 2–6 | live | `42a2e1c` | **5 of 5** gates; persona 5's single item is a [known limitation](persona-report-heldout.md#known-limitations-not-passes), not a pass | 0 |
| Held-out personas 2–6, on the commit deployed when live web intakes reopened (Oct 15) | live | `5666667` | **5 of 5** gates, all completed | 0 |

Reports: [async-report-p7.md](async-report-p7.md), [persona-report-heldout.md](persona-report-heldout.md). Full findings for that round: [2026-10-14-findings.md](2026-10-14-findings.md).

## 7. The recorded worked example

[`examples/async-example`](../../examples/async-example/) is one async intake, recorded once on gpt-4.1 (commit `d9144fe`) and replayed through the plugin's CLI with no model. It covers:
- the 6am vs 7am conflict and how it's settled
- the kit refusing to guess "short pick" until the owner defines it
- the final Go and Don't-build gates

A test replays it on every run and fails if the output changes.

## Known issues (not fixed, logged)

- **Live mode:** free-text summary corrections can land on the wrong area. Deferred; the fix will use per-line corrections like async.
- **Exploratory intakes** produce one item where three or more are expected, because the existing-asset check creates no items. The design is deferred.
- **Paraphrased values can add a detail** ("ready by 6am **Monday**" for a daily report). Quotes are always exact.
- **Term-finding still flags some loose terms** in notes-only intakes.

Live web intakes reopened on Oct 15, with async screens, after the held-out rerun on the deployed commit.

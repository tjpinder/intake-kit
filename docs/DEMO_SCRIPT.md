# Demo script: async intake (10 minutes)

**The pitch in one line:** paste stakeholder notes → coverage, conflicts and a round-2 packet.

**The two moments that must land:**
- **The 6am conflict.** Two people gave different answers, and the kit asks instead of choosing.
- **"Short pick".** The kit refuses to guess what a business term means, and won't call the work ready until the owner defines it.

Everything below uses the synthetic sources in [`examples/async-demo/sources/`](../examples/async-demo/sources/). Expected output at every step is in [`examples/async-demo/walkthrough.md`](../examples/async-demo/walkthrough.md).

## Before you start

- Claude Code, with the plugin loaded: `claude --plugin-dir <path to intake-kit>`, or installed from the marketplace.
- A scratch folder to run it in, opened in Claude Code.
- The three sources open in an editor, ready to copy:
  - `1-reply-sam.txt` (Sam's email)
  - `2-notes-tom.txt` (your notes from a call with Priya, the DC manager)
  - `3-reply-sam-round2.txt` (Sam's answer to the round-2 packet)
- **The fallback, ready in a second terminal:** `node scripts/replay-async-demo.mjs` in the intake-kit folder. It replays the whole recorded run with no model calls (see [If something goes wrong](#if-something-goes-wrong)).

## 0:00–1:00: why it's built this way

Say, roughly:

> "The first version let the model run the interview. In the first live test it heard answers and didn't record them, asked the same question four times, invented an item from a hypothetical, and never showed a summary. Every one of those was a decision the model owned. So version two flipped it: code decides what to ask, what counts as an answer, and when you're done. The model only reads and classifies. Then we hit the real problem: the person running an intake usually isn't the person with the answers. Relaying a live chat puts you in the middle of every turn. So now you send a question packet, paste back whatever comes back, and the kit does the reading."

Show nothing yet, or [How we tested it](evals/how-we-tested-it.md) with the gate table (0 of 6, then 4 of 6, then the switch).

## 1:00–2:00: triage and the packet

Run `/intake-kit:collect`. Give it:
- **Request:** "A daily short-pick report per picker so the shift leads can target retraining"
- **From:** Sam (ops supervisor)
- **Type:** data report
- **Title:** "Daily short-pick report"

Open `.intake-kit/packet.md`. Point out:
- The questions come from the kit's framework, in the order code would ask them. Nothing is improvised.
- Each question says why it matters and gives a short example.
- *"If you don't know, say so. That's a useful answer."*

## 2:00–4:00: paste Sam's email

Paste `1-reply-sam.txt` and say it's a reply. Show the readiness line: **8 of 9 required answered**.

Point out:
- **Quotes.** Every answer is quoted from the email. Open `intake-answers.yaml` and show one quote and its source ID, if there's time.
- **Over pick.** Sam's definition is recorded in his words, as **not visible in the data** ("the system never sees it").
- **Short pick, hedged.** "I think wrong-location scans count too but I'm not totally sure." The kit keeps that as a draft, not a definition.
- **Manual work.** Sam builds a sheet by hand every Monday, so the kit opened a second item for it.

## 4:00–5:30: paste your notes (**the 6am conflict**)

Paste `2-notes-tom.txt` and say they're your notes from a call with Priya.

Show the round-2 packet. Linger on question 1:

> *"We have two different answers here: 'Report must be ready by 7am Monday.' and 'Report must be ready by 6am Monday.'. Which is right?"*

Say: "Sam said 7am. Priya said 6am. A model left alone would pick one, probably the latest. The kit keeps both and asks."

Then point out the source rule on question 6: *"Our notes define 'short pick' as … Is that right? Please say … in your own words."* Your notes are your paraphrase, so they can't confirm anything. Only Sam or Priya can.

(If asked about "Monday": it's the model's one-line paraphrase drifting, since the report is daily. It's a known issue, and the quotes underneath are exact.)

## 5:30–7:00: sign off now (**the refusal to guess**)

Say: "Suppose I'm in a hurry and sign off now." Run the summary, then sign off.

> **Daily short-pick report: Gather more**
> - "short pick" has no confirmed definition

Open `DEFINITIONS.md`:

> *"The owner hasn't defined it yet. Don't interpret it: ask."*

Say: "This is the over-pick lesson. A report built on someone's guess at what a short pick is runs fine and is wrong. So no confirmed definition, no Go. And it says Gather more, not Don't build: missing information is never a reason to kill something."

> To show this and then carry on, use the replay's early branch (`output/early/` in the demo folder). Signing off in your live session ends that intake.

## 7:00–8:30: paste Sam's round-2 reply

Paste `3-reply-sam-round2.txt`. Point out:
- **6am is settled**, in Sam's words ("Priya's right, it has to be there by 6am").
- **"Short pick" is now confirmed** by its owner, with a worked example (order 88: task 5, confirmed 4, so 1 short pick).
- **The Monday sheet** now has its walkthrough and volume.

Run the summary and sign off. The kit asks about the one Don't-build reason on its own: *the Monday sheet goes away once the report exists. Is that right?* Confirm it.

> **Daily short-pick report: Go**
> **Sam builds the report manually in Excel…: Don't build** (superseded by the report)

## 8:30–9:30: the spec pack

Render, then open:
- **`DEFINITIONS.md`:** each term in the owner's words, who gave it, whether it can be seen in the data.
- **`SOW_DRAFT.md`:** scope, out of scope, assumptions, acceptance, risks; price, timeline and legal terms left as `[To be completed]`.
- **`CLAUDE.md`:** the builder is told to put the owner's definition next to any SQL or rule that uses a term.

## 9:30–10:00: close

> "Paste what people actually said. The kit shows what's covered, what conflicts and what's missing, and it won't guess. The numbers are on the How we tested it page, every run tied to a commit."

## If something goes wrong

A live run calls a real model, so wording can differ from the walkthrough. Usually that's fine: point at what the kit did, not the exact words.

- **The conflict isn't flagged,** or lands under a different question: show question 1 of the round-2 packet in `walkthrough.md`, and say the live model filed it differently this time.
- **A call fails three times** ("nothing from this source was recorded"): say so. That's the rule: a source is recorded whole or not at all. Then switch to the fallback.
- **Anything else:** switch to the fallback.

**Fallback (no model, no keys, no network):** in the intake-kit folder, run `node scripts/replay-async-demo.mjs`. It runs every step from the recorded answers in seconds. Then walk through [`walkthrough.md`](../examples/async-demo/walkthrough.md) and open the files in `output/early/` and `output/final/`.

## Shot list: 60–90 second recording

| # | Seconds | Shot | On screen / voice-over |
|---|---|---|---|
| 1 | 0–8 | Title card | "Paste stakeholder notes → coverage, conflicts and a round-2 packet." |
| 2 | 8–18 | The packet open in the editor | "Send the questions. Get back whatever you get back." |
| 3 | 18–30 | Paste Sam's email; the readiness line | "Eight of nine answered, every one quoted in his words." |
| 4 | 30–45 | Paste the notes; zoom on the 7am / 6am question | "Sam said 7. Priya said 6. It asks, it doesn't pick." |
| 5 | 45–60 | Sign off early; zoom on *"short pick" has no confirmed definition*, then DEFINITIONS.md | "It won't guess what your words mean." |
| 6 | 60–75 | Paste the round-2 reply; Go and Don't build | "One more reply, and it's ready to build." |
| 7 | 75–90 | The spec pack file list; How we tested it | "The spec, the definitions and a SOW draft. Tested, with the numbers." |

Record from the replay output, or a live run checked against the walkthrough, so the words on screen match the committed demo.

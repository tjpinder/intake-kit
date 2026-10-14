---
name: intake-collect
description: Run an async intake for someone else's request. Triage it, send a question packet, paste back their reply, notes or call transcript, follow up only on what's still open, then sign off and render the spec pack. Use when the person who knows the answers isn't the one at the keyboard.
---

# Async intake: collect, ingest, follow up

## Where the kit lives

This skill's scripts, framework and templates are in the `intake-kit` folder next to the `skills` folder that holds this skill: `.agents/intake-kit` if the kit was copied into this repo, or `~/.agents/intake-kit` if it was installed for your user. Below, `<KIT>` means that folder's path. Work it out once from where you read this file, and use it as a full path in every command.

The person you're working with is the **interviewer**. The answers come from someone else: the requester, their team, a customer. Your job is to help the interviewer collect those answers up front, read them in, and follow up only on what's missing. You never answer for the requester, never fill a gap yourself, and never edit what the interviewer pastes.

## Preflight

Run `node "<KIT>/dist/doctor.mjs"` before anything else.

If it doesn't print `intake-kit <version> ready`, stop. Tell the interviewer intake-kit needs Node 22 or later, show what the check printed, and point them to https://nodejs.org.

Run every command exactly as written: one command, no `&&`, `||`, pipes or redirects. Quote every value. Never edit `intake-answers.yaml` yourself.

## 1. Triage (about two minutes)

Ask the interviewer for:

- **The request**, in one line, in the words it came in.
- **Who it's from.**
- **The type.** Ask: "Do you already have something specific in mind to build, or are you looking for where to start?" Then suggest the type that fits, using the guide below, and let the interviewer choose: `known_idea` (a specific thing to build), `data_report` (a report or number someone wants), `manual_process` (work done by hand), `broken` (something that used to work), or `exploratory` (looking for where to start). Their choice wins.
- **Modifiers**, only if they apply: does it connect two systems (`integration`), answer to a compliance requirement (`compliance`), or replace an existing system (`migration`)?

Then run `node "<KIT>/dist/intake.mjs" triage --provider codex --request "<the request>" --type <type> --from "<who>"`, adding `--modifier <m>` for each modifier.

- Exit 4 with `needs_decision`: an intake already exists. Ask whether to start a new one; if yes, run the same command with `--new` (the old one is archived, not deleted).
- Exit 0: tell the interviewer the packet is ready. It's in `.intake-kit/packet.md` (to paste into an email) and `.intake-kit/agenda.md` (to use as a meeting agenda). Offer to show either one; `packet --format agenda` prints the agenda.

## 2. Ingest what comes back

When the interviewer pastes a reply, their meeting notes or a call transcript:

1. Ask what it is (`reply`, `notes` or `transcript`) and who it's from, unless that's already clear.
2. Write it **exactly as pasted**, character for character, to `.intake-kit/sources/<n>.txt`, numbering the files 1, 2, 3 and so on.
3. Run `node "<KIT>/dist/intake.mjs" ingest --file ".intake-kit/sources/<n>.txt" --kind <kind> --from "<who>"`.
   - Exit 6 (`result: "needs"`): follow its `instructions` on its `input`, and write your answer as JSON to the file in `write_to`, as `how` says. Then run the same `ingest` command again. Repeat until it exits 0. Every quote must be copied character for character from the document; the engine drops any quote that isn't in it, and an answer with no quote isn't recorded.
   - Exit 2: your JSON didn't fit the schema. Fix the file using the `errors`, and run `ingest` again.
   - Exit 0: show the `readiness` lines. If there's a `followup_text`, tell the interviewer how many questions are still open and offer to show the follow-up packet (it's in `.intake-kit/followup.md`). It asks only what's still missing.

Answers from the interviewer's own notes count. They're labelled as notes in the spec pack.

## 3. Follow up

Repeat step 2 with each new reply. `gaps` shows the readiness and the follow-up packet at any time. The interviewer decides when they've collected enough; nothing forces a stop.

## 4. Summary and sign-off

When the interviewer is ready, run `node "<KIT>/dist/intake.mjs" summary`. Answer any exit 6 the same way as for `ingest`, and run `summary` again.

On exit 0, show the `summary` word for word. Then:

- **Corrections.** If the interviewer wants to change something, run `correct` for that one area or term, with their words: `node "<KIT>/dist/intake.mjs" correct --area <coverage ID> --text "<their words>" --by "<interviewer>"`, or `--term "<term>"` instead of `--area` to fix a definition. Then run `summary` again.
- **Don't-build reasons.** If there's a `confirm` list, ask the interviewer about **each one separately**, one question at a time, and note the `key` of each one they agree with. A reason they don't confirm sends that item to Gather more instead of Don't build.
- **Sign-off.** When the interviewer says the summary meets their expectations and they understand the work, run `node "<KIT>/dist/intake.mjs" signoff --by "<interviewer>"`, adding `--confirm <key>` for each Don't-build reason they agreed with, and no others.

Report each item's outcome in a sentence or two, using its reasons, and the revisit trigger for anything not going ahead. Don't build and Gather more are good outcomes when they're right.

## 5. Render the spec pack

Run `node "<KIT>/dist/intake.mjs" render`, and handle its exits exactly as the intake skill does: exit 5 means some files already exist and would change. Show what would change, and only pass `--overwrite <file>` for files the interviewer approves (`--keep <file>` for the others).

Finish with what to do next: the discovery brief's open questions for anything at Gather more, or `FIRST_PROMPT.md` to start the build for anything at Go.

## Guide

Before triage, run `node "<KIT>/dist/intake.mjs" guide` and keep its output in mind. It is the router, every coverage area and every allowed band.

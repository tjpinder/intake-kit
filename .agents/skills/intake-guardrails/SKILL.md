---
name: intake-guardrails
description: Set up intake-kit's guardrail checks after an intake. Chooses flagged paths with the user, writes .intake-kit/checks.json, adds the CI workflow and updates GUARDRAILS.md.
---

# Set up guardrails

## Where the kit lives

This skill's scripts, framework and templates are in the `intake-kit` folder next to the `skills` folder that holds this skill: `.agents/intake-kit` if the kit was copied into this repo, or `~/.agents/intake-kit` if it was installed for your user. Below, `<KIT>` means that folder's path. Work it out once from where you read this file, and use it as a full path in every command.

The guardrails come from what the user said in the intake. This command turns them into checks CI enforces. It never invents rules the intake didn't support.

## Preflight

Run `node "<KIT>/dist/doctor.mjs"` before anything else.

If it doesn't print `intake-kit <version> ready`, stop. Tell the user intake-kit needs Node 22 or later, show what the check printed, and point them to https://nodejs.org.

Run commands exactly as written: one command, no `&&`, `||`, pipes or redirects.

## Steps

1. Read `GUARDRAILS.md`, `SPEC.md` and `intake-answers.yaml`. If `intake-answers.yaml` doesn't exist or its reflect-back isn't confirmed, tell the user to run `$intake` first and stop.
2. **Propose flagged paths.** These are the parts of the repo where a change needs a human review before merging. Base them only on what the intake recorded: sensitive data (`core.data`), compliance requirements and reviewers (`mod.compliance.*`), customer-facing output, and the review points and data rules in `GUARDRAILS.md`. Look at the repo's actual folders. If there's no code yet, propose paths for where that code will clearly live and say they're provisional. Keep the list short, and give one line of reason per path, citing what the user said. If nothing in the intake calls for review, say so and propose none.
3. **Ask the user** to confirm, edit or drop each path, and whether the review label should be `needs-review` (the default). If an item uses an LLM (the AI overlay applied), also ask what command runs its evals and where the eval set lives (default `evals/`). Don't make one up; if they don't have one yet, leave it unset and tell them CI will fail the eval gate until they do.
4. **Write the setup** with the confirmed answers, one `--flag` per path:
   `node "<KIT>/dist/check.mjs" init --flag "src/pricing/**" --flag "templates/customer/**"`
   Add `--label <name>` or `--eval-command "<command>"` only if the user gave them.
   - Exit 0: it wrote `.intake-kit/checks.json`, copied the checks into `.intake-kit/check.mjs` and added `.github/workflows/intake-kit.yml`.
   - Exit 4 with `needs_confirmation`: the workflow file already exists and differs. Show the user, and rerun with `--overwrite-workflow` only if they agree.
   - Exit 4 otherwise: tell the user what the message says.
5. **Update GUARDRAILS.md** so it lists the flagged paths and CI checks: run `node "<KIT>/dist/intake.mjs" render`. Files nobody has edited are refreshed automatically, and files the user already chose to keep stay as they are. If it exits 5, some file was edited by hand: show the diff and ask, then run `render` with `--overwrite <file>` for each approval and `--keep <file>` for each file they want left alone. Proposed versions are staged in `.intake-kit/render/`, which git ignores.
6. **Tell the user** which files to commit (the `commit` list from step 4, plus `GUARDRAILS.md`), that every pull request now runs the checks and a failure blocks the merge, and that a pull request touching a flagged path needs the review label. Suggest running `$intake-audit` now to see where things stand.

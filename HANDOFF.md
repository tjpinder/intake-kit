# Intake Kit — Claude Code Handoff Spec

> Repo copy of the handoff spec. Build decisions updated Oct 10, 2026 after pre-build review (see "Build decisions").

Oct 10, 2026 · @Tom

## Purpose

Build an open, installable Claude Code plugin that turns a plain-language intake interview into a build-ready spec pack, with guardrails derived from the intake applied from the first commit. Working name: **intake-kit** (repo at `E:\Development\intake-kit`, public at github.com/tjpinder/intake-kit, MIT).

It serves two uses with one codebase:

- **Daily use:** run `/intake` at the start of any build and get a spec, acceptance criteria and guardrails instead of a blank CLAUDE.md.
- **Live demos:** someone describes a messy problem, the intake turns it into a spec, and the guardrails show how the build stays honest.

The headline is "turn a vague ops request into a build-ready spec in 30 minutes." The guardrails are generated from what the user said, so they're specific to each problem.

This is not SaaS. No accounts, billing, database or stored sessions. A free web UI is in scope (below); a product is not.

## Scope and non-goals

The kit is self-contained: no runtime, package or CLI dependency on any outside framework. Its guardrail design draws on the Integrity Framework (TIF), credited in the docs, but no TIF code, rule text or CLI is required or called.

**In scope**

- A Claude Code plugin with three commands: `/intake`, `/guardrails`, `/audit` (invoked as `/intake-kit:intake` etc.; see Build decisions)
- The intake skill: router, type modules, scoring and gates
- Spec pack templates and the rendering step
- Light guardrail hooks (reminders); CI stays the hard gate
- One worked example, a README and a demo script
- Optional web UI, no fixed timeline: chat on the left, live coverage sidebar on the right, review screen with gates and a spec pack download. Hosted on Azure Static Web Apps or Cloudflare Pages, with a small function proxying the API key. Supports two providers behind one adapter interface: Claude API and Azure OpenAI, chosen by config. Each adapter maps the same turn contract (structured coverage updates as JSON) to its provider's structured-output feature. Prompts live in one place. Both providers run the same eval transcripts before release. Bring-your-own-key covers both (Azure needs endpoint, deployment name, key and API version). Scoring and gates stay deterministic code, identical across providers. Same router, module and scoring YAML as the plugin. Hard monthly spend cap, rate and session limits, bring-your-own-key option, nothing stored server-side.
- Works in Claude Code and OpenAI Codex from one source. The intake is written as a standard `SKILL.md` skill, which both tools load: packaged as a Claude Code plugin, and mirrored to `.agents/skills/` with an `AGENTS.md` for Codex. Claude Code hooks are optional extras; the CI workflow is the guardrail gate for both.

**Non-goals for v1**

- Accounts, auth, billing, database, stored sessions
- Any dependency on TIF or the integrity CLI, including an optional adapter (can be revisited later)
- Tool-specific forks of the framework (one skill source serves every agent)
- Anything private: no product source from the portfolio, no secrets, no former-employer data or schemas

## Repo structure

The repo is a standard Claude Code plugin plus templates and one example. Claude Code should check the current plugin manifest format against the official docs before scaffolding, since the layout may have changed.

```
intake-kit/
├── .claude-plugin/plugin.json
├── .claude-plugin/marketplace.json  # makes the repo installable in one command
├── .agents/skills/        # Codex mirror of the intake skill
├── AGENTS.md              # Codex entry point
├── skills/
│   ├── guardrails/SKILL.md  # /guardrails — GUARDRAILS.md, check config, CI workflow
│   ├── audit/SKILL.md     # /audit — runs the kit's own checks
│   ├── intake/SKILL.md    # conversation behavior + probe discipline
│   ├── intake/router.yaml # entry-type signals, modifiers, probes
│   ├── intake/modules/    # core.yaml, one file per type and modifier
│   ├── intake/scoring.yaml    # criteria, weights, AI overlay, gates
│   └── spec-pack/SKILL.md # renders items into files
├── scripts/               # apply-turn, render, check, hooks (TypeScript; yaml + ajv bundled, nothing to install)
├── hooks/hooks.json       # reminder hooks only
├── templates/             # SPEC, ACCEPTANCE, CLAUDE, GUARDRAILS, FIRST_PROMPT, DECISIONS, briefs
├── examples/pick-exception-report/
├── schema/                # session + turn JSON Schemas
├── tests/                 # unit, golden, grounding, persona evals
├── docs/                  # framework site (GitHub Pages) + DEMO_SCRIPT.md
├── README.md
└── LICENSE                # MIT
```

| Component | Does | Triggered by |
| --- | --- | --- |
| `/intake` | Runs the guided conversation, writes `intake-answers.yaml` through `apply-turn`, then renders the spec pack | User |
| `/guardrails` | Writes GUARDRAILS.md, `.intake-kit/checks.json` and a CI workflow, all generated from the intake | User, after intake |
| `/audit` | Runs the kit's own checks and writes `audits/intake-kit-audit.md` | User or end-of-session hook |
| Hooks | Remind when editing paths the intake flagged; run checks at session end as a reminder | Claude Code events |

## Discovery framework: the router

The intake is a guided conversation, not a form. A router classifies the opening statement into one of five entry types, adds any modifiers, and pulls in that type's coverage module. The shared core applies to every type. Scoring follows the published UiPath and Blue Prism criteria; the go/no-go language follows NIST's AI RMF.

| Type | Opening signals | One probe if confidence is low | Output |
| --- | --- | --- | --- |
| 1. Broken | "isn't working," "stopped," "errors," a system name plus a failure verb | "Did this used to work? When did you first notice?" | Diagnostic brief |
| 2. Manual process | "by hand," "every morning I," "copy/paste," "takes hours" | "Walk me through the last time, start to finish." | Process map + ranked candidates |
| 3. Known idea | "Can we automate X," "could AI do," a named solution | "What happens today when X gets done?" | Feasibility read + spec |
| 4. Exploratory | "Where could AI help," no specific process | "What work does nobody value but someone has to do?" | Ranked opportunity backlog |
| 5. Data / report | "I need a report of," "how many," a metric noun | "What will you do differently when you see this number?" | Metric spec, or pointer to an existing asset |

**Modifiers** attach to any type and switch on extra coverage:

- **Integration** ("sync," "feed," "EDI," "API"): systems on each side, trigger, payload format, error handling, owner of each end.
- **Compliance / audit** ("audit," "regulator," "customer requirement"): requirement source, evidence, retention, reviewer. Sets risk tier to high.
- **Migration** ("moving from X to Y"): parity definition, reconciliation, cutover, rollback. Large migrations route to Gather more discovery.

**Router rules**

1. Record `type`, `confidence` (high / med / low) and the triggering quote.
2. Reclassify when two or more new signals point elsewhere, or the user's story contradicts the label. A "report request" whose real pain is a nightly manual reconciliation becomes a Manual process item. Shared-core answers carry over.
3. Each distinct pain becomes its own item with its own type. Exploratory sessions produce several items by design.
4. A stated solution is a hypothesis. Idea-first openings always walk back to current behavior before scoring.
5. Log every reclassification in DECISIONS.md.

## Shared core and probe discipline

Six coverage areas apply to every item. Each is marked `covered`, `assumed` or `unknown`. A probe fires only if the area is still uncovered after the user's story.

| Area (coverage ID) | Must capture | Probes |
| --- | --- | --- |
| `users` | Who does the work, who uses the output, who owns the process, who signs off | "Who touches this, first person to last?" · "Who can say yes to changing it?" |
| `outcome` | Baseline, target, how it's measured, what we won't claim | "How do you know today whether it went well?" · "What number would tell you this worked?" · "What's it costing now, in hours, errors or chargebacks?" |
| `data` | Sources, system of record, how structured, quality issues, sensitivity, real examples | "Where does that live, and which copy do you trust?" · "Show me one real example." · "Any customer, employee, pricing or personal data in it?" |
| `systems` | Apps touched, access method, changes expected in 6 months | "Which screens or systems do you open?" · "Any upgrades planned in the next six months?" |
| `constraints` | Policy, compliance, SLAs, timing windows, approvals | "Is anyone outside your team requiring this?" · "When does it have to be done each day?" |
| `trust` | Cost of a wrong output, who catches errors, required review, fallback | "When this goes wrong today, who catches it?" · "Worst outcome if an automated version got one wrong?" · "Would you approve its output, or let it act alone?" · "If it stopped working, what would you do?" |

**Probe discipline** (written into the skill as testable behavior)

- Ask only for gaps. Follow the user's thread first.
- Probe a vague answer once by anchoring it to the past: "usually" or "would" becomes "tell me about the last time."
- Still vague after one probe: record it as `assumed` in the user's own words, or `unknown`. Never answer for the user.
- Blameless framing for anything involving mistakes. People hide details when they expect blame.
- End with a reflect-back the user confirms or corrects before anything is scored or written.

## Type modules

Each module adds coverage areas on top of the shared core. Probes are examples of phrasing; the agent adapts them to the conversation.

**1. Broken → diagnostic brief** (ITIL problem management, blameless postmortems, branching 5 Whys)

- `symptom`: "What exactly do you see: an error, missing records, wrong numbers? All orders or some?"
- `timeline`: "When did it last work? Did anything change then: a release, a new customer, a setting, a person?"
- `impact`: "How many orders or hours a day? Any SLA or chargeback impact?"
- `workaround`: "What are you doing in the meantime?" Always asked; the workaround is often the real manual-process item.
- `cause`: ask "why" repeatedly, branching when an answer has more than one cause. Stop at a process or system condition, never at "someone made a mistake."
- `recurrence`: "Has this happened before? Is it written down anywhere?"

**2. Manual process → process map + ranked candidates** (SIPOC, contextual inquiry)

- `walkthrough`: "Walk me through the last time, step by step: which screen, what you typed, what you checked."
- `boundary`: "What kicks it off, what's the finished output, and who gets it?"
- `volume`: "How often, how many each time, how long each? Any peaks?"
- `variation`: "Is it done the same way every time? What cases make you stop and think?"
- `rules`: "How do you decide that? Could you write the rule down?"
- `documentation`: "Is there an SOP? Could we get last month's real examples?"

Each step gets tagged rule-based, judgment, data entry, lookup or handoff. Each automatable segment becomes a scored candidate.

**3. Known idea → feasibility read + spec** (Mom Test, jobs-to-be-done)

- `current`: "What happens today when this gets done? Walk me through the last time."
- `push`: "What's the worst part of how it's done now?"
- `pull`: "If it worked perfectly, what would be different on a normal Tuesday?"
- `adoption`: "What would make you not trust it? What would people keep doing the old way?"
- `prior`: "Has anyone tried to solve this before? What happened?"
- `existing`: "Does your WMS, ERP or BI tool already do something close to this?" Always asked.

**4. Exploratory → ranked opportunity backlog** (OpenAI's opportunity zones, impact/effort)

- `zones`: "What's repetitive work nobody values? Where do you wait on another team's skills? Where do people get stuck not knowing what to do next?"
- `instances`: "Give me the most recent example of each."
- `value`: "Roughly how much time or money does that cost a week?"
- Each concrete instance spawns its own item, with a light pass on the shared core. Items a user could handle with an off-the-shelf assistant go on a self-serve list instead of the build backlog.

**5. Data / report → metric spec or existing-asset pointer**

- `decision`: "What will you do differently when you see this?" Always asked. No decision means don't build.
- `definition`: "How exactly do you count a pick exception? What's in and what's out?"
- `grain`: "Per order, line, picker, shift or zone? Over what window?"
- `truth`: "Which system's number do you trust when they disagree?"
- `delivery`: "How fresh does it need to be, and where do you want to see it?"
- `existing`: "Is there a report today that's close? What's wrong with it?" Always asked.

The module bank lives in `skills/intake/modules/*.yaml`, one file per type and one per modifier. Each entry holds `id`, `must_capture`, `probes`, `followup_conditions` and `feeds` (target file, section and guardrail layer).

## Scoring and decision gates

Every candidate item gets two composite scores, an AI overlay if the solution uses an LLM, and exactly one gate. The criteria are adapted from UiPath Automation Hub and Blue Prism's Process Assessment Tool. Label the weights as adapted, since UiPath doesn't publish its feasibility cutoff.

**Suitability criteria (1–5 each)**

| Criterion | 1 | 3 | 5 |
| --- | --- | --- | --- |
| Rule clarity | Pure judgment | Mixed | Rules can be written down |
| Input digital | Paper or phone | Partly | Fully digital |
| Input structured | Under 40% | 40–80% | 80% or more |
| Ways it's done | 8 or more | 2–7 | One |
| Stable for 6 months | Major change coming | Some | None |
| Documentation and test data | None | Partial | SOP plus real examples |
| Steps and apps | Over 100 steps, many apps | 20–100 | Under 20, 1–2 apps |
| Access | No UI or API access, remote desktop only | UI only | API or direct DB read |
| Value | Trivial | Moderate | High |

- **Automation potential** = mean of rule clarity, input digital, input structured, ways it's done.
- **Ease** = mean of stability, documentation, steps and apps, access.
- Plot both on Blue Prism's quadrant. Rescale each composite with (mean − 1) / 4 and use UiPath's bands: 65% and up is high (a mean of 3.6 or more), under 35% is low (a mean under 2.4). Prioritize = both high. Defer = both low, or one low and the other not high. Review = everything else, including medium/medium. Thresholds live in `scoring.yaml`.

**AI overlay**

Low rule clarity or low structure sinks a process for rule-based automation, but that's exactly where an LLM can help. So when an item flips from Defer to AI candidate, it must pass all six checks:

| Check | Passes when | Basis |
| --- | --- | --- |
| Eval-ability | Real labeled examples can be gathered from users, and a correct answer can be judged | OpenAI FDE eval-driven development |
| Error cost | Cost of a wrong output is documented and within stated tolerance | NIST AI RMF MAP 3.2, 1.5 |
| Human review | A review point is defined (approve, sample, exceptions only), or autonomy is justified | NIST MAP 3.5 |
| Simpler option ruled out | SQL, config, a fixed rule or a single LLM call won't do it | Anthropic "simplest solution"; NIST MANAGE 2.1 |
| Fallback and kill | Manual fallback exists; shutdown criteria stated | NIST AI 600-1 |
| Sensitive data | Classified, with access and egress limits known | NIST AI 600-1 |

For Known idea and Exploratory items, also rate adoption from the user's words: push and pull versus anxiety and habit. Weak push with strong habit goes in DECISIONS.md as an adoption risk.

**Gates**

| Gate | Requires | Produces |
| --- | --- | --- |
| Go | `outcome`, `data`, owner and error cost all covered or confirmed-assumed; a measurable success metric with baseline; Prioritize, or Review with a written mitigation; AI overlay passes (if AI); confirmed reflect-back | Full spec pack |
| Gather more discovery | A critical area is `unknown`; major change expected in 6 months; Review with no mitigation; migration modifier | Discovery brief: open questions, who can answer each, artifact needed |
| Don't build | Defer quadrant; trivial value; no decision depends on it; an existing report or feature covers it; superseded by another Go item in the same session; AI overlay fails eval-ability or error cost | DECISIONS.md entry with rationale and a revisit trigger |
| Fix, not build | Broken item with a config, data or vendor cause; a training gap; a workaround acceptable as permanent | Diagnostic brief, fix ticket text, known-error note |

Scoring rules live in `skills/intake/scoring.yaml`, so weights can be tuned without changing skill logic.

## Spec pack output

The intake writes seven files into the target repo. Every line in SPEC and ACCEPTANCE cites the coverage area and the user quote it came from, such as `[core.outcome]`, so any requirement traces back to what someone actually said.

| File | Contents | Built from |
| --- | --- | --- |
| `intake-answers.yaml` | Items with type, confidence, coverage status per area, user quotes, scores and gate | Whole conversation |
| `SPEC.md` | Problem, users, current state, success metric, MVP, out of scope, data, open questions | Shared core + type module |
| `ACCEPTANCE.md` | Testable criteria in Given/When/Then form, including error cases | `outcome`, `trust` |
| `CLAUDE.md` | Stack, commands, never-do list, pointers to SPEC and GUARDRAILS | `systems`, `constraints` |
| `GUARDRAILS.md` | Generated from the intake: kill criteria, manual fallback, required review points, data handling rules, and which checks CI enforces | `trust`, `data`, modifiers |
| `DECISIONS.md` | Gate decision and rationale, reclassifications, confirmed assumptions | Router + gates |
| `FIRST_PROMPT.md` | Opening Claude Code session prompt: plan first, build the smallest slice, write tests from ACCEPTANCE | SPEC + ACCEPTANCE |

Only items that reach **Go** get the full pack. Other gates produce their own output instead: a discovery brief, a diagnostic brief, or a DECISIONS.md entry.

## Data contract

Two schemas govern everything: the **session file** (`intake-answers.yaml`, the source of truth every output is built from) and the **turn contract** (what the LLM returns each turn). Both ship as JSON Schema in `schema/`, versioned, and CI validates every example against them.

**Design rules**

1. **The LLM never writes `scoring` or `gate`.** It writes coverage and router fields only. Scoring and gates are computed by code from `scoring.yaml`, so the same answers always give the same gate on any provider.
2. **Coverage IDs are namespaced:** `core.users`, `data_report.definition`, `mod.integration.payload`. Every SPEC and ACCEPTANCE citation uses these IDs.
3. **Shared core is captured once per session.** An item overrides a core area only when its answer differs, such as one item touching sensitive data and another not.
4. **Status rules are enforced by the schema:** `covered` needs a value and at least one quote; `assumed` needs a quote and appears in DECISIONS.md; `unknown` has a null value; `probe_count` maxes at 1.
5. **Every scoring criterion cites its evidence**, as the coverage IDs it was derived from.

**Session file: `intake-answers.yaml`**

```yaml
schema_version: 1
framework_version: 0.1.0        # version of router/module/scoring YAML used
session:
  id: 2026-10-10-7f3a
  started_at: 2026-10-10T14:02:00-04:00
  mode: stakeholder              # stakeholder | builder
  provider: claude               # claude | azure-openai | openai
  reflect_back:
    text: "You spend most of Monday morning building..."
    confirmed: true
    corrections: []
core:
  users:
    status: covered              # covered | assumed | unknown | not_applicable
    value: "Ops supervisor builds it; shift leads use it"
    quotes: ["I build it, the shift leads use it Tuesday"]
    probe_count: 1
    updated_at: 2026-10-10T14:06:00-04:00
  outcome: { status: assumed, value: "Get Monday morning back", quotes: ["it eats my whole morning"], probe_count: 1 }
  data: { ... }
  systems: { ... }
  constraints: { ... }
  trust: { ... }
items:
  - id: item-1
    title: Weekly pick-exception report
    type: data_report            # broken | manual_process | known_idea | exploratory | data_report
    confidence: med              # high | med | low
    trigger_quote: "I need a report of short picks by shift and picker"
    modifiers: []                # integration | compliance | migration
    spawned_from: null           # item id, for items split off another
    superseded_by: null          # item id that will replace this one, set by the router
    type_history:
      - { from: null, to: data_report, reason: opening, quote: "...", at: ... }
    core_overrides: {}           # same shape as core.*, only where this item differs
    coverage:
      data_report.definition: { status: covered, value: "...", quotes: ["..."], probe_count: 0 }
      data_report.truth: { status: unknown, value: null, quotes: [], probe_count: 1 }
    scoring:                     # written by code only
      criteria:
        rule_clarity: { score: 5, evidence: [data_report.definition] }
        input_digital: { score: 5, evidence: [core.data] }
      automation_potential: 4.5
      ease: 4.0
      quadrant: prioritize       # prioritize | review | defer
      ai_overlay:
        applies: false
        checks: {}               # eval_ability, error_cost, human_review, simpler_option, fallback, sensitive_data: pass | fail | unknown
      adoption: null             # { push, pull, anxiety, habit: low | med | high } for known_idea / exploratory
    gate:                        # written by code only
      decision: go               # go | gather_more | dont_build | fix_not_build
      reasons: ["Prioritize quadrant", "all critical areas covered or confirmed"]
      revisit_trigger: null
      rules_version: 0.1.0
    open_questions:
      - { area: core.outcome, question: "How many hours back counts as a win?", who_can_answer: "Ops supervisor", artifact_needed: null }
```

**Turn contract (LLM output, every turn)**

```json
{
  "reply": "Got it. When you count a short pick, what's in and what's out?",
  "updates": [
    {
      "item": "item-1",
      "area": "data_report.grain",
      "status": "covered",
      "value": "Per picker, per shift, weekly",
      "quote": "filter by shift and count by picker"
    }
  ],
  "router": {
    "new_items": [ { "id": "item-2", "type": "manual_process", "confidence": "med", "trigger_quote": "I build it in Excel every Monday", "spawned_from": "item-1" } ],
    "reclassify": null,
    "supersede": null
  },
  "next_target": { "item": "item-1", "area": "data_report.definition" },
  "ready_for_reflect_back": false
}
```

Code, not the model, applies `updates` to the session file. It rejects any update that breaks a status rule: a `covered` area with no quote, or a second probe on the same area. Rejections are logged and the turn is retried once. Each provider adapter maps this contract to its own structured-output feature.

Rendering rules: if a file already exists, show a diff and ask before overwriting. Open questions stay visible at the top of SPEC until answered.

## Guardrails and audit

The kit generates guardrails from the intake and enforces them with its own bundled Node script, `scripts/check`, with nothing to install. Nothing outside the repo is required. Because each check is driven by what the user said, the guardrails fit the specific problem rather than a fixed rulebook.

| Check | Fails when | Driven by |
| --- | --- | --- |
| Traceability | A SPEC or ACCEPTANCE line has no coverage ID, or cites one that doesn't exist or is `unknown` | Coverage IDs |
| Eval gate | The AI overlay applied, but there's no eval set in `evals/`, or the eval run fails | `scoring.ai_overlay` |
| Kill criteria and fallback | GUARDRAILS.md is missing kill criteria or a manual fallback | `core.trust` |
| Flagged paths | A PR touches a path the intake flagged (sensitive data, customer-facing output) without the `needs-review` label | `core.data`, compliance modifier |
| Open assumptions | An `assumed` answer has no owner in DECISIONS.md | Status rules |

**Enforcement**

- **CI blocks the merge** on any failing check.
- **Hooks only remind.** They flag edits to flagged paths and run the checks at session end, ignoring the exit code.
- `/guardrails` writes `.intake-kit/checks.json`, listing which checks apply and which paths are flagged, so the checks are config, not code changes.
- A skipped or errored check is reported as skipped. The kit never shows a pass it didn't get.

**Credit:** the layering here (warn before the build, block at merge, human review on flagged paths) is adapted from the Integrity Framework (TIF). That's a design influence only; there's no dependency.

## Worked example: pick-exception report

The README example is a warehouse problem, run end to end, because it shows WMS depth and SQL strength in a way a to-do app can't.

**Scenario:** a DC operations supervisor wants a daily view of pick exceptions (short picks, location mismatches) by shift and picker, to target retraining instead of guessing.

**Data rules**

- Synthetic data only, generated by a seed script.
- A generic WMS-style schema written from scratch. Nothing modeled on a vendor's proprietary schema or a former employer's data.

**Contents of `examples/pick-exception-report/`**

1. `intake-answers.yaml`: a filled interview in stakeholder mode, with at least one `unknown` to show how open questions are handled.
2. `spec-pack/`: the seven rendered files.
3. `build/`: SQL Server in Docker, seed script, T-SQL views, and a small script that renders the report as HTML.
4. `audit-report.md`: the real `/audit` output. If the audit is clean, say so. Never stage a finding to make the demo look better.

The example session should produce two items: the pick-exception report reaching **Go** (type 5, data/report), and a second item (the Monday Excel build) that ends as **Don't build** because it's superseded by item 1, which reaches Go. Showing both gates is the point.

## Docs site

**Canonical page:** `docs/` in the repo, rendered with GitHub Pages. It holds the framework, scoring, gates and sources. The framework lives next to the code so the two never drift apart. TIF gets a credit line on the guardrails page as a design influence, nothing more.

## Build decisions

Resolved after Claude Code's pre-build review on Oct 10, 2026. Where these conflict with an earlier section, these win.

**Scoring**

1. Add an **Access** criterion (1 = no UI or API access, remote desktop only; 3 = UI only; 5 = API or direct DB read). Ease = mean of stability, documentation, steps and apps, access.
2. **Value** is not in either composite. It feeds the gates only: user-stated trivial value means Don't build.
3. "High" on a 1–5 composite means (mean − 1) / 4 ≥ 0.65, which is a mean of **3.6 or more**, mapped from UiPath's Easy band. "Low" is a mean under 2.4 (below UiPath's 35% band). Prioritize = both high. Defer = both low, or one low and the other not high. Review = everything else, including medium/medium, which needs a written mitigation to reach Go. All thresholds live in scoring.yaml.

**Gate precedence** (first match wins)

1. Fix, not build
2. Don't build, only for definitive reasons: an existing asset covers it, it's superseded by another item in the same session that reaches Go, no decision depends on it, or user-stated trivial value. Supersession is recorded by the router (`supersede: { item, by, quote }` in the turn contract, `superseded_by` on the item) and confirmed in the reflect-back. Code gates the superseding item first and applies this reason only if that item actually reaches Go; otherwise the superseded item is gated on its own merits.
3. Gather more discovery, including any Defer quadrant scored while a critical area is `unknown`
4. Don't build, for a Defer quadrant with no critical unknowns, or an AI overlay failure
5. Go

**Turn enforcement in the plugin**

Inside Claude Code there's no provider adapter, because Claude is the model. The skill must call `scripts/apply-turn` each turn with the turn JSON. That script runs the same validation as the web UI and is the only writer of `intake-answers.yaml`.

**Deterministic rendering**

Code fills the spec pack templates from the session file. The model writes only prose fields (reflect-back, problem statement, open question wording), and those are captured into the session file before rendering. Golden-file tests depend on this.

**Provider-neutral turn schema**

The turn schema is designed for Azure OpenAI strict structured output from the start: every property required, `additionalProperties: false`, nullable fields as type unions, no dynamic keys. Updates to shared-core areas use "item": null. One schema serves both providers. The session file can keep dynamic keys, because the model never writes it directly.

**Grounding normalization**

Before matching, normalize only curly to straight quotes, en and em dashes to hyphens, the ellipsis character to three dots, runs of whitespace to one space, and letter case to lowercase. A quote must then match a contiguous span of a single **user** turn. Anything else, including quoting the assistant's own words, fails as a fabrication.

**Guardrail enforcement (decoupled from TIF, Oct 10)**

The kit has no dependency on TIF or `@startvest/integrity-cli`. Its checks are its own bundled Node script, `scripts/check`, run by `/audit`, by the session-end hook (exit code ignored; a reminder only) and by CI (blocking). The npm question is moot. TIF is credited in the docs as a design influence. An optional TIF adapter is out of scope for v1.

**Codex packaging**

Codex isn't installed on the build machine. Build the `.agents/skills/` mirror and `AGENTS.md`, but mark the Codex check unverified until it's tested on a machine with Codex. (Built in step 8; see "Codex packaging decisions" below.)

**Decisions added after the second review (Oct 10)**

- **Plugin format (checked against code.claude.com docs, Oct 10):** the three commands are skills (`skills/<name>/SKILL.md`), as the docs recommend for new plugins. Plugin skills are namespaced, so they're invoked as `/intake-kit:intake`, `/intake-kit:guardrails`, `/intake-kit:audit`. A bare `/intake` works only if nothing else claims the name. The repo ships `.claude-plugin/marketplace.json`, and installs with `claude plugin install intake-kit --marketplace tjpinder/intake-kit`. That one-liner needs Claude Code 2.1.292 or later (confirmed in the 2.1.296 help text: `--marketplace` adds the marketplace first if it isn't already added). The README also gives the two-step form (`/plugin marketplace add tjpinder/intake-kit`, then `/plugin install intake-kit@intake-kit`) for older versions. The install criterion is verified on a clean machine once the repo is public.
- **Dependencies and Node:** source is TypeScript. esbuild bundles it, with `yaml` and `ajv`, into self-contained plain `.mjs` files in `dist/`, committed so users install and build nothing. Runtime requirement is Node >= 22 (Node 20 is end-of-life). Claude Code's native installer doesn't include Node, so Node is listed first in the README prerequisites. Every script checks `process.versions.node` and exits with "intake-kit needs Node 22 or later" if it's too old. If Node is missing entirely, no script can run: the intake skill's first step runs `node --version` and stops with install instructions, and hook failures show as visible non-blocking errors, never silent passes.
- **Guardrails file:** `GUARDRAILS.md` replaces `INTEGRITY.md` everywhere. TIF appears only in the docs credit.
- **Grounding in the plugin:** a `UserPromptSubmit` hook appends the user's exact prompt to `<repo>/.intake-kit/transcript.jsonl` (gitignored), only while an intake is active (marker file `.intake-kit/active`). `apply-turn` checks every quote against that file. Codex also supports hooks, including `UserPromptSubmit` with `prompt` and `cwd`, and its plugins can bundle a `hooks/hooks.json` (per learn.chatgpt.com/docs/hooks, checked Oct 10). The Codex package ships the same transcript hook. Codex requires the user to review and trust plugin hooks, and the payload format hasn't been tested, so grounding under Codex is marked untested until it runs on a machine with Codex.
- **Session-end reminder:** `SessionEnd` has a 1.5 s default budget and its output isn't seen. The hook runs `check` async and writes `.intake-kit/last-audit.json`. A `SessionStart` hook shows a one-line summary of any failures next session.
- **Gate fall-through:** an item that matches none of gates 1-4 but doesn't meet Go goes to Gather more, with the unmet Go requirements as its reasons. Nothing is scored before the reflect-back is confirmed.
- **Traceability:** lines in SPEC's Open questions section may cite `unknown` areas. Everywhere else they fail.
- **Eval gate:** `checks.json` holds `eval_command`. If the AI overlay applies and there's no command or no `evals/` set, the check fails. It never skips.
- **Flagged paths:** `/guardrails` proposes globs from the intake, and the user confirms them before they're written.
- **Web UI:** built after the plugin is complete, with Azure OpenAI as the default provider and Claude as the alternative. Azure deployment details and the spend cap are decided then.
- **Persona evals:** need Azure details for parity. Until then the harness runs on Claude only, and the parity report says Azure wasn't run.

**Data contract decisions (step 1, Oct 10)**

- **Scoring inputs are band picks, not numbers.** For each criterion, AI overlay check, adoption force and gate fact, the model picks a band name from the criteria table (for example `rule_clarity: written | mixed | judgment`, `ways_done: one | 2-7 | 8+`) and cites coverage IDs and a user quote. `scoring.yaml` maps bands to scores; code computes composites, quadrant and gate. Band picks appear in the reflect-back for the user to confirm or correct. The turn schema has no field that can carry a score or gate.
- **Gate facts** the model reports as bands: `existing_asset`, `decision_depends`, `broken_cause`, `workaround_permanent`. Mitigation text for Review items is a prose field.
- **Turn contract changes from the earlier example:** adds `facts`, `prose`, `open_questions`, `router.add_modifiers`, `router.supersede`, and `title` on new items; `reflect_back` (null, or `{text, status: proposed | confirmed | corrected, corrections}`) replaces `ready_for_reflect_back`; `next_target.is_probe` lets apply-turn enforce one probe per area.
- **Two validation layers.** `schema/turn.schema.json` stays inside the strict structured-output subset (a test enforces this). Rules the subset can't express (ID formats, band names, grounding, probe limits) are enforced by apply-turn. `schema/session.schema.json` uses full JSON Schema 2020-12, including the status rules.
- `session.provider` also allows `codex`.

**Framework config decisions (step 2, Oct 10)**

- **Module entries** hold `id`, `must_capture`, `probes`, `critical`, `followup_conditions` (`when` / `ask`, optional `spawns`), `feeds` (file and section) and optional `always_ask`, `stop_at` and `guardrail`. `guardrail` names one of the kit's own checks (traceability, eval_gate, kill_criteria, flagged_paths, open_assumptions), replacing the TIF layer field.
- **`templates/sections.yaml`** lists every output file and its sections. Every `feeds` entry must point at one, and each template (step 6) must render all of them.
- **Critical areas** for Go: `core.users`, `core.outcome`, `core.data`, `core.trust`, plus any module area marked `critical: true` for that item's type.
- **Unknown bands.** Every criterion has an `unknown` band that scores null. A composite needs at least `min_known_per_composite` (3) known criteria, otherwise it's null and the item goes to Gather more.
- **`success_metric` gate fact** (`measurable_with_baseline | measurable_no_baseline | vague | unknown`) carries Go's "measurable success metric with baseline" requirement.
- **AI rescue of Defer.** A Defer item whose solution uses an LLM and passes every AI overlay check is an AI candidate and can reach Go. Failing eval-ability or error cost is a Don't build at precedence step 4; any unknown check, or a failure of another check, is Gather more at step 3, so it wins when both apply.
- **Gate precedence is fixed** in the scoring schema. Reordering it is a code change, not a tuning change.
- **The loader validates all config at load time** and lists every problem, including cross-file ones: unique namespaced IDs, router and module agreement, feeds pointing at real sections, and fact names agreeing across `scoring.yaml` and both schemas. Config is read at runtime, not bundled, so tuning `scoring.yaml` needs no rebuild.

**Scoring and gate behaviour (step 3, Oct 10)**

- **Nothing is scored or gated until the reflect-back is confirmed.** Before that, `scoreAndGate` returns the session unchanged.
- **Composites** are weighted means of the known criteria, rounded to 2 places. Levels compare (mean − 1) / 4, rounded to 6 places, with the thresholds, so a mean of exactly 3.6 is high.
- **Reasons.** A gate lists the winning rule's reasons first, then every other rule that matched as `(also matched <decision>) <reason>`. A fall-through Gather more lists the unmet Go requirements.
- **Revisit triggers** are generated for every Don't build, one clause per reason that matched.
- **Supersession.** The replacing item is gated first, whatever the item order. Items in a supersession cycle ignore supersession and are gated on their own merits. A `superseded_by` naming a missing item is an error.

**apply-turn and transcript decisions (step 4, Oct 10)**

- **Files in the target repo.** `intake-answers.yaml` sits at the repo root and is meant to be committed. Local state lives in `.intake-kit/`, which gets its own `.gitignore` so only `checks.json` is ever committed: transcript, marker, run state, turn file, rejection log and archive stay local.
- **How the skill passes a turn.** The model writes the turn JSON to `.intake-kit/turn.json` with its file tool, then runs `node dist/intake.mjs apply-turn`. No JSON goes through the shell, so it works the same in bash and PowerShell 5.1.
- **All or nothing.** A turn is saved whole or not at all. Exit 2 means rejected; fix and retry once. A second rejection in a row exits 3: nothing from that turn is saved, the model says its reply and carries on, and re-captures the answers later. Every rejection is logged to `.intake-kit/rejections.jsonl`.
- **Recording.** The prompt hook starts recording on the prompt that invokes the intake command (`/intake-kit:intake` or `/intake`), so the opening statement is captured. If no intake is active, it first archives any old transcript. Recording stops when the reflect-back is confirmed. The hook never blocks a prompt; on failure it exits 1, which shows a visible, non-blocking error.
- **Reflect-back.** Proposing records `proposed_at`. Confirming or correcting needs a user message recorded after that time, so the model can't confirm its own reflect-back. Once confirmed, the session is scored and gated, and the intake accepts no more turns.
- **Probes** are only allowed on an area that has already been answered (it has `updated_at`), and only once.
- **Starting over never deletes.** `start` with an intake already in the file asks the user to resume (`--resume`) or start over (`--new`). `--new` moves the old session file and the earlier part of the transcript into `.intake-kit/archive/`.
- **`session.grounding`** is `transcript` (quotes checked) or `unverified` (no transcript, e.g. Codex without the hook; quotes aren't checked and the session says so).
- **Bundling.** Each bundled script defines `require` via `createRequire`, because `yaml` and `ajv` are CommonJS. The CLI tests run the built `dist/` scripts, and `npm test` builds first.

**Intake skill decisions (step 5, Oct 11)**

- **The skill carries no framework content.** `intake.mjs guide` generates the router, every coverage area and every allowed band from the YAML, and is injected when the skill starts. After every applied turn, `apply-turn` returns a `status` block (unasked areas, critical gaps, always-ask pending, probes available, missing facts, `ready_for_reflect_back`), so the model plans the next question from code, not memory. `intake.mjs status` returns the same on demand.
- **Permissions.** The skill's `allowed-tools` cover `node <plugin>/dist/intake.mjs` in both Bash and PowerShell, quoted and unquoted, plus `Edit(./.intake-kit/turn.json)`. A live headless run needed no permission prompts.
- **Rules added after live testing:** covered means everything the area must capture is answered; today's manual workaround is its own `manual_process` item (with `supersede` when the new thing replaces it); a probe records the vague answer in the same turn; bands must match the guide's wording, taking the lower band when torn; every band pick is said plainly in the reflect-back; never mention files, turns or rejections to the user; a checklist before every `apply-turn`.
- **Session file** is written without YAML anchors or aliases.
- **Rendering** isn't built yet (step 6). After gating, the skill reports each item's outcome and stops.

**Rendering decisions (step 6, Oct 11)**

- **Model drafts, code checks and renders, for acceptance and guardrails too.** The turn gains `acceptance` (`criterion` or `error_case`, in Given/When/Then form) and `guardrails` (`kill_criterion`, `fallback`, `review_point`, `data_rule`). Each cites the coverage IDs it rests on, and `apply-turn` rejects any whose evidence has no answer in the user's words. Code attaches the quotes when rendering. This replaced rendering one trust answer three times under Kill criteria, Fallback and Review points, which hid the fact that no kill criterion had been stated.
- **`core.trust`** now also captures, and probes for, what would make the user switch it off.
- **Readiness** for the reflect-back needs at least one criterion, one error case, one kill criterion and one fallback for every item that could be built (not superseded, not exploratory). Superseded items need no band picks.
- **Citation rule.** Every bullet in SPEC.md and ACCEPTANCE.md ends with `[coverage.id] "the user's words"` (several joined by ` · `). Open-question bullets cite the area only. Interviewer-written summaries render as blockquotes, never bullets. Tests check every citation against the session's recorded quotes.
- **Placement.** Module `feeds` decide which section each answer lands in. Templates in `templates/` hold all fixed wording; a test checks their `{{section:…}}` placeholders match `sections.yaml` both ways.
- **Which files.** Go items get SPEC, ACCEPTANCE, CLAUDE, GUARDRAILS and FIRST_PROMPT. Every intake gets DECISIONS. Gather-more items get DISCOVERY_BRIEF, broken items DIAGNOSTIC_BRIEF, manual-process items PROCESS_MAP, and exploratory sessions BACKLOG. With several Go items, each gets its own subsection.
- **Open questions** list the model's questions, plus "Still unknown" for answered-unknown areas and "Not yet asked" for unasked critical areas.
- **Assumptions** render in DECISIONS.md with `Owner: _unassigned_`, so the open-assumptions check (step 7) fails until someone owns each one.
- **Never overwrite unasked.** `render` writes new files and skips identical ones (CRLF-only differences count as identical). A file that exists and would change is staged in `.intake-kit/render/` with a line diff, and the command exits 5. Only `render --overwrite <file>` replaces it, and the skill asks the user first. Verified live: a hand-written CLAUDE.md was shown, kept on "no", and left byte-for-byte unchanged.
- **Golden files** for the worked example live in `tests/golden/pick-exception/`. After an intended change, regenerate them with `npm run golden:update` and review the diff before committing.

**Guardrail checks decisions (step 7, Oct 11)**

- **CI gets a vendored copy.** `/guardrails` (`check.mjs init`) copies the bundled checks to `.intake-kit/check.mjs` in the target repo, alongside `checks.json`, and adds `.github/workflows/intake-kit.yml`, which runs `node .intake-kit/check.mjs run --ci --report`. CI needs nothing from the plugin and no network, and is pinned to the kit version that generated it. The cost is a roughly 300 KB file in the repo. The checks read only `intake-answers.yaml`, the rendered files and `checks.json`, never the framework YAML.
- **Results** are pass, fail, skipped (with the reason), error or off. Fail and error block; skipped and off never count as passes. A broken `checks.json` errors every check.
- **Check details.** Traceability re-verifies every citation against the session, so hand edits that break it are caught. The eval gate runs `eval_command` from /audit and CI only, never from session hooks. Flagged paths read labels from the GitHub event and changed files from `git diff base...head`; outside a pull request the check is skipped. Open assumptions fail on `Owner: _unassigned_`.
- **Hooks remind, never block.** SessionEnd runs the checks in the background and writes `.intake-kit/last-audit.json`. SessionStart turns any failures into a `systemMessage` and context. PostToolUse on `Edit|Write` reminds when a flagged path is edited. All are silent in repos without an intake.
- **Render ledger.** `.intake-kit/rendered.json` records what intake-kit wrote, or found already matching, for each file. A file still matching is refreshed silently, so `/guardrails` updates an untouched GUARDRAILS.md without asking. `render --keep <file>` records that the user kept their own file over a proposed version; they aren't asked again until the proposed content changes.
- **This repo's CI** (`.github/workflows/ci.yml`) runs the typecheck and all tests, checks `dist/` is committed and current, and dogfoods the checks on the rendered worked example (`scripts/dogfood.mjs`), which Week 2's `examples/` replaces. A hygiene test fails on any reference to TIF or the integrity CLI outside HANDOFF.md and `docs/`, and on common secret formats.

**Codex packaging decisions (step 8, Oct 11)**

- **Checked against the Codex docs (learn.chatgpt.com/docs/build-skills, developers.openai.com/plugins/build/plugins), Oct 11.** Codex reads skills from `.agents/skills/` (repo, walking up to the root) and `~/.agents/skills/`, and only `name` and `description` from frontmatter. Neither page documents path substitution or `!` command injection in skills. Codex plugins can read Claude-style manifests and set `CLAUDE_PLUGIN_ROOT` for hooks, but because the Claude skills depend on substitution and injection, installing the Claude plugin into Codex isn't supported.
- **A self-contained drop-in.** `.agents/intake-kit/` holds `kit.json` (marks the kit root), `dist/`, `framework/` (router, modules, scoring) and `templates/`. Three skills, `$intake`, `$intake-guardrails` and `$intake-audit`, tell the model to find the kit two folders up from the skill and run the Node check and `guide` themselves. Users copy `.agents/` into a repo or `~/.agents/`.
- **Generated, never hand-edited.** `scripts/build-codex.mjs` (run by `npm run build`) rewrites the Claude skills. Every rewrite must match exactly, so a skill edit that breaks one fails the build. A test checks the committed `.agents/` matches a fresh build byte for byte, and another runs a full intake, render and check from a copied `.agents/` with nothing from the plugin around.
- **Grounding in Codex** defaults to `--grounding unverified`, recorded in the session file. `.agents/intake-kit/codex-hooks.example.json` is an optional `.codex/hooks.json` entry for the prompt hook, which recognises `$intake` as well as `/intake`. Untested in Codex.
- **Version stamping.** `doctor.mjs` and `check.mjs` report the version stamped in at build time. That fixed a crash the standalone-kit test found: `doctor.mjs` used to read `.claude-plugin/plugin.json`, which the Codex kit doesn't have.
- **Status: untested in Codex.** Before relying on it, run `$intake` once in a real Codex session and record the result here.

**Web UI decisions (Oct 11)**

- **Built next**, ahead of dogfooding and Week 2. Hosting: Azure Static Web Apps with its managed Azure Functions API, in the Azure sponsorship subscription. Frontend: React, Vite and TypeScript, under `web/`; the function under `api/`. Default `*.azurestaticapps.net` URL for now.
- **Public from day one.** Azure OpenAI on the kit's key is the default provider; visitors can bring their own Azure OpenAI or Claude key, which is passed through and never stored. Claude is bring-your-own-key only (no Anthropic key on the server). Cloudflare Turnstile (invisible) guards session starts.
- **Caps.** $100 a month, enforced in the function from its own token counts, plus an Azure budget alert at 50% and 90% as a backstop. Default ceiling of 60 turns per session, plus a per-session dollar ceiling set from the model's pricing.
- **"Nothing stored server-side", made precise.** The function keeps only aggregate counters in Azure Table storage: monthly tokens and dollars, and hashed-IP request counts that expire within a day. No conversation text, answers or sessions are stored; they stay in the browser and download as a zip.
- **Same core as the plugin.** Phase 1 split the pure logic from its Node loaders: `buildFramework` takes the YAML as text, `renderAll` takes templates as text, and `src/core.ts` is the browser entry. A test bundles it for the browser platform and replays the worked example through it. Grounding is stronger in the UI than in the plugin, because the transcript is the chat itself.
- **Azure OpenAI pattern** follows an existing production integration: classic Azure OpenAI on an existing resource in the sponsorship subscription, deployment-scoped chat completions with an `api-key` header and API version `2024-10-21`, raw `fetch` with no SDK, and retry on 429 and 503 honouring `Retry-After` (capped at 60 s), otherwise exponential backoff with jitter. Changes for this app: strict `json_schema` structured output (rather than `json_object`), a request timeout, a dedicated deployment so usage and budget are separate, and a budget gate that fails closed (a public endpoint can't fail open). Resource names and keys live in app settings, never in the repo.

**Web API decisions (web phases 2-3, Oct 11)**

- **The server runs the whole turn.** The browser sends the session, the transcript and the replies it showed; the server builds the system prompt itself (from the bundled skill and framework), calls the model, applies the turn and returns the new session. A client-supplied prompt would let anyone use the kit's key as a general-purpose model. Output is constrained to the turn schema, and the browser still uses the core locally for the sidebar and rendering.
- **Providers.** Azure OpenAI by raw `fetch` (deployment `intake-kit-turn`, gpt-4.1-mini, strict `json_schema`, 60 s timeout, retry on 429/503 honouring `Retry-After`). Claude, for bring-your-own-key only, through the official SDK (0.128.0): `output_config.format`, a cached system prompt, effort `medium`, and server-side refusal fallback (`fallbacks: "default"`) on Opus and Sonnet; default model `claude-opus-5-5`. Nullable type arrays are rewritten as `anyOf` for Claude.
- **Limits and their order.** Per hashed IP (60 turns an hour, 300 a day), per session (60 turns), Turnstile once per session, then, for the kit's key only, the monthly ($100), daily ($10) and per-session ($1.50) budgets, each checked against a worst case (two attempts, characters / 3 tokens, full output) before calling. Actual cost is recorded after every call, including a first attempt whose turn later fails. All limits are app settings.
- **Fail closed.** A counter-store failure, a missing IP salt or missing storage refuses the request. Bring-your-own Azure endpoints must be `https://<resource>.openai.azure.com` (or an Azure AI host); anything else is refused so the API can't be used as a proxy. Keys sent by visitors are passed through and never stored, logged or echoed.
- **The server stamps the new user message**, so the reflect-back check never depends on the visitor's clock.
- **Azure wrapper** (`api/`): Functions v4 programming model, ESM, bundled by `scripts/build-api.mjs` into `api/dist/index.js` with the framework YAML and SKILL.md inlined; `@azure/functions-core` stays external (the host provides it). Counters live in Azure Table storage with ETag-based increments. `staticwebapp.config.json` must set `platform.apiRuntime` to `node:22`. App settings: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_MODEL`, `AZURE_STORAGE_CONNECTION_STRING`, `IP_HASH_SALT` (16+ characters), `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY`, and optionally the cap overrides.
- **Not yet run on Azure.** The handler and store are tested in-process; the first deploy (phase 5) is the first time the bundle meets the Functions host.

**Web UI decisions (web phase 4, Oct 11)**

- **Layout.** Chat on the left, live coverage on the right (the same `statusOf` the interviewer sees: each area covered, assumed, unknown or not asked, critical ones starred, plus ratings, acceptance checks and guardrails per item). After the reflect-back is confirmed, a review screen shows each item's gate with its reasons and revisit trigger, and the spec pack as tabs with a one-click zip (`intake-answers.yaml` plus every rendered file). Below 860 px the sidebar stacks under the chat.
- **Offline sample.** "Watch a sample intake" replays the worked example in the browser through the same `applyTurn`, with no API calls or cost; `/?sample` opens straight into it, for demos. A saved sample is never restored on reload, since a replay can't resume half-way; a real unfinished intake is.
- **State stays in the browser.** The intake lives in `localStorage` on the visitor's device; a bring-your-own key lives in `sessionStorage` (this tab only) and is sent in a header with each message. The server stores neither.
- **Errors keep the visitor's words.** A failed turn puts their message back in the box and explains what happened: rate limit (with the wait), budget used up (with a link to use their own key), or a rejected key (with a link to the key settings).
- **Local development.** `npm run dev:web` serves the UI and runs the real API handler in the Vite dev server with in-memory counters. Put `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` in `.env.local` (gitignored) for live interviews locally.
- **Security headers** in `web/public/staticwebapp.config.json`: a CSP limited to the app and Cloudflare Turnstile, no framing, no referrer. The CSP allows `'unsafe-eval'` because ajv compiles its validators at runtime in the browser; precompiling them with ajv's standalone mode would remove that, and is a reasonable follow-up.
- **Verified** in headless Edge at 1400 px and with phone emulation at 390 px (no horizontal overflow), including a bring-your-own-key turn against the real Claude API with an invalid key (401 shown plainly, message restored). Not yet verified: a live interview on the kit's Azure model (needs the deployment), and Turnstile (needs keys).

**Deployment (web phase 5, Oct 11)**

- **Live at https://agreeable-hill-0ede1650f.5.azurestaticapps.net** (Static Web Apps, Free plan). Every push to `main` runs the typecheck and tests, then deploys (`.github/workflows/deploy.yml`, token in the `AZURE_STATIC_WEB_APPS_API_TOKEN` repo secret).
- **Everything is in resource group `rg-intake-kit`** (East US 2) on the Microsoft Azure Sponsorship subscription: the Static Web App `intake-kit`; a dedicated Azure OpenAI resource `intakekit-openai` with deployment `intake-kit-turn` (gpt-4.1-mini 2025-04-14, GlobalStandard, 100K tokens a minute); and storage account `intakekit08c47a` for the counters table. A dedicated OpenAI resource keeps the public app's key separate from other products' keys and lets the budget see only this app's spend.
- **App settings** on the Static Web App: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_MODEL`, `AZURE_STORAGE_CONNECTION_STRING`, `IP_HASH_SALT`. Not yet set: `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (bot protection is off until they are; rate limits and caps still apply).
- **Azure budget** `intake-kit-monthly` on `rg-intake-kit`: $100 a month, alerting at 50% and 90% of actual spend and at a 100% forecast.
- **Verified in production:** page, sample and security headers served; `/api/config` reports the kit model; a real turn ran through the deployed function (classified as broken, one rejected attempt retried, $0.0074, 4.8 s); the counters table recorded exactly that spend, with the visitor only as a hashed IP.
- **Found by the first live call:** stripping the schema's document `title` key removed new items' real `title` property, so Azure rejected the schema. Fixed, with a test that checks every object's `required` list against its properties for both providers.

**Handoff file:** Claude Code copies this spec into the repo as `HANDOFF.md`.

## Testing

Four layers. The first three are deterministic, cheap, and run on every PR. The fourth calls real LLMs, so it runs on demand and before releases, with a spend cap.

| Layer | What it proves | Runs |
| --- | --- | --- |
| Unit | Scoring math, quadrant thresholds, every gate rule, schema validation, the update applier's rejections (covered with no quote, a second probe, the model trying to set a score) | Every PR |
| Golden files | A fixed session file always renders the same spec pack; every SPEC and ACCEPTANCE line cites a real coverage ID | Every PR |
| Grounding | Every quote in a session file appears word for word in the transcript. A quote that isn't there is a fabrication, and the test fails | Every PR, on recorded transcripts |
| Persona evals | Full conversations against a simulated user, per provider | On demand, before release |

**Persona evals**

A second LLM plays the user from a persona card in `tests/personas/`. Each card holds the person's situation, how they talk, and the hidden ground truth: what the right type, items and gate are. Six personas to start:

1. Ops supervisor wanting the pick-exception report: data/report → Go, with a manual-process item spawned and gated Don't build
2. "Orders aren't integrating": broken + integration modifier → Fix, not build (a mapping changed)
3. Clerk doing manual invoice matching: manual process → Prioritize or Review
4. Manager asking "can AI write our SOPs?": known idea → AI overlay applies
5. Director asking "where could AI help us?": exploratory → backlog of several items
6. Vague, impatient user who answers "I don't know" a lot → several areas `unknown`, Gather more discovery, nothing invented

Each run scores: right type routed, type shift caught, items found, correct gate, probe count never over one per area, and zero ungrounded quotes. Results are reported as rates across several runs per persona, not pass/fail on one transcript, because LLM output varies. Every persona runs against Claude and Azure OpenAI, and the parity report goes in `docs/`.

**Dogfood the guardrails:** the repo runs its own checks on itself in CI, so the kit is held to the rules it installs.

## Build plan and handoff

Two weeks, then stop. Add features only when real use shows a gap.

1. **Week 1, the tool:** plugin skeleton, `router, module and scoring YAML`, `/intake`, spec pack rendering, `/guardrails`, `/audit`. Then use it on Tom's next real build.
2. **Week 2, the proof:** the worked example, README, the GitHub Pages docs site, and `docs/DEMO_SCRIPT.md` (a 10-minute live flow plus a recorded fallback). Record a 60–90 second screen capture of the intake producing a spec, for the launch post.

**Acceptance criteria**

- [ ] Installs into a fresh repo with one command on Claude Code 2.1.292+, verified on a clean machine; `/intake-kit:intake`, `/intake-kit:guardrails` and `/intake-kit:audit` appear
- [ ] `/intake` asks one question at a time, fires follow-ups only on their conditions, and ends with a confirmed reflect-back
- [ ] `unknown` answers appear as open questions; nothing is invented
- [ ] All seven spec pack files render, and every SPEC and ACCEPTANCE line cites a coverage ID and user quote
- [ ] `/audit` runs the kit's own checks with no outside dependency; no code, config, dependency or workflow references TIF or the integrity CLI (HANDOFF.md and the docs credit line excepted)
- [ ] A skipped or errored check is reported as such; the kit never shows a pass it didn't get
- [ ] The worked example runs from a clean clone in under 15 minutes on synthetic data
- [ ] No secrets, private product code or former-employer data in the repo

* [ ] Router classifies all five types from sample openings, logs confidence and handles a mid-conversation type shift
* [ ] Each item ends in exactly one gate; non-Go gates produce their brief or DECISIONS.md entry, not a spec pack
* [ ] Changing a weight in `scoring.yaml` changes the score with no skill edits
* [ ] Docs site builds on GitHub Pages and cites every framework source
* [ ] Session and turn JSON Schemas live in schema/; CI validates the example session and turn fixtures; the model's output can never set scoring or gate fields
* [ ] Unit, golden-file and grounding tests pass in CI on every PR; the kit's own checks run on this repo itself
* [ ] Persona eval harness runs the six personas with a spend cap and reports rates per provider

**Open questions**

- None blocking. Repo: github.com/tjpinder/intake-kit
- CI target: GitHub Actions is assumed

**First prompt for Claude Code**

```
Read HANDOFF.md (this spec) in full. We're building intake-kit, an open Claude Code plugin that also packages for Codex.

Rules:
- Self-contained: no dependency on TIF, startvest-integrity-cli or any outside framework. Guardrail checks are the kit's own Node scripts, with yaml and ajv bundled so users install nothing.
- Check the current Claude Code plugin format in the official docs before scaffolding.
- Where the Build decisions section conflicts with an earlier section, Build decisions wins.
- Synthetic data only. No private product code, secrets or former-employer data.

Start with Week 1. First give me a short plan: files to create, in order, and how you'll test each against the acceptance criteria. Wait for my OK, then build the schemas, then the router, module and scoring YAML, then apply-turn and /intake.
```

## Sources

The framework adapts these. The docs site must cite them; weights marked "adapted" are ours, not the vendors'.

- [UiPath Automation Hub: Idea score](https://docs.uipath.com/automation-hub/automation-cloud/latest/user-guide/information-about-the-idea-score)
- [UiPath Automation Hub: Detailed assessment algorithm](https://docs.uipath.com/automation-hub/automation-cloud/latest/user-guide/information-about-the-detailed-assessment-algorithm)
- [UiPath Automation Hub: Agentic AI assessment](https://docs.uipath.com/automation-hub/automation-cloud/latest/user-guide/agentic-ai-assessment)
- [Blue Prism: What is process discovery](https://help.blueprism.com/Operational-Support/Best-Practises/1290288332/What-is-Process-Discovery.htm)
- [Blue Prism PAT: Process assessment](https://documentation.blueprism.com/pat/en-us/user-guide/process-assessment.htm)
- [NIST AI Risk Management Framework (AI 100-1)](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf)
- [NIST Generative AI Profile (AI 600-1)](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [ZenML: OpenAI forward deployed engineering](https://www.zenml.io/llmops-database/forward-deployed-engineering-bringing-enterprise-llm-applications-to-production)
- [ASQ: SIPOC](https://asq.org/quality-resources/sipoc)
- [Google SRE: Postmortem culture](https://sre.google/sre-book/postmortem-culture/)
- [OpenAI: Build skills (Codex)](https://learn.chatgpt.com/docs/build-skills)
- The Mom Test (Rob Fitzpatrick), Contextual Design (Beyer and Holtzblatt), ITIL 4 problem management: cited as methods, no single URL.

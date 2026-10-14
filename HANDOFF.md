# Intake Kit — Claude Code Handoff Spec

Oct 10, 2026 · @Tom

## Status and pivot (Oct 13, 2026)

**Start here.** The v1 interviewer let the model run the conversation, and live testing showed it can't: answers went unrecorded, areas got re-asked, items were invented, and summaries never rendered. The build now pivots to **Interview engine v2**, where code runs the interview and the model only phrases questions and classifies answers. Where anything below conflicts with that section, v2 wins.

- **Production:** sample-only. `LIVE_INTAKE_NOTE` is set, so live intakes are paused and the offline sample still plays. It stays paused until v2 meets the ship bar.
- **Code:** the hotfix for the pause is on `main` (1631b89). The fix branch `fix/live-test-2026-10-13` (44de692) is unmerged and predates the hotfix.
- **Separation:** the kit has no dependency on, and no reference to, any outside guardrail framework. The guardrails file is `GUARDRAILS.md`.
- **Next (Oct 14):** v2 missed its gate and the fallback was taken: the plugin is the primary demo. A live test on the enablement kit led to **Async intake mode** (collect, ingest, follow up), which becomes the default for running an intake on someone else's behalf. Live chat stays for self-intake.

## Purpose

Build an open, installable Claude Code plugin that turns a plain-language intake interview into a build-ready spec pack, with guardrails derived from the intake applied from the first commit. Working name: **intake-kit** (repo at `E:\Development\intake-kit`, public at github.com/tjpinder/intake-kit, MIT).

It serves two audiences with one codebase:

- **Tom, daily:** run `/intake` at the start of any build (PRAPI, JobOps, anything next) and get a spec, acceptance criteria and guardrails instead of a blank CLAUDE.md.
- **Hiring managers, in interviews:** a live demo of AI-enablement and forward-deployed work. Someone describes a messy problem, the intake turns it into a spec, and the guardrails show how the build stays honest.

* **LinkedIn and the public:** positioned as an FDE / AI-enablement / workflow-automation kit. The headline is "turn a vague ops request into a build-ready spec in 30 minutes." The guardrails are generated from what the user said, so they're specific to each problem.

This is not SaaS. No accounts, billing, database or stored sessions. A free web UI is in scope (below); a product is not.

## Scope and non-goals

The kit is self-contained: no runtime, package or CLI dependency on any outside framework, and no reference to one in code or docs. Its guardrail design is its own.

**In scope**

- A Claude Code plugin with three commands: `/intake`, `/`guardrails, /`audit`
- The intake skill: router, type modules, scoring and gates
- Spec pack templates and the rendering step
- Light guardrail hooks (reminders); CI stays the hard gate
- One worked example, a README and a demo script
- Optional web UI, no fixed timeline: chat on the left, live coverage sidebar on the right, review screen with gates and a spec pack download. Hosted on Azure Static Web Apps or Cloudflare Pages, with a small function proxying the API key. Supports two providers behind one adapter interface: Claude API and Azure OpenAI, chosen by config. Each adapter maps the same turn contract (structured coverage updates as JSON) to its provider's structured-output feature. Prompts live in one place. Both providers run the same eval transcripts before release. Bring-your-own-key covers both (Azure needs endpoint, deployment name, key and API version). Scoring and gates stay deterministic code, identical across providers. Same router, module and scoring YAML as the plugin. Hard monthly spend cap, rate and session limits, bring-your-own-key option, nothing stored server-side.
- Works in Claude Code and OpenAI Codex from one source. The intake is written as a standard `SKILL.md` skill, which both tools load: packaged as a Claude Code plugin, and mirrored to `.agents/skills/` with an `AGENTS.md` for Codex. Claude Code hooks are optional extras; the CI workflow is the guardrail gate for both.

**Non-goals for v1**

- Accounts, auth, billing, database, stored sessions
- Any dependency on, adapter for, or reference to an outside guardrail framework or CLI (decided Oct 13: clean separation)
- Tool-specific forks of the framework (one skill source serves every agent)
- Anything private: no product source from the portfolio, no secrets, no former-employer data or schemas

## Repo structure

The repo is a standard Claude Code plugin plus templates and one example. Claude Code should check the current plugin manifest format against the official docs before scaffolding, since the layout may have changed.

```
intake-kit/
├── .claude-plugin/plugin.json
├── .agents/skills/        # Codex mirror of the intake skill
├── AGENTS.md              # Codex entry point
├── commands/
│   ├── intake.md          # /intake — runs the guided conversation
│   ├── guardrails.md      # /guardrails — GUARDRAILS.md, check config, CI workflow
│   └── audit.md           # /audit — runs the kit's own checks
├── skills/
│   ├── intake/SKILL.md    # conversation behavior + probe discipline
│   ├── intake/router.yaml # entry-type signals, modifiers, probes
│   ├── intake/modules/    # core.yaml, one file per type and modifier
│   ├── intake/scoring.yaml    # criteria, weights, AI overlay, gates
│   └── spec-pack/SKILL.md # renders items into files
├── scripts/               # apply-turn, render, check (zero-dependency Node)
├── hooks/hooks.json       # reminder hooks only
├── templates/             # SPEC, ACCEPTANCE, CLAUDE, GUARDRAILS, FIRST_PROMPT, DECISIONS, briefs
├── examples/enablement-kit/
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
| Value | Trivial | Moderate | High |

- **Automation potential** = mean of rule clarity, input digital, input structured, ways it's done.
- **Ease** = mean of stability, documentation, steps and apps, access.
- Plot both on Blue Prism's quadrant: Prioritize (high/high), Review (one high), Defer (low/low). UiPath's bands mark the thresholds: 65% and up easy, 35–65% medium, under 35% difficult.

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
| Don't build | Defer quadrant; trivial value; no decision depends on it; an existing report or feature covers it; AI overlay fails eval-ability or error cost | DECISIONS.md entry with rationale and a revisit trigger |
| Fix, not build | Broken item with a config, data or vendor cause; a training gap; a workaround acceptable as permanent | Diagnostic brief, fix ticket text, known-error note |

Scoring rules live in `skills/intake/scoring.yaml`, so weights can be tuned without changing skill logic.

## Spec pack output

The intake writes seven files into the target repo. Every line in SPEC and ACCEPTANCE cites the coverage area and the user quote it came from, such as `[outcome]`, so any requirement traces back to what someone actually said.

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
    "reclassify": null
  },
  "next_target": { "item": "item-1", "area": "data_report.definition" },
  "ready_for_reflect_back": false
}
```

Code, not the model, applies `updates` to the session file. It rejects any update that breaks a status rule: a `covered` area with no quote, or a second probe on the same area. Rejections are logged and the turn is retried once. Each provider adapter maps this contract to its own structured-output feature.

Rendering rules: if a file already exists, show a diff and ask before overwriting. Open questions stay visible at the top of SPEC until answered.

## Guardrails and audit

The kit generates guardrails from the intake and enforces them with its own zero-dependency Node script, `scripts/check`. Nothing outside the repo is required. Because each check is driven by what the user said, the guardrails fit the specific problem rather than a fixed rulebook.

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

## Worked example: the enablement kit (changed Oct 14, 2026)

The worked example is a real intake, not a staged one: Tom's own next project, the `enablement/` kit in ops-ai-recipes (spec: ENABLEMENT-HANDOFF.md). It replaces the pick-exception report, which was a demo with no user behind it. An example only proves the kit if someone actually needed what came out of it.

**How it's made**

- Tom runs the intake through the Claude Code plugin, the primary path, answering in his own words. Nothing is scripted or edited afterward.
- The spec pack it renders is what the enablement build starts from. Where the intake and ENABLEMENT-HANDOFF.md disagree, the difference is recorded in DECISIONS.md, not quietly reconciled.
- The session contains Tom's real words, so it's committed only after he reviews it.

**Contents of `examples/enablement-kit/`**

1. `intake-answers.yaml`: the session as the engine recorded it, including any `unknown` answers.
2. `spec-pack/`: the rendered files, unedited.
3. `audit-report.md`: the real `/audit` output once the first enablement piece is built. If the audit is clean, say so. Never stage a finding to make the demo look better.
4. A short note on what the gates decided and what happened next.

Whatever the gates decide is the example. A Gather more or Don't build outcome is as valid as Go, and is reported as it came out.

## Publishing and distribution

One canonical framework page, four posts, and PRAPI working the inbound side. Nothing publishes until the repo exists and runs.

**Canonical page:** `docs/` in the repo, rendered with GitHub Pages. It holds the framework, scoring, gates and sources. The framework lives next to the code so the two never drift apart.

**Post series (LinkedIn, each linking to the canonical page)**

1. The framework: why AI projects in ops fail at the ask, and the five entry types.
2. "Don't build" is an outcome: fix-not-build and existing-report cases.
3. The scoring: RPA criteria plus the AI overlay, and why low rule clarity flips a process from skip to AI candidate.
4. The demo: the enablement kit's intake end to end, with the video.

**PRAPI, inbound briefs**

- Add a brand brief for Tom / StartVest covering FDE, AI enablement, AI implementation, workflow automation, AI guardrails and hallucination, and AI in warehouse and supply chain ops.
- PRAPI scores incoming HARO, MentionMatch and Connectively requests against that brief and drafts responses. Tom approves every send.
- Quote hooks come from the framework: AI projects fail at the ask; "don't build" is an outcome; low rule clarity is where AI helps and RPA doesn't. Every placement links to the canonical page.
- Accuracy rule: describe Tom as an AI implementation practitioner and author of an open discovery framework. Never claim an FDE title he hasn't held. PRAPI's fabrication guardrail checks this on every draft.

**PRAPI, reverse pitch:** only the topic that fits PRAPI's locked ICP runs here: how marketing and PR operators keep AI tools from inventing facts. FDE and logistics topics stay out of the prapi.dev funnel.

**Watch for:** placements, referral traffic to the docs page, repo stars, and recruiters who mention the kit.

## Interview engine v2: code runs the interview

Decided Oct 13, 2026, after the first live web test and two failed gate checks. Code owns every decision about the interview's flow. The model only phrases questions and classifies answers. **This section overrides every earlier section, including Build decisions, on how the conversation runs.** Scoring, gates, templates and the guardrail checks are unchanged.

**Why.** Every failure so far traced to a decision the model owned. Every fix that moved a decision into code held.

| Failure seen | Decision the model owned |
| --- | --- |
| Answers heard but not recorded (up to 75% of turns on mini, about 50% of first attempts on gpt-4.1) | Recording |
| Outcome asked four or more times; cap counted the wrong area | Which area it was asking |
| Answers filed under the wrong area, producing wrong scores | Where an answer belongs |
| Item invented from a hypothetical; real follow-on item never created | Creating items |
| Summary proposed before constraints or the manual-work check were asked | When the interview is done |
| "I've shared the summary" with nothing rendered | Producing the summary |

**The engine.** Each turn runs through these steps. Code owns every step not marked *model*.

1. **Open.** *Model* classifies the opening: type, modifiers, confidence and the triggering quote. Code applies the negation rule ("no API" doesn't trigger integration) and accepts or asks the one disambiguating probe.
2. **Plan.** Code builds an ordered queue of required targets: the type module's anchor area first (`known_idea.current`, `manual_process.walkthrough`, `broken.symptom`, `data_report.decision`, `exploratory.instances`), then the remaining required core areas, then the rest of the module's required areas, then modifier areas. Required means critical, always-ask (including a module's `asks_core`), a band source, or an area a spec-pack template section depends on (at least `core.constraints` and `known_idea.proposal`); every templated section maps to a required area or renders as an open question. The opening classification (step 1) also returns any areas the opening already answers, each with a grounded quote. Those start as covered and leave the queue.
3. **Ask.** Code takes the next target. *Model* phrases a natural question for that one area, given its must-capture list and what the user has already said. It never chooses the area.
4. **Extract.** *Model* classifies the reply to that one question: `answered`, `partial`, `not_applicable`, `declined` or `off_topic`, plus a value and a verbatim quote. It may also list other areas the reply answers, each with its own quote. Designated check questions also return `yes`, `no` or `unclear`.
5. **Apply.** Code checks every quote against the user's turns, then updates state:
   - `answered` with a grounded quote: covered.
   - `partial` or `off_topic`: one probe is queued for the same area. The probe counts when it is asked, not when an answer is recorded.
   - Still unresolved after one probe: assumed if there is a quote, otherwise unknown.
   - `not_applicable` or `declined`: marked as such, never re-asked.
   - An assumed answer on a critical area gets one confirmation question ("You said X. Is that right?"). Yes makes it covered. No discards the value and marks the area unknown, not assumed.
6. **Spawn.** Only designated check questions can create items: the manual-work check and the existing-asset check. Code creates a follow-on item only on `yes` with a grounded quote. `unclear` is asked once more, then treated as no. Follow-on items are queued after the primary item and get a light pass (users, outcome, volume or value, existing).
7. **Summary.** Code moves to the summary only when the queue is empty, the turn budget is reached, or the user asks to wrap up. Code renders the summary from the session file. The user confirms or corrects with buttons, or through a yes / no / correction classifier in the plugin. A correction goes back through Extract, and the summary re-renders.
8. **Score and gate.** Code, unchanged: the model picks a band for each criterion, the evidence must be covered or confirmed, `measurable_with_baseline` requires a number attached to a unit, and a baseline may come from any quote in the session.

**Model contract (schema version 2).** Every turn makes two small structured calls, both strict-mode compatible, and the first turn adds a third:

- `classify_opening(opening, types, modifiers, areas)`, first turn only: type, modifiers, confidence, the triggering quote, and the areas the opening already answers, each with a quote.
- `phrase(target, must_capture, context)` returns the question text only.
- `extract(question, reply, target, checks)` returns status, value, quote, `also_answers[]` and check results, for the one target asked. It stays single-target.

None of these returns the next target, item creation, readiness, scores or gates. The v1 turn contract in Data contract is retired. A failed call (unusable output or a provider error) is retried at most twice per turn; after that the user sees "Sorry, could you send that again?" and nothing is recorded.

**In the plugin.** The same engine runs as scripts. `scripts/next` returns the target and phrasing guidance. Claude asks exactly that question. Claude then sends the extraction JSON to `scripts/apply-turn`. The transcript hook keeps grounding the same as in the web UI.

**Limits.** One probe per area. A turn budget of 30 user replies, after which code forces the summary with open areas marked unknown. The session spend cap is unchanged.

**Retire these v1 patches** once v2 passes its tests: empty-turn rejection, retry messages that name an area, fallback recording of raw replies, spawn hints, model-proposed reflect-back, and model-reported `next_target`. **Keep:** the planner, number guard, band evidence rule, grounding normalization, scoring and gates.

**Ship bar.** Gates are not expected to match 6 out of 6 runs. The user-confirmed summary exists so a person can correct a miss. Non-negotiable:

- Zero ungrounded quotes and zero invented answers.
- No loops: the turn budget always ends the interview.
- The summary always renders.
- Gates match ground truth in at least 5 of 6 runs on the tuning personas (1 and 7) and on the held-out personas (2–6). Every run is tied to a commit hash.

**Plan**

1. Production stays in sample-only mode until the ship bar passes.
2. Build v2 behind the existing tests. Add unit tests for every step above, especially the Apply rules and Spawn.
3. Run one gate round on the tuning personas (1 and 7, three runs each), then the held-out personas (2–6 once each, plus a second run of persona 6), on gpt-4.1. Also measure `extract` on gpt-4.1-mini: as a narrow classifier it may be reliable enough to cut cost.
4. If it passes: merge, deploy, then set the Azure model settings, in that order.
5. **Fallback** if it misses after one fix round: ship the Claude Code plugin as the primary demo, keep the web UI in sample-only mode, and move on to the Week 2 proof pieces. Either way, the kit ships.

## Build decisions: interview engine v2 (Oct 14, 2026)

How v2 was built. Where these conflict with an earlier section, these win; the v2 section above still wins on how the conversation runs.

- **Engine.** `src/engine/`: open, plan, apply (with spawn), write-up and summary, and the turn loop. The web API, the evals, the offline sample and the plugin all run the same `runEngineTurn`.
- **Model calls.** `classify_opening` (first turn), `phrase`, `extract` (one target) and, at the summary, `write_up` for each primary item: band picks, prose, acceptance criteria, guardrails and open questions, which code keeps only where they check out. Step 8 needs the model to pick bands, and this is that call. Schemas are in `schema/v2/`, with validators generated at build time.
- **Required areas** are critical, always-ask (with a module's `asks_core`), the first band source per criterion, and any area that is the only source of a SPEC, ACCEPTANCE or GUARDRAILS section. Each module names its `anchor` area. Checks are configured in `router.yaml` under `checks`.
- **Existing-asset check** records its answer and the area, but creates no item: `spawns: null` until a follow-on type for existing assets is decided. Exploratory intakes therefore no longer spawn an item per example (persona 5 expects three or more items).
- **In the plugin,** `intake.mjs turn` runs one turn. When the engine needs a call, it exits 6 with that call's instructions; Claude writes its JSON to `.intake-kit/calls/<call>.json` and runs `turn` again. Without the prompt hook, `turn --message` records the user's message.
- **Retired:** the v1 turn applier and turn schema (with empty-turn rejection, area-naming retries and raw-reply capture), the v1 prompt and turn loop, spawn hints, model-proposed reflect-back and model-reported `next_target`.
- **Evals** refuse to run on a dirty tree and record the commit hash in the results and the report. `--runs-for id:n` sets runs per persona; `--extract-model` sends only extract calls to another deployment.
- **Fix round after the first v2 gate (Oct 14).** The summary can't loop: the turn budget applies at the summary; "yes, plus a note" applies the note and confirms; after two correction rounds the summary is confirmed with the notes attached. When the opening's classification isn't high confidence, or the signal phrases don't back it (another type's phrase, or none for the chosen type), the user is asked once: "Do you already have something specific in mind to build, or are you looking for where to start?", and the opening is classified again with their answer. The manual-work check asks a fixed question: "Is any part of this done by hand today, like a spreadsheet you build?". Every definitive Don't-build reason the gates would apply appears in the summary as a question the user confirms; existing_asset is covers / partial / none (unknown when unsaid), and only covers can force Don't build.
- **Repo hygiene** stores the forbidden outside-framework names encoded, so the test itself contains none, and scans every file, docs and this spec included. The StartVest brand isn't a framework reference.

## Known issues (Oct 14, 2026, not fixed)

Found by the second v2 gate on commit 89cde19, which missed the ship bar (4 of 6 runs matched ground truth on gpt-4.1). The web app stays in sample-only mode and the plugin is the primary demo, per the fallback above.

- **One yes confirms every Don't-build question.** The summary asks about each definitive Don't-build reason, but one "Yes, that's right" confirms all of them. In persona 1 the user was agreeing that the Monday sheet would go away, and that also confirmed "No decision depends on it" for the report. Fix: confirm each reason separately, and apply only the ones confirmed.
- **decision_depends can contradict an answered decision area.** The write-up picked `decision_depends: no` for a report whose decision ("who to pull for retraining") was answered and covered. Fix: check the band against that area, and treat a contradiction as missing (Gather more), never as Don't build.
- **Lead for cost work.** With only `extract` routed to gpt-4.1-mini (phrasing, classification and write-up on gpt-4.1), the same gate on the same commit matched 5 of 6 runs, at about three-quarters of the cost. That's worth measuring further before the next gate.

## Async intake mode: collect, ingest, follow up (Oct 14, 2026)

**Why.** In a real engagement, the person running the intake (an FDE, an analyst, Tom) usually isn't the person who knows the answers. A live chat relayed one question at a time puts the interviewer in the middle of every turn: ask the user, wait, type their answer back in. It's slow, and the record ends up in the interviewer's words, not the user's. It also leans on the part that keeps failing. Most v2 failures were conversational: phrasing drift, summary loops and misfiled corrections. Reading a block of text and saying which areas it answers, with quotes, is classification, which models do reliably. And the questions already exist in the module YAML; the kit just never showed them up front.

**What changes.** Async becomes the default way to run an intake for someone else. Live chat stays, for the case where the person who knows is the one typing. Async reuses the v2 engine almost entirely: required areas, queue order, the Apply rules, spawn, write-up, summary, scoring, gates and templates. Only the way answers arrive is new.

**The flow**

1. **Triage (interviewer, about 2 minutes).** Enter the one-line request and answer the type question: "Do you already have something specific in mind to build, or are you looking for where to start?" The interviewer can also pick the type and any modifiers directly. `classify_opening` may suggest them, but the interviewer's choice wins.
2. **Question packet (code, no model call).** Code generates the questions for that type: the item's required areas in the engine's queue order (anchor area, core, module, then modifiers). Each question has:
   - one plain question
   - one line on why it matters
   - a short example of a good answer

   The manual-work and existing-asset checks are included word for word. Areas that help but aren't required go in an "if you know" section at the end, included by default. The packet should fit on one page, about 10 to 14 questions. It comes in two formats: text ready to paste into an email, and a meeting agenda with space for notes.
3. **Ingest (interviewer pastes).** The interviewer pastes whatever comes back: the user's email reply, their own meeting notes, or a call transcript. Each paste is a **source**, with a kind (`reply`, `notes` or `transcript`), who it's from, and when it was added.
   - A new model call, `ingest`, reads the whole source against every area of the item and returns each area it answers, with a status, a value and verbatim quotes, plus the check results.
   - Long sources are split into chunks, and code merges the results.
   - Code applies the same rules as live Apply. Every quote must appear in that source, or it's dropped. `answered` with a grounded quote is covered. `partial` is flagged for follow-up (no live probe). `not_applicable` and `declined` are recorded and never asked again.
   - A yes on the manual-work check, with a grounded quote, spawns the follow-on item, as in live mode.
   - **A later source never silently overwrites an earlier one.** Every quote is kept. If two sources disagree, the area is marked contradicted and goes into the follow-up packet.
4. **Gaps and follow-up (code).** After each ingest, code lists what's still open:
   - required areas that are unknown, partial or contradicted
   - critical areas resting on an assumption
   - critical facts that would be unknown or vague at the gate (decision, success baseline, value, from `gap_questions`)
   - the light pass for any spawned item

   The follow-up packet asks only those, phrased by code. A partial answer is quoted back: "You mentioned about 50 a day. Is that every day, or only on peak days?" The interviewer sends it or works through it on a call, pastes the reply, and repeats. A readiness line shows how many required areas are answered and what still stands between each item and Go. There's no turn budget: the interviewer decides when to stop.
5. **Summary and gate.** The interviewer opens the summary whenever they're ready. It's the same code-rendered summary.
   - Corrections are made per area, by editing that area's line, never as free text, so a correction can't land on the wrong area.
   - Each definitive Don't-build reason gets its own confirm, so one yes can't confirm them all.
   - The interviewer signs off on the summary, once it meets their expectations and they understand the work. The end user doesn't confirm it in the tool. If the interviewer wants the user to check something, they put it in a follow-up packet, and the reply is ingested as one more source.
   - Confirming scores and gates, then renders the spec pack, as now.

**SOW draft (decided Oct 14).** When the interviewer signs off on the summary, the spec pack also gets `SOW_DRAFT.md`, rendered by code from the session like every other file. There's no model call. It's a draft for the interviewer to finish, never a finished contract.

- **Which SOW.** An item that reaches **Go** gets a build SOW. An item at **Gather more** gets a **discovery SOW**: a short, paid discovery phase whose deliverable is answers to the open questions in its discovery brief. Items at Don't build or Fix, not build get no SOW; they're listed under out of scope, each with its reason and revisit trigger. A session with no Go or Gather more items renders no SOW.
- **Sections, and where each comes from.** Every line traces to the session, with the same evidence tags as SPEC.md:

  | Section | Source |
  | --- | --- |
  | Background and objective | `problem_statement`, and `core.outcome` in the user's words |
  | Scope and deliverables | `mvp` and the Go items (build); the open questions (discovery) |
  | Out of scope | `out_of_scope`, plus every Don't-build or Fix-not-build item with its reason |
  | Acceptance criteria | ACCEPTANCE criteria and error cases (build); "each open question answered, with who answered it" (discovery) |
  | Assumptions | DECISIONS assumptions with owners, plus every answer that rests only on the interviewer's notes, labelled |
  | Dependencies and constraints | `core.systems`, `core.data`, `core.constraints`, and who signs off (`core.users`) |
  | Risks | adoption risks, guardrails and kill criteria |
  | Success measures | the success metric, its baseline and target; for a vague metric, "to be agreed", listed as a risk |
  | Change control | the revisit triggers: what would reopen scope |

- **Never generated.** Pricing, timeline, payment terms, legal terms and signatures. They render as clearly marked blanks (`[To be completed: ...]`), so nothing commercial or legal is ever invented. The template is generic, not tied to any company's contract format, so it works as a blank copy.
- **Tests.**
  - Every scope, acceptance and assumption line in the SOW traces to a line in SPEC, ACCEPTANCE or DECISIONS.
  - No number appears in pricing or timeline.
  - The discovery SOW lists exactly the brief's open questions.
  - No SOW renders for a session with no Go or Gather more items.

**Whose words count.** Every quote records its source. The summary and the spec pack show where each answer came from: the user's reply, a transcript, or the interviewer's notes. An answer from the interviewer's notes counts as answered, the same as one from the user's reply. It stays labelled as from notes in the summary and in DECISIONS.md, so a reader can see it's second-hand.

**Model contract.** One new strict-mode call:
- `ingest(source_text, areas with must_capture, checks)` returns `answers[]`: area, status, value and quotes.
- It also returns the check results.
- It never returns gates, scores, the next question or new items. The rest of the contract is unchanged.

Async uses `ingest` and `write_up` only; `phrase` and `extract` stay for live mode.

**Session file.**
- `session.channel`: `live` or `async`.
- `session.sources[]`: id, kind, from, added_at and the text, which grounding needs.
- Each coverage entry records the source of each quote.
- The session schema version goes to 2. Version 1 files still load as live sessions.
- Source texts stay in `intake-answers.yaml`; the spec pack carries only the quotes.

**Where it runs**
- **Web:** five screens: triage, packet (copy, or download as markdown), ingest (paste, plus the kind and who it's from), gaps (with the readiness line and the follow-up packet), then summary and review.
- **Plugin:** `intake.mjs` gets `triage`, `packet`, `ingest <file>`, `gaps`, `followup` and `summary`. The skill walks the interviewer through them.

**Testing and ship bar.** The same non-negotiables apply:
- zero ungrounded quotes
- the summary always renders
- gates match ground truth in at least 5 of 6 runs, tied to a commit

Each persona is tested three ways:
- answering the whole packet in one email
- as terse meeting notes
- as a messy call transcript

There are also two new measures:
- **Ingest recall:** areas the persona's text answers that get filled.
- **Ingest precision:** no area filled from a quote that doesn't answer it.

The follow-up packet must contain every gap and nothing already answered.

**Build order**
1. Packet fields (`ask`, `why`, `example`) on every area that can be required, plus the packet generator. Code only, with a test that every required area has them.
2. The `ingest` call, sources in the session file, and the Apply and contradiction rules.
3. Gaps and the follow-up packet.
4. Web screens and plugin commands.
5. Persona evals in async: packet reply, notes and transcript.
6. `SOW_DRAFT.md`: build SOW for Go items, discovery SOW for Gather more. It works in live mode too.
7. Re-run the worked example (the enablement kit) in async mode.

Fixes from the Oct 14 live test that apply to both modes still go first: re-render must regenerate acceptance criteria and guardrails rather than append, and the designated checks must run for known ideas.

**Decided (Tom, Oct 14)**
- Answers from the interviewer's notes count as answered, labelled as from notes.
- The interviewer signs off on the summary; the end user doesn't confirm it in the tool.
- "If you know" questions are included in the packet by default.
- At sign-off the spec pack includes a SOW draft (build or discovery), with commercial and legal terms left as marked blanks.

## Build decisions

Resolved after Claude Code's pre-build review on Oct 10, 2026. Where these conflict with an earlier section, these win.

**Scoring**

1. Add an **Access** criterion (1 = no UI or API access, remote desktop only; 3 = UI only; 5 = API or direct DB read). Ease = mean of stability, documentation, steps and apps, access.
2. **Value** is not in either composite. It feeds the gates only: user-stated trivial value means Don't build.
3. "High" on a 1–5 composite means (mean − 1) / 4 ≥ 0.65, which is a mean of **3.6 or more**, mapped from UiPath's Easy band. "Low" is a mean under 2.4 (below UiPath's 35% band). Prioritize = both high. Defer = both low, or one low and the other not high. Review = everything else, including medium/medium, which needs a written mitigation to reach Go. All thresholds live in scoring.yaml.

**Gate precedence** (first match wins)

1. Fix, not build
2. Don't build, only for definitive reasons: an existing asset covers it, no decision depends on it, or user-stated trivial value
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

**Guardrail enforcement (self-contained, Oct 10, clean separation Oct 13)**

The kit has no dependency on any outside framework or its CLI, and its code and docs make no reference to one. Its checks are its own bundled Node script, `scripts/check`, run by `/audit`, by the session-end hook (exit code ignored; a reminder only) and by CI (blocking).

**Codex packaging**

Codex isn't installed on the build machine. Build the `.agents/skills/` mirror and `AGENTS.md`, but mark the Codex check unverified until it's tested on a machine with Codex.

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

1. **Week 1, the tool:** plugin skeleton, `router, module and scoring YAML`, `/intake`, spec pack rendering, `/`guardrails, /`audit`. Then use it on Tom's next real build.
2. **Week 2, the proof:** the worked example, README, the GitHub Pages docs site, and `docs/DEMO_SCRIPT.md` (a 10-minute live flow plus a recorded fallback). Record a 60–90 second screen capture of the intake producing a spec, for the LinkedIn launch post.

**Acceptance criteria**

- [ ] Installs into a fresh repo with one command; `/intake`, `/`guardrails and /`audit` appear
- [ ] `/intake` asks one question at a time, fires follow-ups only on their conditions, and ends with a confirmed reflect-back
- [ ] `unknown` answers appear as open questions; nothing is invented
- [ ] All seven spec pack files render, and every SPEC and ACCEPTANCE line cites a coverage ID and user quote
- [ ] `/`audit runs the kit's own checks with no outside dependency; a search of the whole repo, docs included, finds no reference to any outside guardrail framework or its CLI
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
- Self-contained: no dependency on, or reference to, any outside framework or CLI, in code or docs. Guardrail checks are the kit's own zero-dependency Node scripts.
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

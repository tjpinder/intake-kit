// Renders the spec pack and briefs from a scored, gated session. Deterministic: the same
// session and templates always give byte-identical files. Static wording lives in templates/;
// each {{section:name}} is filled here, mostly from the module `feeds` that say which coverage
// area lands in which section.
//
// Citation rule (checked by tests and by the traceability check): every bullet in SPEC.md and
// ACCEPTANCE.md ends with one or more citations, `[coverage.id] "the user's words"`, joined by
// " · ". Bullets in SPEC's Open questions cite the area only. Interviewer-written summaries are
// blockquotes, never bullets.

import type { Area, Framework } from "./framework.ts";
import { adoptionRisks } from "./score.ts";
import { CHECK_LABELS, type ChecksConfig } from "./check-meta.ts";
import { coverageFor, type CoverageEntry, type Item, type Session } from "./session.ts";

export class RenderError extends Error {}

const NOTHING = "_Nothing recorded._";
const DECISION_LABEL = { go: "Go", gather_more: "Gather more discovery", dont_build: "Don't build", fix_not_build: "Fix, not build" } as const;

/** `[id] "quote"` for an answered area, or null when it has no quote to cite. */
export function citation(entry: CoverageEntry | undefined, id: string): string | null {
  const quote = entry?.quotes[0];
  return quote ? `[${id}] "${quote}"` : null;
}

function areasOf(item: Item, fw: Framework): Area[] {
  return ["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)].flatMap((m) => fw.modules[m]?.areas ?? []);
}

/** Bullets for every answered area of the item that feeds file#section, in module order. */
function fedLines(session: Session, item: Item, fw: Framework, file: string, section: string): string[] {
  const lines: string[] = [];
  for (const area of areasOf(item, fw)) {
    if (!area.feeds.some((f) => f.file === file && f.section === section)) continue;
    const entry = coverageFor(session, item, area.id);
    if (!entry || (entry.status !== "covered" && entry.status !== "assumed") || !entry.value) continue;
    const cite = citation(entry, area.id);
    if (!cite) continue;
    lines.push(`- ${entry.value}${entry.status === "assumed" ? " _(assumed)_" : ""} ${cite}`);
  }
  return lines;
}

/** One block per item, with a subheading when there's more than one. */
function perItem(items: Item[], body: (item: Item) => string[]): string {
  const blocks = items.map((item) => {
    const lines = body(item);
    const content = lines.length ? lines.join("\n") : NOTHING;
    return items.length > 1 ? `### ${item.title} (\`${item.id}\`)\n\n${content}` : content;
  });
  return blocks.join("\n\n");
}

function openQuestionLines(session: Session, item: Item, fw: Framework, files: string[]): string[] {
  const lines = item.open_questions.map((q) => {
    const who = q.who_can_answer ? ` Who can answer: ${q.who_can_answer}.` : "";
    const artifact = q.artifact_needed ? ` What would settle it: ${q.artifact_needed}.` : "";
    return `- ${q.question}${who}${artifact} [${q.area}]`;
  });
  const asked = new Set(item.open_questions.map((q) => q.area));
  for (const area of areasOf(item, fw)) {
    if (asked.has(area.id) || !area.feeds.some((f) => files.includes(f.file))) continue;
    const entry = coverageFor(session, item, area.id);
    const neverAsked = !entry || (entry.status === "unknown" && !entry.updated_at && entry.quotes.length === 0 && entry.probe_count === 0);
    if (neverAsked) {
      if (area.critical) lines.push(`- Not yet asked: ${area.must_capture}. [${area.id}]`);
    } else if (entry.status === "unknown") {
      lines.push(`- Still unknown: ${area.must_capture}. [${area.id}]`);
    }
  }
  return lines;
}

/**
 * The decision card's line under each gate, built from what the pack actually contains, so the
 * card can't promise a brief that isn't there (enablement live test: "the discovery brief lists
 * who can fill them in", over a brief with no open questions).
 */
export function gateBlurb(session: Session, item: Item, fw: Framework): string {
  switch (item.gate?.decision) {
    case "go": return "Ready to build. The spec pack has everything to start.";
    case "dont_build": return "Building this isn't worth it right now. That's a good outcome when it's right.";
    case "fix_not_build": return "This is a fix, not a project. The diagnostic brief has the ticket text.";
    case "gather_more": {
      const open = openQuestionLines(session, item, fw, Object.keys(fw.sections));
      if (!open.length) return "Not yet: the reasons below need answers before this can go ahead.";
      const who = open.every((l) => l.includes(" Who can answer: "));
      const n = open.length === 1 ? "1 open question" : `${open.length} open questions`;
      return `Not yet: the discovery brief lists ${n}${who ? ", with who can answer each" : ""}.`;
    }
    default: return "";
  }
}

function acceptanceLines(session: Session, item: Item, kind: "criterion" | "error_case"): string[] {
  return item.acceptance
    .filter((a) => a.kind === kind)
    .map((a) => {
      const cites = a.evidence.map((id) => citation(coverageFor(session, item, id), id));
      if (cites.some((c) => c === null)) throw new RenderError(`${item.id}: an acceptance line cites ${a.evidence.join(", ")}, which has no quote to cite`);
      return `- [ ] **Given** ${a.given}, **when** ${a.when}, **then** ${a.then}. ${cites.join(" · ")}`;
    });
}

function guardrailLines(session: Session, item: Item, kind: Item["guardrails"][number]["kind"]): string[] {
  return item.guardrails
    .filter((g) => g.kind === kind)
    .map((g) => {
      const cites = g.evidence.map((id) => citation(coverageFor(session, item, id), id));
      if (cites.some((c) => c === null)) throw new RenderError(`${item.id}: a guardrail cites ${g.evidence.join(", ")}, which has no quote to cite`);
      return `- ${g.text} ${cites.join(" · ")}`;
    });
}

function gateBlock(item: Item): string[] {
  const g = item.gate!;
  const s = item.scoring!;
  const lines = [`### ${item.title} (\`${item.id}\`): ${DECISION_LABEL[g.decision]}`, "", ...g.reasons.map((r) => `- ${r}`)];
  const scores =
    s.automation_potential != null && s.ease != null
      ? `Automation potential ${s.automation_potential}, ease ${s.ease} (${s.quadrant}).`
      : "Not enough known criteria to place it in a quadrant.";
  lines.push("", `Scores: ${scores}${s.ai_overlay.applies ? ` AI overlay: ${Object.entries(s.ai_overlay.checks).map(([c, r]) => `${c} ${r}`).join(", ")}.` : ""}`);
  if (g.revisit_trigger) lines.push("", `${g.revisit_trigger}.`);
  return lines;
}

/** Which items each output file covers. A file with no items isn't rendered. */
export function scope(session: Session): Record<string, Item[]> {
  const items = session.items;
  const go = items.filter((i) => i.gate?.decision === "go");
  return {
    "SPEC.md": go,
    "ACCEPTANCE.md": go,
    "CLAUDE.md": go,
    "GUARDRAILS.md": go,
    "FIRST_PROMPT.md": go,
    "DECISIONS.md": items,
    "DISCOVERY_BRIEF.md": items.filter((i) => i.gate?.decision === "gather_more"),
    "DIAGNOSTIC_BRIEF.md": items.filter((i) => i.type === "broken"),
    "PROCESS_MAP.md": items.filter((i) => i.type === "manual_process"),
    "BACKLOG.md": items.some((i) => i.type === "exploratory") ? items : [],
    // Definitions: rendered for every outcome once a term was found.
    "DEFINITIONS.md": (session.terms ?? []).some((t) => t.status !== "not_a_term") ? items.filter((i) => !i.dropped) : [],
    // A build SOW for Go items, a discovery SOW for Gather more; nothing else gets one.
    "SOW_DRAFT.md": items.filter((i) => i.gate?.decision === "go" || i.gate?.decision === "gather_more"),
  };
}

type SectionFn = (items: Item[]) => string;

/** "notes from Tom", "a reply from Dana": where a quote came from, in an async intake. */
function sourceLabel(session: Session, id: string | null | undefined): string | null {
  const s = id ? session.session.sources?.find((x) => x.id === id) : undefined;
  if (!s) return null;
  return s.kind === "notes" ? `notes from ${s.from}` : s.kind === "transcript" ? `a transcript with ${s.from}` : s.kind === "request" ? `the request from ${s.from}` : `a reply from ${s.from}`;
}

/**
 * Assumptions, for DECISIONS.md and the SOW: assumed answers, answers resting only on the
 * interviewer's notes (labelled, per the async rules), and terms the owner said can't be measured
 * from the data.
 */
function assumptionLines(session: Session, fw: Framework, items: Item[]): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    for (const area of areasOf(i, fw)) {
      const entry = coverageFor(session, i, area.id);
      if (!entry) continue;
      const shared = area.id.startsWith("core.") && !i.core_overrides[area.id.slice(5)];
      const key = shared ? area.id : `${i.id}:${area.id}`;
      if (seen.has(key)) continue;
      const where = shared ? "" : ` (\`${i.id}\`)`;
      if (entry.status === "assumed") {
        seen.add(key);
        lines.push(`- **${area.id}**${where}: ${entry.value} ("${entry.quotes[0]}"). Owner: _unassigned_`);
        continue;
      }
      const kinds = entry.quotes.map((q) => session.session.sources?.find((s) => s.id === entry.quote_sources?.[q])?.kind);
      if (entry.status === "covered" && kinds.length && kinds.every((k) => k === "notes")) {
        seen.add(key);
        lines.push(`- **${area.id}**${where}: ${entry.value} (from ${sourceLabel(session, entry.quote_sources?.[entry.quotes[0]])}, not the requester's own words). Owner: _unassigned_`);
      }
    }
  }
  const ids = new Set(items.map((i) => i.id));
  for (const t of (session.terms ?? []).filter((x) => x.status === "confirmed" && (x.measurable === "no" || x.measurable === "partly") && x.items.some((id) => ids.has(id)))) {
    lines.push(`- **"${t.term}"** can ${t.measurable === "no" ? "not" : "only partly"} be seen in the system's data, by the owner's definition. How it will be measured is still open. Owner: _unassigned_`);
  }
  return lines;
}

/** One block per term: the owner's definition, who gave it, measurability and known answers. */
function termBlocks(session: Session, items: Item[]): string {
  const ids = new Set(items.map((i) => i.id));
  const terms = (session.terms ?? []).filter((t) => t.status !== "not_a_term" && (!t.items.length || t.items.some((id) => ids.has(id))));
  if (!terms.length) return NOTHING;
  return terms.map((t) => {
    const lines = [`### ${t.term} (${t.kind}): ${t.status === "confirmed" ? (t.conflict ? "two definitions disagree" : "confirmed") : "unconfirmed"}`, ""];
    if (t.status === "confirmed") {
      lines.push(`> ${t.definition}`, "", `In the owner's words: "${t.quotes[0]}"${t.given_by ? `. Given by ${t.given_by}` : ""}${sourceLabel(session, t.source) ? `, in ${sourceLabel(session, t.source)}` : ""}.`);
      if (t.conflict) lines.push("", `Also defined as: "${t.conflict.definition}" (${sourceLabel(session, t.conflict.source) ?? t.conflict.source}). Settle which is right before building.`);
    } else {
      lines.push("_The owner hasn't defined it yet. Don't interpret it: ask._", "", `Found in: "${t.found_in.quote}".`);
    }
    const measurable = { yes: "Yes", partly: "Partly", no: "No: it isn't in the system's data", unknown: "Not known yet" }[t.measurable];
    lines.push("", `Can it be seen in the data? ${measurable}.`);
    if (t.examples.length) lines.push("", "Known answers (each becomes an acceptance check):", ...t.examples.map((e) => `- ${e.case} → ${e.expected}`));
    else if (t.kind === "metric") lines.push("", "_Recommended: one real example with its correct result, so the build can be checked against it._");
    return lines.join("\n");
  }).join("\n\n");
}

function sectionRenderers(session: Session, fw: Framework, file: string, checks: ChecksConfig | null): Record<string, SectionFn> {
  const fed = (section: string): SectionFn => (items) => perItem(items, (i) => fedLines(session, i, fw, file, section));
  const withSummary = (section: string, field: keyof Item["prose"]): SectionFn => (items) =>
    perItem(items, (i) => {
      const lines = fedLines(session, i, fw, file, section);
      const text = i.prose[field];
      return text ? [`> ${text}`, ...(lines.length ? ["", ...lines] : [])] : lines;
    });
  const prose = (field: keyof Item["prose"]): SectionFn => (items) => perItem(items, (i) => (i.prose[field] ? [`> ${i.prose[field]}`] : []));
  const notYet = "_Not set up yet. Run the intake-kit guardrails command (`/intake-kit:guardrails` in Claude Code, `$intake-guardrails` in Codex) to choose these._";

  switch (file) {
    case "SPEC.md":
      return {
        open_questions: (items) => perItem(items, (i) => openQuestionLines(session, i, fw, ["SPEC.md", "ACCEPTANCE.md"])),
        problem: withSummary("problem", "problem_statement"),
        users: fed("users"),
        current_state: withSummary("current_state", "current_state"),
        success_metric: fed("success_metric"),
        mvp: withSummary("mvp", "mvp"),
        out_of_scope: prose("out_of_scope"),
        data: fed("data"),
        systems: fed("systems"),
        constraints: fed("constraints"),
      };
    case "ACCEPTANCE.md":
      return {
        criteria: (items) => perItem(items, (i) => acceptanceLines(session, i, "criterion")),
        error_cases: (items) => perItem(items, (i) => acceptanceLines(session, i, "error_case")),
      };
    case "CLAUDE.md":
      return {
        pointers: () =>
          ["- `SPEC.md`: what we're building and why", "- `ACCEPTANCE.md`: what done means; write tests from it", "- `GUARDRAILS.md`: kill criteria, fallback, review points, data handling", "- `DECISIONS.md`: gate decisions and open assumptions", "- `intake-answers.yaml`: the source every file above is rendered from"].join("\n"),
        stack: fed("stack"),
        commands: () => "_None yet. Add build, test and run commands here as soon as they exist._",
        never_do: (items) =>
          [
            "- Don't break a constraint in SPEC.md or a guardrail in GUARDRAILS.md.",
            ...items.flatMap((i) => guardrailLines(session, i, "data_rule")),
          ].join("\n"),
      };
    case "GUARDRAILS.md":
      return {
        kill_criteria: (items) => perItem(items, (i) => guardrailLines(session, i, "kill_criterion")),
        fallback: (items) => perItem(items, (i) => guardrailLines(session, i, "fallback")),
        review_points: (items) =>
          perItem(items, (i) => [...guardrailLines(session, i, "review_point"), ...(i.prose.mitigation ? [`> Mitigation agreed in the intake: ${i.prose.mitigation}`] : [])]),
        data_handling: (items) => perItem(items, (i) => guardrailLines(session, i, "data_rule")),
        flagged_paths: () =>
          !checks
            ? notYet
            : checks.flagged_paths.length
              ? [...checks.flagged_paths.map((g) => `- \`${g}\``), "", `A pull request that changes any of these needs the \`${checks.review_label}\` label and a human review before it can merge.`].join("\n")
              : "_None flagged._",
        ci_checks: () =>
          !checks
            ? notYet
            : [
                ...checks.enabled.map((id) => `- **${id}**: ${CHECK_LABELS[id]}`),
                "",
                "They run on every pull request from `.github/workflows/intake-kit.yml`; a failing check blocks the merge. Configure them in `.intake-kit/checks.json`.",
              ].join("\n"),
      };
    case "FIRST_PROMPT.md":
      return {
        prompt: (items) => {
          const first = items.flatMap((i) => i.acceptance.filter((a) => a.kind === "criterion"))[0];
          const open = items.reduce((n, i) => n + i.open_questions.length, 0);
          return [
            "Read SPEC.md, ACCEPTANCE.md, GUARDRAILS.md and DECISIONS.md in full before doing anything.",
            "",
            `We're building: ${items.map((i) => i.title).join("; ")}.`,
            "",
            "1. Plan first. Give me a short plan: the smallest slice that proves the idea, the files you'll touch, and how you'll test it. Wait for my OK.",
            first
              ? `2. Build only that slice. Start with this criterion: Given ${first.given}, when ${first.when}, then ${first.then}.`
              : "2. Build only that slice, starting from the first criterion in ACCEPTANCE.md.",
            "3. Write tests from ACCEPTANCE.md, including the error cases, before the code they cover.",
            `4. Stop and ask before touching anything in Out of scope${open ? `, or anything that depends on the ${open} open question${open === 1 ? "" : "s"} in SPEC.md` : ""}.`,
            "5. Check GUARDRAILS.md before anything that touches data handling or a review point.",
          ].join("\n");
        },
      };
    case "DECISIONS.md":
      return {
        gate: (items) => items.map((i) => gateBlock(i).join("\n")).join("\n\n"),
        reclassifications: (items) => {
          const lines = items.flatMap((i) =>
            i.type_history.filter((h) => h.from != null).map((h) => `- \`${i.id}\` ${h.from} → ${h.to}: ${h.reason} ("${h.quote}")`),
          );
          return lines.length ? lines.join("\n") : "_None._";
        },
        assumptions: (items) => {
          const lines = assumptionLines(session, fw, items);
          return lines.length ? lines.join("\n") : "_None._";
        },
        adoption_risks: (items) => {
          const lines = items.flatMap((i) => (i.scoring ? adoptionRisks(i.scoring, fw).map((force) => `- \`${i.id}\`: ${force} is ${i.scoring!.adoption![force as "push"]}`) : []));
          return lines.length ? lines.join("\n") : "_None identified._";
        },
      };
    case "DISCOVERY_BRIEF.md":
      return {
        open_questions: (items) =>
          items
            .map((i) => {
              const open = openQuestionLines(session, i, fw, Object.keys(fw.sections));
              return [`## ${i.title} (\`${i.id}\`)`, "", "Why it needs more discovery:", "", ...i.gate!.reasons.map((r) => `- ${r}`), "", "Open questions:", "", ...(open.length ? open : [NOTHING])].join("\n");
            })
            .join("\n\n"),
      };
    case "DIAGNOSTIC_BRIEF.md":
      return {
        symptom: fed("symptom"),
        timeline: fed("timeline"),
        impact: fed("impact"),
        workaround: fed("workaround"),
        cause: fed("cause"),
        recurrence: fed("recurrence"),
        fix_ticket: (items) =>
          perItem(items, (i) => {
            if (i.gate?.decision !== "fix_not_build") return ["_Not a fix: see the gate decision in DECISIONS.md._"];
            const cause = i.facts.broken_cause?.band ?? "unknown";
            return [`**${i.title}**: ${cause} cause.`, "", ...fedLines(session, i, fw, file, "fix_ticket")];
          }),
        known_error: fed("known_error"),
      };
    case "PROCESS_MAP.md":
      return {
        steps: fed("steps"),
        candidates: (items) =>
          perItem(items, (i) => [
            `**${DECISION_LABEL[i.gate!.decision]}**${i.scoring?.quadrant ? ` (${i.scoring.quadrant})` : ""}: ${i.gate!.reasons[0]}.`,
            "",
            ...fedLines(session, i, fw, file, "candidates"),
          ]),
      };
    case "BACKLOG.md":
      return {
        items: (items) => {
          const rank = (i: Item) => (i.gate?.decision === "go" ? 0 : 1) * 100 - ((i.scoring?.automation_potential ?? 0) + (i.scoring?.ease ?? 0));
          const ranked = items.filter((i) => i.type !== "exploratory").sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
          return ranked.length
            ? ranked.map((i, n) => `${n + 1}. **${i.title}** (\`${i.id}\`, ${i.type}): ${DECISION_LABEL[i.gate!.decision]}${i.scoring?.quadrant ? `, ${i.scoring.quadrant}` : ""}`).join("\n")
            : NOTHING;
        },
        self_serve: (items) => perItem(items.filter((i) => i.type === "exploratory"), (i) => fedLines(session, i, fw, file, "self_serve")),
      };
    case "DEFINITIONS.md":
      return { terms: (items) => termBlocks(session, items) };
    case "SOW_DRAFT.md": {
      const kind = (i: Item) => (i.gate?.decision === "go" ? "Build" : "Discovery");
      const others = session.items.filter((i) => i.gate && i.gate.decision !== "go" && i.gate.decision !== "gather_more");
      const coreLines = (area: string) => {
        const e = session.core[area.slice(5) as keyof Session["core"]];
        const c = citation(e, area);
        return e && e.status !== "unknown" && e.value && c ? [`- ${e.value} ${c}`] : [];
      };
      return {
        background: (items) => perItem(items, (i) => [...(i.prose.problem_statement ? [`> ${i.prose.problem_statement}`, ""] : []), ...coreLines("core.outcome")]),
        scope: (items) => perItem(items, (i) => i.gate?.decision === "go"
          ? [`**${kind(i)}.**${i.prose.mvp ? ` ${i.prose.mvp}` : ""}`, "", "Deliverable: what SPEC.md describes, meeting every check in ACCEPTANCE.md, within GUARDRAILS.md."]
          : [`**${kind(i)}.** Answer the open questions in DISCOVERY_BRIEF.md, then re-run the intake to a sign-off:`, "", ...(openQuestionLines(session, i, fw, Object.keys(fw.sections)).length ? openQuestionLines(session, i, fw, Object.keys(fw.sections)) : [NOTHING])]),
        out_of_scope: (items) => {
          const lines = [...items.flatMap((i) => (i.prose.out_of_scope ? [`- ${i.prose.out_of_scope}`] : [])), ...others.map((o) => `- **${o.title}**: ${DECISION_LABEL[o.gate!.decision]}. ${o.gate!.reasons[0]}.${o.gate!.revisit_trigger ? ` ${o.gate!.revisit_trigger}.` : ""}`)];
          return lines.length ? lines.join("\n") : NOTHING;
        },
        acceptance: (items) => perItem(items, (i) => i.gate?.decision === "go"
          ? [...acceptanceLines(session, i, "criterion"), ...acceptanceLines(session, i, "error_case")]
          : ["- [ ] Every open question answered in the owner's words, with who answered it.", "- [ ] Every term in DEFINITIONS.md confirmed by the owner."]),
        assumptions: (items) => { const l = assumptionLines(session, fw, items); return l.length ? l.join("\n") : NOTHING; },
        dependencies: () => { const l = ["core.systems", "core.data", "core.constraints", "core.users"].flatMap(coreLines); return l.length ? l.join("\n") : NOTHING; },
        risks: (items) => {
          const lines = items.flatMap((i) => [
            ...(i.scoring ? adoptionRisks(i.scoring, fw).map((force) => `- ${force} is ${i.scoring!.adoption![force as "push"]}${items.length > 1 ? ` (\`${i.id}\`)` : ""}`) : []),
            ...guardrailLines(session, i, "kill_criterion").map((l) => l.replace(/^- /, "- Stop if: ")),
            ...guardrailLines(session, i, "fallback").map((l) => l.replace(/^- /, "- Fallback: ")),
            ...(i.facts.success_metric?.band && i.facts.success_metric.band !== "measurable_with_baseline" ? ["- Success isn't measurable against a baseline yet, so it has to be agreed before work starts."] : []),
          ]);
          return lines.length ? lines.join("\n") : NOTHING;
        },
        success: (items) => perItem(items, (i) => i.facts.success_metric?.band === "measurable_with_baseline" ? coreLines("core.outcome") : ["_To be agreed: the intake has no measurable target against a baseline yet (listed under Risks)._"]),
        change_control: (items) => [
          ...items.flatMap((i) => (i.gate?.revisit_trigger ? [`- ${i.title}: ${i.gate.revisit_trigger}.`] : [])),
          "- Any change to scope, definitions or acceptance goes back through the intake and is signed off again.",
        ].join("\n"),
        commercial: () => ["- Price: [To be completed]", "- Timeline and milestones: [To be completed]", "- Payment terms: [To be completed]", "- Legal terms and signatures: [To be completed]"].join("\n"),
      };
    }
    default:
      throw new RenderError(`no renderer for ${file}`);
  }
}

/**
 * Renders every output file that has items in scope, from templates passed in as text (keyed
 * by file name; see readTemplates in framework-fs.ts). Throws if the session isn't gated yet.
 */
export function renderAll(session: Session, fw: Framework, templates: Record<string, string>, checks: ChecksConfig | null = null): Map<string, string> {
  if (!session.session.reflect_back?.confirmed || session.items.some((i) => !i.gate || !i.scoring)) {
    throw new RenderError("The session isn't scored and gated yet: confirm the reflect-back first.");
  }
  const out = new Map<string, string>();
  const scopes = scope(session);
  for (const [file, sections] of Object.entries(fw.sections)) {
    const items = scopes[file];
    if (!items?.length) continue;
    const renderers = sectionRenderers(session, fw, file, checks);
    let text = templates[file];
    if (text == null) throw new RenderError(`no template for ${file}`);
    for (const section of sections) {
      const fn = renderers[section];
      if (!fn) throw new RenderError(`${file}: no renderer for section ${section}`);
      const placeholder = `{{section:${section}}}`;
      if (!text.includes(placeholder)) throw new RenderError(`templates/${file} is missing ${placeholder}`);
      text = text.replace(placeholder, () => fn(items));
    }
    text = text
      .replaceAll("{{titles}}", items.map((i) => i.title).join("; "))
      .replaceAll("{{session_id}}", session.session.id)
      .replaceAll("{{date}}", session.session.started_at.slice(0, 10))
      .replaceAll("{{rules_version}}", items[0].gate!.rules_version);
    const leftover = text.match(/\{\{[^}]+\}\}/);
    if (leftover) throw new RenderError(`templates/${file}: unknown placeholder ${leftover[0]}`);
    out.set(file, text.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
  }
  return out;
}

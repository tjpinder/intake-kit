// Builds and checks the framework config (router, modules, scoring, template sections) from
// its YAML text. Pure, so the web app can run it in a browser; framework-fs.ts reads the files
// for the plugin and CLI at runtime, so tuning scoring.yaml there needs no rebuild. Any problem
// throws with every issue listed, so a bad edit can't silently change how the intake behaves.

import type { ValidateFunction } from "ajv";
import { coreAreas, factNames } from "./generated/schema-facts.js";

export type ItemType = "broken" | "manual_process" | "known_idea" | "exploratory" | "data_report";
export type Modifier = "integration" | "compliance" | "migration";
export type Band = string;

export interface FollowupCondition { when: string; ask: string; spawns?: string }
export interface Feed { file: string; section: string }
export interface Area {
  id: string;
  must_capture: string;
  probes: string[];
  always_ask?: boolean;
  critical: boolean;
  stop_at?: string;
  followup_conditions: FollowupCondition[];
  feeds: Feed[];
  guardrail?: string;
}
export interface Module {
  module: string;
  applies_to: string;
  effects?: { risk_tier?: "high"; gate?: "gather_more" };
  areas: Area[];
  [extra: string]: unknown;
}
export interface Router {
  framework_version: string;
  types: Record<ItemType, { label: string; signals: string[]; low_confidence_probe: string; output: string; module: string }>;
  modifiers: Record<Modifier, { label: string; signals: string[]; module: string; effects?: Module["effects"] }>;
  rules: { reclassify_min_signals: number; [extra: string]: unknown };
  /** Interview engine v2: the only questions that can create an item. */
  checks?: {
    manual_work: { applies_to: ItemType[]; must_capture: string; spawns: ItemType; light_pass: string[] };
    existing_asset: { areas: string[]; spawns: ItemType | null; light_pass: string[] };
  };
}
export interface Scoring {
  rules_version: string;
  min_known_per_composite: number;
  criteria: Record<string, { label: string; bands: Record<Band, number | null>; describe: Record<Band, string>; usually_from: string[] }>;
  composites: Record<"automation_potential" | "ease", { criteria: Record<string, number> }>;
  thresholds: { high_min_pct: number; low_below_pct: number };
  quadrants: Record<"prioritize" | "review" | "defer", string>;
  ai_overlay: {
    applies_fact: "ai_applies";
    applies_bands: Record<Band, boolean>;
    checks: Record<string, { label: string; passes_when: string; basis: string }>;
    check_bands: ["pass", "fail", "unknown"];
    dont_build_on_fail: string[];
  };
  adoption: { applies_to: ItemType[]; forces: string[]; bands: Band[]; risk_when: Record<string, Band[]>; usually_from?: Record<string, string[]> };
  gate_facts: Record<string, Band[]>;
  gate_fact_notes?: Record<string, string>;
  gates: {
    go_requires_core: string[];
    precedence: string[];
    fix_not_build: { applies_to: ItemType[]; when_cause: Band[]; when_workaround_permanent: Band[] };
    dont_build_definitive: { existing_asset: Band[]; decision_depends: Band[]; decision_depends_applies_to: ItemType[]; value: Band[]; superseded_by_go_item: boolean };
    gather_more: {
      critical_unknown: boolean;
      stability: Band[];
      review_without_mitigation: boolean;
      modifiers: Modifier[];
      defer_with_critical_unknown: boolean;
      composite_null: boolean;
      ai_overlay_unresolved: boolean;
      decision_depends?: Band[];
    };
    dont_build_quadrant: { quadrant: string[]; defer_rescued_by_ai_overlay: boolean; ai_overlay_fail: boolean };
    go: {
      success_metric: Band[];
      quadrants: string[];
      review_needs_mitigation: boolean;
      ai_candidate_from_defer: boolean;
      ai_overlay_must_pass: boolean;
      reflect_back_confirmed: boolean;
    };
    fallthrough: "gather_more";
  };
}
export type Sections = Record<string, string[]>;

export interface Framework {
  router: Router;
  modules: Record<string, Module>;
  scoring: Scoring;
  sections: Sections;
  /** Every coverage ID, mapped to its area definition. */
  areas: Map<string, Area>;
  /** Every fact name, mapped to its allowed band names. */
  factBands: Map<string, Band[]>;
}

export class FrameworkError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`intake-kit framework config is invalid:\n  - ${issues.join("\n  - ")}`);
    this.issues = issues;
  }
}

/**
 * The framework's JSON Schema validators (src/lib/generated/framework-validators.js). Node callers
 * pass them; the browser doesn't need to, since it only ever builds the framework from the YAML
 * bundled into it, which the tests and CI already validate. The cross-checks below always run.
 */
export type FrameworkSchemaValidators = Record<"router" | "module" | "scoring" | "sections", ValidateFunction>;

function check(validators: FrameworkSchemaValidators | undefined, kind: keyof FrameworkSchemaValidators, data: unknown, file: string, issues: string[]): void {
  const fn = validators?.[kind];
  if (fn && !fn(data)) {
    for (const e of fn.errors ?? []) issues.push(`${file}: ${e.instancePath || "/"} ${e.message ?? e.keyword}`);
  }
}

/** The fact names the turn and session schemas allow. All three lists must agree. */
export function schemaFactNames(): { turn: string[]; session: string[] } {
  return { turn: factNames.turn, session: factNames.session };
}

/** The framework's YAML, as text. The Node loader reads it from disk; the web app bundles it. */
/**
 * Each source is YAML text, or the value it parses to. The web app passes parsed values (its
 * build parses the YAML), so the browser doesn't need a YAML parser at startup.
 */
export interface FrameworkSources {
  router: string | object;
  scoring: string | object;
  sections: string | object;
  /** Module YAML keyed by file name, e.g. "core.yaml". */
  modules: Record<string, string | object>;
}

/**
 * Builds and checks the framework from its YAML text. Pure: no file system, so it runs in a
 * browser too. Throws FrameworkError listing every problem found.
 */
/**
 * Node callers pass the YAML parser and the schema validators; the browser passes neither. It
 * hands over values its build already parsed from YAML the tests and CI validate, so it needs no
 * YAML parser or validators at startup. Keeping both as options keeps them out of its bundle.
 */
export interface BuildOptions {
  parseYaml?: (text: string) => unknown;
  schemas?: FrameworkSchemaValidators;
}

export function buildFramework(sources: FrameworkSources, options: BuildOptions = {}): Framework {
  const { parseYaml, schemas } = options;
  const issues: string[] = [];
  const parse = (text: string | object, file: string): unknown => {
    if (typeof text !== "string") return structuredClone(text);
    if (!parseYaml) {
      issues.push(`${file}: YAML text was given without a YAML parser (pass options.parseYaml)`);
      return null;
    }
    try {
      return parseYaml(text);
    } catch (err) {
      issues.push(`${file}: not valid YAML: ${(err as Error).message}`);
      return null;
    }
  };

  const router = parse(sources.router, "router.yaml") as Router;
  check(schemas, "router", router, "router.yaml", issues);

  const scoring = parse(sources.scoring, "scoring.yaml") as Scoring;
  check(schemas, "scoring", scoring, "scoring.yaml", issues);

  const sections = parse(sources.sections, "templates/sections.yaml") as Sections;
  check(schemas, "sections", sections, "templates/sections.yaml", issues);

  const modules: Record<string, Module> = {};
  for (const file of Object.keys(sources.modules).filter((f) => f.endsWith(".yaml")).sort()) {
    const mod = parse(sources.modules[file], `modules/${file}`) as Module;
    check(schemas, "module", mod, `modules/${file}`, issues);
    if (mod?.module) {
      if (`${mod.module}.yaml` !== file) issues.push(`modules/${file}: module "${mod.module}" doesn't match its file name`);
      modules[mod.module] = mod;
    }
  }

  // Stop before cross-checks if any file is structurally wrong; later checks assume shape.
  if (issues.length) throw new FrameworkError(issues);

  // Router -> modules
  if (!modules.core) issues.push("modules/core.yaml is missing");
  for (const [type, def] of Object.entries(router.types)) {
    if (def.module !== type) issues.push(`router.yaml: type ${type} must use module "${type}", not "${def.module}"`);
    if (!modules[def.module]) issues.push(`router.yaml: type ${type} names missing module "${def.module}"`);
    else if (modules[def.module].applies_to !== type) issues.push(`modules/${def.module}.yaml: applies_to must be "${type}"`);
  }
  for (const [mod, def] of Object.entries(router.modifiers)) {
    if (def.module !== `mod.${mod}`) issues.push(`router.yaml: modifier ${mod} must use module "mod.${mod}"`);
    if (!modules[def.module]) issues.push(`router.yaml: modifier ${mod} names missing module "${def.module}"`);
    else if (modules[def.module].applies_to !== "modifier") issues.push(`modules/${def.module}.yaml: applies_to must be "modifier"`);
    if (JSON.stringify(def.effects ?? {}) !== JSON.stringify(modules[def.module]?.effects ?? {})) {
      issues.push(`router.yaml and modules/${def.module}.yaml disagree on effects for ${mod}`);
    }
  }
  const routed = new Set(["core", ...Object.values(router.types).map((t) => t.module), ...Object.values(router.modifiers).map((m) => m.module)]);
  for (const name of Object.keys(modules)) if (!routed.has(name)) issues.push(`modules/${name}.yaml isn't referenced by router.yaml`);

  // Areas: unique, namespaced to their module, feeds point at real sections
  const areas = new Map<string, Area>();
  for (const mod of Object.values(modules)) {
    for (const area of mod.areas) {
      if (areas.has(area.id)) issues.push(`duplicate coverage ID ${area.id}`);
      areas.set(area.id, area);
      if (!area.id.startsWith(`${mod.module}.`) || !/^[a-z][a-z0-9_]*$/.test(area.id.slice(mod.module.length + 1))) {
        issues.push(`modules/${mod.module}.yaml: area ${area.id} must be "${mod.module}.<snake_case>"`);
      }
      for (const feed of area.feeds) {
        if (!sections[feed.file]) issues.push(`${area.id}: feeds unknown file ${feed.file}`);
        else if (!sections[feed.file].includes(feed.section)) issues.push(`${area.id}: feeds unknown section ${feed.file}#${feed.section}`);
      }
    }
  }
  const coreIds = coreAreas.map((a) => `core.${a}`);
  const moduleCore = modules.core?.areas.map((a) => a.id) ?? [];
  if (JSON.stringify([...moduleCore].sort()) !== JSON.stringify([...coreIds].sort())) {
    issues.push(`modules/core.yaml areas (${moduleCore.join(", ")}) must match the session schema's core (${coreIds.join(", ")})`);
  }
  for (const id of scoring.gates.go_requires_core) if (!areas.has(id)) issues.push(`scoring.yaml: go_requires_core names unknown area ${id}`);
  const checks = router.checks;
  for (const id of [...(checks?.manual_work.light_pass ?? []), ...(checks?.existing_asset.areas ?? []), ...(checks?.existing_asset.light_pass ?? [])]) {
    if (!areas.has(id)) issues.push(`router.yaml: checks name unknown area ${id}`);
  }
  for (const mod of Object.values(modules)) {
    const anchor = mod.anchor as string | undefined;
    if (anchor && !mod.areas.some((a) => a.id === anchor)) issues.push(`modules/${mod.module}.yaml: anchor ${anchor} isn't one of its areas`);
    for (const id of (mod.asks_core as string[] | undefined) ?? []) if (!coreIds.includes(id)) issues.push(`modules/${mod.module}.yaml: asks_core names unknown core area ${id}`);
  }

  // Facts: scoring.yaml, turn schema and session schema must agree exactly
  const factBands = new Map<string, Band[]>();
  for (const [name, def] of Object.entries(scoring.criteria)) factBands.set(name, Object.keys(def.bands));
  factBands.set(scoring.ai_overlay.applies_fact, Object.keys(scoring.ai_overlay.applies_bands));
  for (const name of Object.keys(scoring.ai_overlay.checks)) factBands.set(name, [...scoring.ai_overlay.check_bands]);
  for (const name of scoring.adoption.forces) factBands.set(name, [...scoring.adoption.bands]);
  for (const [name, bands] of Object.entries(scoring.gate_facts)) {
    if (factBands.has(name)) issues.push(`scoring.yaml: fact ${name} is defined twice`);
    factBands.set(name, bands);
  }
  for (const name of Object.keys(scoring.gate_fact_notes ?? {})) {
    if (!scoring.gate_facts[name]) issues.push(`scoring.yaml: gate_fact_notes names unknown gate fact ${name}`);
  }
  const fromScoring = [...factBands.keys()].sort();
  const { turn, session } = schemaFactNames();
  if (JSON.stringify(fromScoring) !== JSON.stringify([...turn].sort())) {
    issues.push(`facts in scoring.yaml (${fromScoring.join(", ")}) don't match the turn schema (${[...turn].sort().join(", ")})`);
  }
  if (JSON.stringify([...turn].sort()) !== JSON.stringify([...session].sort())) {
    issues.push("fact names in the turn and session schemas don't match");
  }

  // Composites and gates reference real criteria and bands
  for (const [name, comp] of Object.entries(scoring.composites)) {
    for (const c of Object.keys(comp.criteria)) if (!scoring.criteria[c]) issues.push(`scoring.yaml: composite ${name} uses unknown criterion ${c}`);
    if (Object.keys(comp.criteria).length < scoring.min_known_per_composite) {
      issues.push(`scoring.yaml: composite ${name} has fewer criteria than min_known_per_composite`);
    }
  }
  for (const [c, def] of Object.entries(scoring.criteria)) {
    for (const id of def.usually_from) if (!areas.has(id)) issues.push(`scoring.yaml: ${c}.usually_from names unknown area ${id}`);
    for (const b of Object.keys(def.describe)) if (!(b in def.bands)) issues.push(`scoring.yaml: ${c}.describe names unknown band ${b}`);
    for (const b of Object.keys(def.bands)) if (b !== "unknown" && !(b in def.describe)) issues.push(`scoring.yaml: ${c} band ${b} has no description`);
  }
  if (scoring.thresholds.low_below_pct >= scoring.thresholds.high_min_pct) issues.push("scoring.yaml: low_below_pct must be below high_min_pct");
  for (const c of scoring.ai_overlay.dont_build_on_fail) if (!scoring.ai_overlay.checks[c]) issues.push(`scoring.yaml: dont_build_on_fail names unknown check ${c}`);
  for (const force of Object.keys(scoring.adoption.risk_when)) if (!scoring.adoption.forces.includes(force)) issues.push(`scoring.yaml: adoption.risk_when names unknown force ${force}`);
  for (const [force, ids] of Object.entries(scoring.adoption.usually_from ?? {})) {
    if (!scoring.adoption.forces.includes(force)) issues.push(`scoring.yaml: adoption.usually_from names unknown force ${force}`);
    for (const id of ids) if (!areas.has(id)) issues.push(`scoring.yaml: adoption.usually_from.${force} names unknown area ${id}`);
  }

  const bandRefs: Array<[string, string, Band[]]> = [
    ["broken_cause", "gates.fix_not_build.when_cause", scoring.gates.fix_not_build.when_cause],
    ["workaround_permanent", "gates.fix_not_build.when_workaround_permanent", scoring.gates.fix_not_build.when_workaround_permanent],
    ["existing_asset", "gates.dont_build_definitive.existing_asset", scoring.gates.dont_build_definitive.existing_asset],
    ["decision_depends", "gates.dont_build_definitive.decision_depends", scoring.gates.dont_build_definitive.decision_depends],
    ["value", "gates.dont_build_definitive.value", scoring.gates.dont_build_definitive.value],
    ["stability", "gates.gather_more.stability", scoring.gates.gather_more.stability],
    ["decision_depends", "gates.gather_more.decision_depends", scoring.gates.gather_more.decision_depends ?? []],
    ["success_metric", "gates.go.success_metric", scoring.gates.go.success_metric],
  ];
  for (const [fact, path, bands] of bandRefs) {
    const allowed = factBands.get(fact);
    if (!allowed) { issues.push(`scoring.yaml: ${path} refers to undefined fact ${fact}`); continue; }
    for (const b of bands) if (!allowed.includes(b)) issues.push(`scoring.yaml: ${path} names band "${b}", which ${fact} doesn't define`);
  }
  for (const [force, bands] of Object.entries(scoring.adoption.risk_when)) {
    for (const b of bands) if (!scoring.adoption.bands.includes(b)) issues.push(`scoring.yaml: adoption.risk_when.${force} names unknown band ${b}`);
  }

  if (issues.length) throw new FrameworkError(issues);
  return { router, modules, scoring, sections, areas, factBands };
}

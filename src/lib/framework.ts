// Loads and checks the framework config (router, modules, scoring, template sections).
// These files are read at runtime, not bundled, so tuning scoring.yaml takes effect with no
// rebuild. Any problem throws with every issue listed, so a bad edit can't silently change
// how the intake behaves.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { Ajv2020 } from "ajv/dist/2020.js";
import frameworkSchema from "../../schema/framework.schema.json" with { type: "json" };
import turnSchema from "../../schema/turn.schema.json" with { type: "json" };
import sessionSchema from "../../schema/session.schema.json" with { type: "json" };

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
}
export interface Scoring {
  rules_version: string;
  min_known_per_composite: number;
  criteria: Record<string, { label: string; bands: Record<Band, number | null>; describe: Record<Band, string> }>;
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
  adoption: { applies_to: ItemType[]; forces: string[]; bands: Band[]; risk_when: Record<string, Band[]> };
  gate_facts: Record<string, Band[]>;
  gates: {
    go_requires_core: string[];
    precedence: string[];
    fix_not_build: { applies_to: ItemType[]; when_cause: Band[]; when_workaround_permanent: Band[] };
    dont_build_definitive: { existing_asset: Band[]; decision_depends: Band[]; value: Band[]; superseded_by_go_item: boolean };
    gather_more: {
      critical_unknown: boolean;
      stability: Band[];
      review_without_mitigation: boolean;
      modifiers: Modifier[];
      defer_with_critical_unknown: boolean;
      composite_null: boolean;
      ai_overlay_unresolved: boolean;
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

const ajv = new Ajv2020({ strict: true, allErrors: true });
ajv.addSchema(frameworkSchema);
const schemaId = (frameworkSchema as { $id: string }).$id;
const validators = {
  router: ajv.getSchema(`${schemaId}#/$defs/router`)!,
  module: ajv.getSchema(`${schemaId}#/$defs/module`)!,
  scoring: ajv.getSchema(`${schemaId}#/$defs/scoring`)!,
  sections: ajv.getSchema(`${schemaId}#/$defs/sections`)!,
};

function readYaml(path: string): unknown {
  return parseYaml(readFileSync(path, "utf8"));
}

function check(kind: keyof typeof validators, data: unknown, file: string, issues: string[]): void {
  const fn = validators[kind];
  if (!fn(data)) {
    for (const e of fn.errors ?? []) issues.push(`${file}: ${e.instancePath || "/"} ${e.message ?? e.keyword}`);
  }
}

/** The fact names the turn and session schemas allow. All three lists must agree. */
export function schemaFactNames(): { turn: string[]; session: string[] } {
  const turn = (turnSchema as any).$defs.fact.properties.fact.enum as string[];
  const session = (sessionSchema as any).$defs.item.properties.facts.propertyNames.enum as string[];
  return { turn, session };
}

/**
 * Loads the framework from a plugin root (the directory holding skills/ and templates/).
 * Throws FrameworkError listing every problem found.
 */
export function loadFramework(root: string): Framework {
  const issues: string[] = [];
  // The plugin keeps the framework beside its skill; the standalone kit keeps it in framework/.
  const intakeDir = existsSync(join(root, "framework")) ? join(root, "framework") : join(root, "skills", "intake");

  const router = readYaml(join(intakeDir, "router.yaml")) as Router;
  check("router", router, "router.yaml", issues);

  const scoring = readYaml(join(intakeDir, "scoring.yaml")) as Scoring;
  check("scoring", scoring, "scoring.yaml", issues);

  const sections = readYaml(join(root, "templates", "sections.yaml")) as Sections;
  check("sections", sections, "templates/sections.yaml", issues);

  const modules: Record<string, Module> = {};
  for (const file of readdirSync(join(intakeDir, "modules")).filter((f) => f.endsWith(".yaml")).sort()) {
    const mod = readYaml(join(intakeDir, "modules", file)) as Module;
    check("module", mod, `modules/${file}`, issues);
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
  const coreIds = (sessionSchema as any).properties.core.required.map((a: string) => `core.${a}`) as string[];
  const moduleCore = modules.core?.areas.map((a) => a.id) ?? [];
  if (JSON.stringify([...moduleCore].sort()) !== JSON.stringify([...coreIds].sort())) {
    issues.push(`modules/core.yaml areas (${moduleCore.join(", ")}) must match the session schema's core (${coreIds.join(", ")})`);
  }
  for (const id of scoring.gates.go_requires_core) if (!areas.has(id)) issues.push(`scoring.yaml: go_requires_core names unknown area ${id}`);

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
    for (const b of Object.keys(def.describe)) if (!(b in def.bands)) issues.push(`scoring.yaml: ${c}.describe names unknown band ${b}`);
    for (const b of Object.keys(def.bands)) if (b !== "unknown" && !(b in def.describe)) issues.push(`scoring.yaml: ${c} band ${b} has no description`);
  }
  if (scoring.thresholds.low_below_pct >= scoring.thresholds.high_min_pct) issues.push("scoring.yaml: low_below_pct must be below high_min_pct");
  for (const c of scoring.ai_overlay.dont_build_on_fail) if (!scoring.ai_overlay.checks[c]) issues.push(`scoring.yaml: dont_build_on_fail names unknown check ${c}`);
  for (const force of Object.keys(scoring.adoption.risk_when)) if (!scoring.adoption.forces.includes(force)) issues.push(`scoring.yaml: adoption.risk_when names unknown force ${force}`);

  const bandRefs: Array<[string, string, Band[]]> = [
    ["broken_cause", "gates.fix_not_build.when_cause", scoring.gates.fix_not_build.when_cause],
    ["workaround_permanent", "gates.fix_not_build.when_workaround_permanent", scoring.gates.fix_not_build.when_workaround_permanent],
    ["existing_asset", "gates.dont_build_definitive.existing_asset", scoring.gates.dont_build_definitive.existing_asset],
    ["decision_depends", "gates.dont_build_definitive.decision_depends", scoring.gates.dont_build_definitive.decision_depends],
    ["value", "gates.dont_build_definitive.value", scoring.gates.dont_build_definitive.value],
    ["stability", "gates.gather_more.stability", scoring.gates.gather_more.stability],
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

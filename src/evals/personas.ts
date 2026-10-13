// Persona cards for the evals (tests/personas/*.yaml): who the simulated user is, how they talk,
// the facts they know, and the hidden expected outcome. The simulator sees only situation and
// voice; the expectations are for scoring.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ItemType } from "../lib/framework.ts";
import type { GateDecision, Quadrant } from "../lib/session.ts";

export interface ExpectedItem {
  type: ItemType;
  /** Acceptable gates; omitted means any gate is fine. */
  gates?: GateDecision[];
}

export interface Persona {
  id: string;
  title: string;
  opening: string;
  voice: string;
  situation: string;
  expect: {
    primary_type: ItemType;
    items: ExpectedItem[];
    min_items: number;
    modifiers?: string[];
    ai_applies?: boolean;
    quadrant?: Quadrant[];
    /** For the vague persona: at least this many critical areas left unsettled on the primary item. */
    min_unknown_critical?: number;
    /** Item types that must not be created at all (not even superseded). */
    no_items?: ItemType[];
    /** Areas the interviewer itself must record on the primary item: not captured, not unknown. */
    recorded?: string[];
    /** Acceptable bands per fact on the primary item, as scoring would see them. */
    bands?: Record<string, string[]>;
  };
}

const TYPES = ["broken", "manual_process", "known_idea", "exploratory", "data_report"];
const GATES = ["go", "gather_more", "dont_build", "fix_not_build"];

export function parsePersona(text: string, file: string): Persona {
  const p = parseYaml(text) as Persona;
  const problems: string[] = [];
  for (const key of ["id", "title", "opening", "voice", "situation"] as const) if (typeof p?.[key] !== "string" || !p[key].trim()) problems.push(`${key} is required`);
  if (!p?.expect || !TYPES.includes(p.expect.primary_type)) problems.push("expect.primary_type must be an item type");
  if (!Array.isArray(p?.expect?.items) || p.expect.items.length === 0) problems.push("expect.items must list at least one item");
  for (const item of p?.expect?.items ?? []) {
    if (!TYPES.includes(item.type)) problems.push(`expected item type "${item.type}" isn't an item type`);
    for (const g of item.gates ?? []) if (!GATES.includes(g)) problems.push(`gate "${g}" isn't a gate`);
  }
  if (typeof p?.expect?.min_items !== "number") problems.push("expect.min_items is required");
  for (const t of p?.expect?.no_items ?? []) if (!TYPES.includes(t)) problems.push(`no_items type "${t}" isn't an item type`);
  if (problems.length) throw new Error(`${file}: ${problems.join("; ")}`);
  return p;
}

export function loadPersonas(dir = "tests/personas"): Persona[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => parsePersona(readFileSync(join(dir, f), "utf8"), f));
}

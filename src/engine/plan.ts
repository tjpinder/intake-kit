// Plan: code chooses every question (HANDOFF.md, Interview engine v2, step 2). The queue is
// deterministic: the type's anchor area, the remaining required core areas, the rest of the
// module's required areas, then modifier areas; then the manual-work check on the primary item;
// then a light pass on each follow-on item. A probe or a confirmation jumps the queue for its own
// area. Nothing here calls a model.

import type { Area, Framework } from "../lib/framework.ts";
import { criticalAreas, gateFactSource } from "../lib/gates.ts";
import { normalize, type TranscriptEntry } from "../lib/grounding.ts";
import { said } from "../lib/guide.ts";
import { hasNumber, sessionQuotes } from "../lib/score.ts";
import { askedKey, coverageFor, isCaptured, type Item, type Session } from "../lib/session.ts";
import type { AreaState, CheckName, EngineState, PendingKind } from "./types.ts";

const SPEC_FILES = ["SPEC.md", "ACCEPTANCE.md", "GUARDRAILS.md"];

export interface Target {
  item: string;
  /** Coverage ID, or the area a check rides on. */
  area: string;
  kind: Exclude<PendingKind, "disambiguate" | "summary">;
  check: CheckName | null;
  /** A probe with a fixed purpose: "baseline" asks what today costs. */
  purpose?: "baseline";
}

const modulesOf = (item: Item) => ["core", item.type, ...item.modifiers.map((m) => `mod.${m}`)];
const areasIn = (fw: Framework, mods: string[]): Area[] => mods.flatMap((m) => fw.modules[m]?.areas ?? []);

/**
 * The areas an item must have asked before the summary: critical, always-ask (and the module's
 * asks_core), a band source, or the only area feeding a spec-pack section (so every templated
 * section has a required source, or renders as an open question).
 */
export function requiredAreas(item: Item, fw: Framework): Set<string> {
  const mods = modulesOf(item);
  const areas = areasIn(fw, mods);
  const ids = new Set<string>(criticalAreas(item, fw));
  for (const a of areas) if (a.always_ask) ids.add(a.id);
  for (const m of mods) for (const id of (fw.modules[m]?.asks_core as string[] | undefined) ?? []) ids.add(id);
  const applies = new Set(areas.map((a) => a.id));
  for (const c of Object.values(fw.scoring.criteria)) {
    const src = c.usually_from.find((id) => applies.has(id));
    if (src) ids.add(src);
  }
  // A gate reason must rest on an area that was asked, so each gate fact's source is required.
  for (const fact of Object.keys(fw.scoring.gate_facts)) {
    const src = gateFactSource(fact, item, fw);
    if (src) ids.add(src);
  }
  const feeders = new Map<string, string[]>();
  for (const a of areas) for (const f of a.feeds) if (SPEC_FILES.includes(f.file)) feeders.set(`${f.file}#${f.section}`, [...(feeders.get(`${f.file}#${f.section}`) ?? []), a.id]);
  for (const list of feeders.values()) if (list.length === 1) ids.add(list[0]);
  return ids;
}

/** The questions a follow-on (spawned) item gets: a light pass, from the check that spawned it. */
export function lightPass(item: Item, fw: Framework): string[] {
  const c = fw.router.checks;
  const list = item.type === c?.manual_work.spawns ? c.manual_work.light_pass : (c?.existing_asset.light_pass ?? []);
  const applies = new Set(areasIn(fw, modulesOf(item)).map((a) => a.id));
  return list.filter((id) => applies.has(id));
}

/** The ordered queue of areas for an item (before probes, confirmations and checks). */
export function queueFor(item: Item, fw: Framework): string[] {
  if (item.spawned_from) return lightPass(item, fw);
  const req = requiredAreas(item, fw);
  const anchor = fw.modules[item.type]?.anchor as string | undefined;
  const out: string[] = [];
  const add = (id: string) => { if (req.has(id) && !out.includes(id)) out.push(id); };
  if (anchor) { req.add(anchor); add(anchor); }
  for (const a of fw.modules.core.areas) add(a.id);
  for (const a of fw.modules[item.type]?.areas ?? []) add(a.id);
  for (const m of item.modifiers) for (const a of fw.modules[`mod.${m}`]?.areas ?? []) add(a.id);
  return out;
}

export const stateOf = (engine: EngineState, key: string): AreaState => engine.areas[key] ?? { probed: false, confirm: "none", partial: null };
export const areaKey = (item: Item, area: string) => askedKey(item.id, area)!;

/** An area needs nothing more: answered, ruled out, or resolved after its one probe and confirmation. */
export function areaDone(session: Session, item: Item, area: string, fw: Framework): boolean {
  const e = coverageFor(session, item, area);
  const st = stateOf(session.session.engine!, areaKey(item, area));
  if (!e?.updated_at || isCaptured(e)) return false;
  if (st.partial && !st.probed) return false;
  if (e.status === "assumed" && criticalAreas(item, fw).includes(area) && st.confirm !== "done") return false;
  return true;
}

/** The manual-work check applies: work done by hand was mentioned (not negated), and nothing covers it yet. */
export function manualCheckDue(session: Session, item: Item, fw: Framework, transcript: TranscriptEntry[]): boolean {
  const c = fw.router.checks?.manual_work;
  if (!c || !c.applies_to.includes(item.type) || item.spawned_from) return false;
  if (session.items.some((i) => i.type === c.spawns)) return false;
  const check = session.session.engine!.checks[`${item.id}:manual_work`];
  if (check && (check.result === "yes" || check.result === "no" || check.asks >= 2)) return false;
  const text = normalize(transcript.filter((t) => t.role === "user").map((t) => t.text).join("\n"));
  return fw.router.types[c.spawns].signals.some((s) => said(s, text));
}

/** The next question, chosen by code. Null when the interview has nothing left to ask. */
export function nextTarget(session: Session, fw: Framework, transcript: TranscriptEntry[]): Target | null {
  const engine = session.session.engine!;
  const live = session.items.filter((i) => !i.superseded_by && !i.dropped || i.spawned_from);
  const primary = session.items.find((i) => !i.spawned_from && !i.dropped);
  const existing = new Set(fw.router.checks?.existing_asset.areas ?? []);
  const forItem = (item: Item): Target | null => {
    for (const area of queueFor(item, fw)) {
      // The outcome is answered but nothing anyone said has a number attached to a unit: its one
      // probe asks what today costs, so a baseline can exist (persona 1 never heard "four hours").
      if (area === "core.outcome" && !item.spawned_from && areaDone(session, item, area, fw)) {
        const st = stateOf(engine, areaKey(item, area));
        const e = coverageFor(session, item, area);
        if (!st.probed && e?.status !== "not_applicable" && e?.status !== "declined" && !sessionQuotes(session).some(hasNumber)) return { item: item.id, area, kind: "probe", check: null, purpose: "baseline" };
      }
      if (areaDone(session, item, area, fw)) continue;
      const st = stateOf(engine, areaKey(item, area));
      const e = coverageFor(session, item, area);
      // A probe or confirmation jumps the queue for its own area.
      if (st.partial && !st.probed) return { item: item.id, area, kind: "probe", check: null };
      if (e?.updated_at && e.status === "assumed" && st.confirm === "none") return { item: item.id, area, kind: "confirm", check: null };
      if (e?.updated_at) continue;
      return { item: item.id, area, kind: existing.has(area) ? "check" : "ask", check: existing.has(area) ? "existing_asset" : null };
    }
    return null;
  };
  if (primary) {
    const t = forItem(primary);
    if (t) return t;
    if (manualCheckDue(session, primary, fw, transcript)) return { item: primary.id, area: fw.modules[primary.type]?.anchor as string, kind: "check", check: "manual_work" };
  }
  for (const item of live.filter((i) => i.spawned_from && !i.dropped)) {
    const t = forItem(item);
    if (t) return t;
  }
  return null;
}

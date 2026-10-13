// Scoring: band picks in, numbers out. Every number comes from scoring.yaml; nothing here
// is a tunable constant.

import type { Framework } from "./framework.ts";
import { coverageFor, isCaptured, type CheckResult, type Item, type Quadrant, type Scoring, type Session } from "./session.ts";

export type Level = "high" | "medium" | "low";

export class ScoringError extends Error {}

/** The band picked for a fact, or "unknown" if none was picked. Throws on a band the framework doesn't define. */
export function bandOf(item: Item, fact: string, fw: Framework): string {
  const band = item.facts[fact]?.band ?? "unknown";
  const allowed = fw.factBands.get(fact);
  if (!allowed) throw new ScoringError(`${item.id}: fact "${fact}" isn't defined in scoring.yaml`);
  if (!allowed.includes(band)) throw new ScoringError(`${item.id}: "${band}" isn't a band of ${fact} (allowed: ${allowed.join(", ")})`);
  return band;
}

/**
 * The band a fact may be scored on. A band whose evidence answers were all captured from replies
 * the interviewer didn't record is unknown: a captured reply is the user's words, but nobody
 * judged what it answers, so it can't carry a score.
 */
export function usableBand(session: Session, item: Item, fact: string): string {
  const f = item.facts[fact];
  if (!f) return "unknown";
  const answered = f.evidence.map((id) => coverageFor(session, item, id)).filter((e) => e?.updated_at);
  return answered.length > 0 && answered.every(isCaptured) ? "unknown" : f.band;
}

/** The item as scoring sees it: facts resting only on captured replies are dropped. */
export function scoringView(session: Session, item: Item): Item {
  const facts = Object.fromEntries(Object.entries(item.facts).filter(([fact]) => usableBand(session, item, fact) === item.facts[fact].band));
  return Object.keys(facts).length === Object.keys(item.facts).length ? item : { ...item, facts };
}

/**
 * Rescales a 1-5 mean to 0-1 with (mean - 1) / 4 and compares with the thresholds.
 * Rounded to 6 places first so 3.6 lands on 0.65 exactly despite floating point.
 */
export function levelOf(mean: number, fw: Framework): Level {
  const pct = Math.round(((mean - 1) / 4) * 1e6) / 1e6;
  if (pct >= fw.scoring.thresholds.high_min_pct) return "high";
  if (pct < fw.scoring.thresholds.low_below_pct) return "low";
  return "medium";
}

export function quadrantOf(automation: Level, ease: Level): Quadrant {
  if (automation === "high" && ease === "high") return "prioritize";
  if ((automation === "low" && ease !== "high") || (ease === "low" && automation !== "high")) return "defer";
  return "review";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function scoreItem(item: Item, fw: Framework): Scoring {
  const s = fw.scoring;

  const criteria: Scoring["criteria"] = {};
  for (const [name, def] of Object.entries(s.criteria)) {
    const band = bandOf(item, name, fw);
    criteria[name] = { score: def.bands[band] ?? null, band, evidence: item.facts[name]?.evidence ?? [] };
  }

  const composite = (name: "automation_potential" | "ease"): number | null => {
    let total = 0;
    let weight = 0;
    let known = 0;
    for (const [c, w] of Object.entries(s.composites[name].criteria)) {
      const score = criteria[c]?.score;
      if (score == null) continue;
      total += score * w;
      weight += w;
      known += 1;
    }
    return known >= s.min_known_per_composite ? round2(total / weight) : null;
  };
  const automation_potential = composite("automation_potential");
  const ease = composite("ease");
  const quadrant =
    automation_potential == null || ease == null ? null : quadrantOf(levelOf(automation_potential, fw), levelOf(ease, fw));

  const applies = s.ai_overlay.applies_bands[bandOf(item, s.ai_overlay.applies_fact, fw)] ?? false;
  const checks: Record<string, CheckResult> = {};
  if (applies) for (const check of Object.keys(s.ai_overlay.checks)) checks[check] = bandOf(item, check, fw) as CheckResult;

  let adoption: Scoring["adoption"] = null;
  if (s.adoption.applies_to.includes(item.type)) {
    adoption = { push: "", pull: "", anxiety: "", habit: "" };
    for (const force of s.adoption.forces as Array<keyof NonNullable<Scoring["adoption"]>>) adoption[force] = bandOf(item, force, fw);
  }

  return { criteria, automation_potential, ease, quadrant, ai_overlay: { applies, checks }, adoption, rules_version: s.rules_version };
}

/** True when the AI overlay applies and every check passed. */
export function aiOverlayPasses(scoring: Scoring): boolean {
  return scoring.ai_overlay.applies && Object.values(scoring.ai_overlay.checks).every((c) => c === "pass");
}

/** Forces the adoption rules flag as risks, e.g. weak push or strong habit. */
export function adoptionRisks(scoring: Scoring, fw: Framework): string[] {
  if (!scoring.adoption) return [];
  return Object.entries(fw.scoring.adoption.risk_when)
    .filter(([force, bands]) => bands.includes(scoring.adoption![force as keyof NonNullable<Scoring["adoption"]>]))
    .map(([force]) => force);
}

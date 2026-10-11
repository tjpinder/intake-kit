// What the guardrail checks are and how they're configured. Pure, so rendering (and the web
// app) can describe the checks without pulling in the Node-only check runner in checks.ts.

export const CHECK_IDS = ["traceability", "eval_gate", "kill_criteria", "flagged_paths", "open_assumptions"] as const;
export type CheckId = (typeof CHECK_IDS)[number];
export type CheckStatus = "pass" | "fail" | "skipped" | "error" | "off";

export const CHECK_LABELS: Record<CheckId, string> = {
  traceability: "Every SPEC and ACCEPTANCE requirement cites a real answer in the user's words",
  eval_gate: "Items that use an LLM have an eval set, and the evals pass",
  kill_criteria: "Kill criteria and fallback are written down in GUARDRAILS.md",
  flagged_paths: "Pull requests touching flagged paths carry the review label",
  open_assumptions: "Every assumption in DECISIONS.md has an owner",
};

export interface ChecksConfig {
  version: 1;
  enabled: CheckId[];
  flagged_paths: string[];
  review_label: string;
  eval_command: string | null;
  evals_dir: string;
}

export const DEFAULT_CONFIG: ChecksConfig = {
  version: 1,
  enabled: [...CHECK_IDS],
  flagged_paths: [],
  review_label: "needs-review",
  eval_command: null,
  evals_dir: "evals",
};

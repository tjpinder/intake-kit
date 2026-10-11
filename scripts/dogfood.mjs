// Holds the kit to its own guardrails: renders the worked example into a temp repo, gives its
// one assumption an owner (as a real team would), and runs the bundled checks on it. Fails if
// any check fails or errors. Replaced by examples/pick-exception-report/ once that exists.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "intake-kit-dogfood-"));
try {
  writeFileSync(join(dir, "intake-answers.yaml"), readFileSync("tests/fixtures/session/pick-exception-scored.yaml"));
  const render = spawnSync(process.execPath, [resolve("dist/intake.mjs"), "render", "--dir", dir], { encoding: "utf8" });
  if (render.status !== 0) throw new Error(`render failed:\n${render.stdout}${render.stderr}`);
  const decisions = join(dir, "DECISIONS.md");
  writeFileSync(decisions, readFileSync(decisions, "utf8").replace("Owner: _unassigned_", "Owner: Ops supervisor"));
  const check = spawnSync(process.execPath, [resolve("dist/check.mjs"), "run", "--dir", dir], { encoding: "utf8" });
  process.stdout.write(check.stdout);
  if (check.status !== 0) throw new Error("the worked example fails its own guardrails");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

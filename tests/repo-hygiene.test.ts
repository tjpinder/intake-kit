// Repo-level acceptance criteria that are easy to break by accident.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// What could be published: tracked files plus new files git doesn't ignore. Ignored local
// files (private notes, intake state) are out of scope.
const repoFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && existsSync(f));

test("no code, config, dependency or workflow references TIF or the integrity CLI", () => {
  // HANDOFF.md records the decision to decouple, and the docs may credit TIF as an influence.
  const allowed = (f: string) => f === "HANDOFF.md" || f.startsWith("docs/") || f === "tests/repo-hygiene.test.ts";
  const pattern = /integrity-cli|startvest|theintegrityframework|\bTIF\b|INTEGRITY\.md/i;
  const hits = repoFiles.filter((f) => !allowed(f) && pattern.test(readFileSync(f, "utf8")));
  assert.deepEqual(hits, []);
});

test("no secrets or credentials are committed", () => {
  const pattern = /(sk-ant-[a-z0-9-]{20,}|sk-[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,})/;
  const hits = repoFiles.filter((f) => !f.endsWith(".mjs") || f.startsWith("scripts/")).filter((f) => pattern.test(readFileSync(f, "utf8")));
  assert.deepEqual(hits, []);
});

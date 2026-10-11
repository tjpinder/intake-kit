// Repo-level acceptance criteria that are easy to break by accident.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIRS = new Set([".git", "node_modules"]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (SKIP_DIRS.has(name)) return [];
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const repoFiles = files(".").map((f) => relative(".", f).replace(/\\/g, "/"));

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

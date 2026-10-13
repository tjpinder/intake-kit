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

test("no file anywhere in the repo, docs included, references an outside guardrail framework or its CLI", () => {
  // The names are stored encoded, so this test doesn't contain the references it forbids.
  const names = ["dGhlaW50ZWdyaXR5ZnJhbWV3b3Jr", "aW50ZWdyaXR5LWNsaQ==", "c3RhcnR2ZXN0LWludGVncml0eQ==", "SU5URUdSSVRZLm1k"].map((b) => Buffer.from(b, "base64").toString("utf8"));
  const acronym = Buffer.from("VElG", "base64").toString("utf8");
  const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${names.map(escape).join("|")}|\\b${acronym}\\b`, "i");
  // The pattern really matches: a check that passes vacuously proves nothing.
  assert.ok(pattern.test(`see ${names[0]} for details`) && pattern.test(`the ${acronym} rules`) && !pattern.test("motif"));
  const text = repoFiles.filter((f) => !/\.(png|jpe?g|gif|ico|webp|zip|bundle)$/i.test(f));
  const hits = text.filter((f) => pattern.test(readFileSync(f, "utf8")));
  assert.deepEqual(hits, []);
});

test("no secrets or credentials are committed", () => {
  const pattern = /(sk-ant-[a-z0-9-]{20,}|sk-[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,})/;
  const hits = repoFiles.filter((f) => !f.endsWith(".mjs") || f.startsWith("scripts/")).filter((f) => pattern.test(readFileSync(f, "utf8")));
  assert.deepEqual(hits, []);
});

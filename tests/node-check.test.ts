import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { meetsMinimum, versionError, nodeVersionBanner, MIN_NODE_MAJOR } from "../src/lib/node-check.ts";

test("meetsMinimum accepts the minimum and later majors", () => {
  assert.equal(meetsMinimum("22.0.0"), true);
  assert.equal(meetsMinimum("v24.21.0"), true);
});

test("meetsMinimum rejects older or unparseable versions", () => {
  assert.equal(meetsMinimum("20.19.0"), false);
  assert.equal(meetsMinimum("v18.0.0"), false);
  assert.equal(meetsMinimum("garbage"), false);
});

test("versionError names the minimum and the version found", () => {
  assert.equal(
    versionError("20.1.0"),
    `intake-kit needs Node ${MIN_NODE_MAJOR} or later (found 20.1.0). Install it from https://nodejs.org`,
  );
});

test("banner exits 1 with the message when Node is too old", () => {
  // Run the banner with the minimum set above the running Node, so it must refuse.
  const tooHigh = Number(process.versions.node.split(".")[0]) + 1;
  let failed: { status: number; stderr: string } | undefined;
  try {
    execFileSync(process.execPath, ["-e", nodeVersionBanner(tooHigh)], { stdio: "pipe" });
  } catch (err) {
    const e = err as { status: number; stderr: Buffer };
    failed = { status: e.status, stderr: e.stderr.toString() };
  }
  assert.ok(failed, "banner should have exited non-zero");
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, new RegExp(`needs Node ${tooHigh} or later`));
});

test("every dist script starts with the version guard and runs", () => {
  const scripts = readdirSync("dist").filter((f) => f.endsWith(".mjs"));
  assert.ok(scripts.length > 0, "run `npm run build` first");
  for (const f of scripts) {
    assert.ok(readFileSync(`dist/${f}`, "utf8").startsWith("// intake-kit: Node version guard"), `${f} is missing the guard`);
  }
  const out = execFileSync(process.execPath, ["dist/doctor.mjs"], { encoding: "utf8" });
  assert.match(out, /^intake-kit \d+\.\d+\.\d+ ready \(node /);
});

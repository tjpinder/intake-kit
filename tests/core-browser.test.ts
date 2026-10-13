// The web app runs src/core.ts in the browser. Bundle it for the browser platform and run it
// the way the app will: framework from YAML text, the worked example replayed, files rendered.

import { parse as parseYaml } from "yaml";
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readFrameworkSources, readTemplates } from "../src/lib/framework-fs.ts";
import { emptyV2Session, scriptedProvider, type V2Step } from "./helpers.ts";

test("src/core.ts bundles for the browser with no Node built-ins", async () => {
  const result = await build({
    entryPoints: ["src/core.ts"],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  assert.doesNotMatch(code, /from\s*["']node:|require\(["']node:/, "a Node built-in reached the browser bundle");
  assert.ok(code.length < 1_500_000, `browser bundle is ${code.length} bytes`);
});

test("the browser core runs a full intake from YAML text: replay, score, gate, render", async () => {
  // Import the core exactly as the app will (no fs inside it); the test reads the files.
  const core = await import("../src/core.ts");
  const fw = core.buildFramework(readFrameworkSources("."), { parseYaml });
  const convo = JSON.parse(readFileSync("tests/fixtures/conversations/pick-exception.json", "utf8"));

  let session = emptyV2Session("2026-10-11-a1b2");
  // In the app the transcript is the chat itself: every user message, exactly as typed.
  const transcript: import("../src/core.ts").TranscriptEntry[] = [];
  const replies: string[] = [];
  for (const [i, step] of (convo.steps as V2Step[]).entries()) {
    transcript.push({ role: "user", text: step.user, at: `2026-10-11T12:${String(i * 2).padStart(2, "0")}:00.000Z` });
    const now = `2026-10-11T12:${String(i * 2 + 1).padStart(2, "0")}:00.000Z`;
    const r = await core.runEngineTurn({ provider: scriptedProvider(step), fw, session, transcript, replies, now: () => now });
    assert.equal(r.result, "applied", `step ${i}`);
    session = r.session;
    replies.push(r.reply);
  }

  assert.deepEqual(session.items.map((i) => i.gate?.decision), ["go", "dont_build"]);
  const files = core.renderAll(session, fw, readTemplates("."));
  assert.ok(files.get("SPEC.md")!.includes('[core.users] "I build it, the three shift leads use it on Tuesday, and the DC manager signs off on retraining"'));
  assert.equal(core.statusOf(session, fw).reflect_back, "confirmed");
});

test("every template and YAML file the app must bundle exists", () => {
  assert.ok(readdirSync("templates").filter((f) => f.endsWith(".md")).length >= 10);
  assert.ok(readdirSync(join("skills", "intake", "modules")).length >= 9);
});

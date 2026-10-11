// The web app runs src/core.ts in the browser. Bundle it for the browser platform and run it
// the way the app will: framework from YAML text, the worked example replayed, files rendered.

import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readFrameworkSources, readTemplates } from "../src/lib/framework-fs.ts";

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
  const fw = core.buildFramework(readFrameworkSources("."));
  const convo = JSON.parse(readFileSync("tests/fixtures/conversations/pick-exception.json", "utf8"));

  let session: import("../src/core.ts").Session = {
    schema_version: 1,
    framework_version: fw.router.framework_version,
    session: { id: "2026-10-11-a1b2", started_at: "2026-10-11T12:00:00.000Z", mode: "stakeholder", provider: "azure-openai", grounding: "transcript", reflect_back: null },
    core: Object.fromEntries(["users", "outcome", "data", "systems", "constraints", "trust"].map((k) => [k, { status: "unknown", value: null, quotes: [], probe_count: 0 }])) as any,
    items: [],
  };
  // In the app the transcript is the chat itself: every user message, exactly as typed.
  const transcript: import("../src/core.ts").TranscriptEntry[] = [];
  convo.steps.forEach((step: { user: string; turn: object }, i: number) => {
    transcript.push({ role: "user", text: step.user, at: `2026-10-11T12:${String(i * 2).padStart(2, "0")}:00.000Z` });
    const now = `2026-10-11T12:${String(i * 2 + 1).padStart(2, "0")}:00.000Z`;
    const r = core.applyTurn(session, step.turn, { fw, transcript, now });
    assert.deepEqual(r.rejections, [], `step ${i}`);
    session = r.session;
  });

  assert.deepEqual(session.items.map((i) => i.gate?.decision), ["go", "dont_build"]);
  const files = core.renderAll(session, fw, readTemplates("."));
  assert.ok(files.get("SPEC.md")!.includes('[core.users] "I build it, the shift leads use it Tuesday"'));
  assert.equal(core.statusOf(session, fw).reflect_back, "confirmed");
});

test("every template and YAML file the app must bundle exists", () => {
  assert.ok(readdirSync("templates").filter((f) => f.endsWith(".md")).length >= 10);
  assert.ok(readdirSync(join("skills", "intake", "modules")).length >= 9);
});

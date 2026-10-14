import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadFramework, readTemplates } from "../src/lib/framework-fs.ts";
import { gateBlurb, renderAll, RenderError } from "../src/lib/render.ts";
import { scoreAndGate } from "../src/lib/gates.ts";
import { lineDiff } from "../src/lib/diff.ts";
import { writeSession } from "../src/lib/state.ts";
import { coverageFor, type Session } from "../src/lib/session.ts";
import { makeItem, makeSession, unknown, covered } from "./helpers.ts";

const fw = loadFramework(".");
const fixture = (): Session => parseYaml(readFileSync("tests/fixtures/session/pick-exception-scored.yaml", "utf8"));
const render = (s: Session) => renderAll(s, fw, readTemplates("."));
const gated = (...args: Parameters<typeof makeSession>) => scoreAndGate(makeSession(...args), fw).session;

describe("golden files", () => {
  const golden = "tests/golden/pick-exception";
  const out = render(fixture());

  test("renders exactly the golden file set", () => {
    assert.deepEqual([...out.keys()].sort(), readdirSync(golden).sort());
  });

  for (const file of readdirSync(golden)) {
    test(`${file} matches byte for byte`, () => {
      const expected = readFileSync(join(golden, file), "utf8");
      const actual = out.get(file)!;
      if (actual !== expected) {
        const a = actual.split("\n");
        const e = expected.split("\n");
        const line = a.findIndex((l, i) => l !== e[i]);
        assert.fail(`${file} differs at line ${line + 1}:\n  expected: ${e[line]}\n  actual:   ${a[line]}\nIf the change is intended, run npm run golden:update and review the diff.`);
      }
    });
  }

  test("rendering is deterministic", () => {
    assert.deepEqual([...render(fixture())], [...out]);
  });
});

describe("traceability: every SPEC and ACCEPTANCE requirement cites a real coverage ID and the user's words", () => {
  const session = fixture();
  const out = render(session);
  const CITE = /\[([a-z0-9_.]+)\] "(.*?)"(?= · \[|$)/g;

  for (const file of ["SPEC.md", "ACCEPTANCE.md"]) {
    test(file, () => {
      let section = "";
      let checked = 0;
      for (const line of out.get(file)!.split("\n")) {
        if (line.startsWith("## ")) section = line.slice(3);
        if (!line.startsWith("- ")) continue;
        if (section === "Open questions") {
          const id = line.match(/\[([a-z0-9_.]+)\]$/)?.[1];
          assert.ok(id && fw.areas.has(id), `open question without a valid area: ${line}`);
          continue;
        }
        const cites = [...line.matchAll(CITE)];
        assert.ok(cites.length > 0, `uncited requirement in ${file} / ${section}: ${line}`);
        for (const [, id, quote] of cites) {
          assert.ok(fw.areas.has(id), `unknown coverage ID ${id}`);
          const found = session.items.some((item) => coverageFor(session, item, id)?.quotes.includes(quote));
          assert.ok(found, `"${quote}" isn't a recorded quote for ${id}`);
          checked++;
        }
      }
      assert.ok(checked >= 3, `expected several citations in ${file}, found ${checked}`);
    });
  }
});

describe("templates and sections.yaml agree", () => {
  for (const [file, sections] of Object.entries(fw.sections)) {
    test(file, () => {
      const text = readFileSync(join("templates", file), "utf8");
      const placeholders = [...text.matchAll(/\{\{section:([a-z_]+)\}\}/g)].map((m) => m[1]);
      assert.deepEqual(placeholders.sort(), [...sections].sort());
    });
  }
});

describe("which files each gate produces", () => {
  test("only Go items get the spec pack", () => {
    const out = render(gated([makeItem("item-1", { facts: { existing_asset: "covers" } })]));
    assert.deepEqual([...out.keys()], ["DECISIONS.md"]);
    assert.match(out.get("DECISIONS.md")!, /Don't build[\s\S]*Revisit if/);
  });

  test("Gather more gets a discovery brief with reasons and open questions, not a pack", () => {
    const item = makeItem("item-1", { coverage: { "data_report.truth": { ...unknown(), updated_at: "2026-10-10T10:00:00Z" } } });
    const neverAsked = { status: "unknown" as const, value: null, quotes: [], probe_count: 0 };
    const out = render(gated([item], { core: { trust: neverAsked } }));
    assert.deepEqual([...out.keys()].sort(), ["DECISIONS.md", "DISCOVERY_BRIEF.md"]);
    const brief = out.get("DISCOVERY_BRIEF.md")!;
    assert.match(brief, /Critical area core\.trust isn't covered/);
    assert.match(brief, /Not yet asked: Cost of a wrong output.*\[core\.trust\]/);
    assert.match(brief, /Still unknown: Which system's number wins.*\[data_report\.truth\]/);
  });

  test("Fix, not build gets a diagnostic brief with a fix ticket", () => {
    const item = makeItem("item-1", {
      type: "broken",
      facts: { broken_cause: "config" },
      coverage: { "broken.cause": covered("A mapping changed in the EDI setup"), "broken.symptom": covered("Orders missing from the WMS") },
    });
    const out = render(gated([item]));
    assert.deepEqual([...out.keys()].sort(), ["DECISIONS.md", "DIAGNOSTIC_BRIEF.md"]);
    const brief = out.get("DIAGNOSTIC_BRIEF.md")!;
    assert.match(brief, /## Fix ticket\n\n\*\*Item item-1\*\*: config cause\.\n\n- A mapping changed in the EDI setup \[broken\.cause\]/);
    assert.match(brief, /## Symptom\n\n- Orders missing from the WMS \[broken\.symptom\]/);
  });

  test("an exploratory session gets a ranked backlog", () => {
    const explore = makeItem("item-1", { type: "exploratory", superseded_by: null });
    const go = makeItem("item-2");
    const weak = makeItem("item-3", { facts: { documentation: "none", steps_apps: "over_100" }, mitigation: "Pilot first" });
    const out = render(gated([explore, go, weak]));
    const backlog = out.get("BACKLOG.md")!;
    assert.match(backlog, /1\. \*\*Item item-2\*\*[^\n]*Go, prioritize\n2\. \*\*Item item-3\*\*[^\n]*Go, review/);
  });

  test("several Go items each get their own subsection", () => {
    const out = render(gated([makeItem("item-1"), makeItem("item-2")]));
    assert.match(out.get("SPEC.md")!, /### Item item-1 \(`item-1`\)[\s\S]*### Item item-2 \(`item-2`\)/);
  });

  test("nothing renders before the reflect-back is confirmed", () => {
    assert.throws(() => render(makeSession([makeItem("item-1")], { confirmed: false })), RenderError);
  });

  test("an empty section says so instead of rendering blank", () => {
    const out = render(gated([makeItem("item-1")]));
    assert.match(out.get("GUARDRAILS.md")!, /## Kill criteria\n\n_Nothing recorded\._/);
  });
});

describe("line diff", () => {
  test("marks removed and added lines, collapses distant context", () => {
    const before = ["a", "b", "c", "d", "e", "f", "g", "h"].join("\n");
    const after = ["a", "b", "c", "d", "e", "f", "G", "h"].join("\n");
    assert.equal(lineDiff(before, after), ["  …", "  e", "  f", "- g", "+ G", "  h"].join("\n"));
  });
});

describe("render command", () => {
  const dirs: string[] = [];
  after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
  const run = (dir: string, ...args: string[]) => {
    const r = spawnSync(process.execPath, [resolve("dist/intake.mjs"), "render", "--dir", dir, ...args], { encoding: "utf8" });
    return { status: r.status, body: JSON.parse(r.stdout || "null"), stderr: r.stderr };
  };
  function repoWithSession(session: Session) {
    const dir = mkdtempSync(join(tmpdir(), "intake-kit-render-"));
    dirs.push(dir);
    writeSession(dir, session);
    return dir;
  }

  test("writes new files, then leaves identical ones alone", () => {
    const dir = repoWithSession(fixture());
    const first = run(dir);
    assert.equal(first.status, 0, first.stderr);
    assert.ok(first.body.files.every((f: { status: string }) => f.status === "written"));
    assert.equal(readFileSync(join(dir, "SPEC.md"), "utf8"), readFileSync("tests/golden/pick-exception/SPEC.md", "utf8"));
    const second = run(dir);
    assert.ok(second.body.files.every((f: { status: string }) => f.status === "unchanged"));
  });

  test("an existing file that would change is staged with a diff, not overwritten", () => {
    const dir = repoWithSession(fixture());
    writeFileSync(join(dir, "CLAUDE.md"), "# My own CLAUDE.md\n\nHand-written notes.\n");
    const r = run(dir);
    assert.equal(r.status, 5);
    const claude = r.body.files.find((f: { file: string }) => f.file === "CLAUDE.md");
    assert.equal(claude.status, "needs_confirmation");
    assert.match(claude.diff, /- Hand-written notes\./);
    assert.ok(existsSync(claude.staged));
    assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf8"), "# My own CLAUDE.md\n\nHand-written notes.\n");
    assert.equal(readFileSync(join(dir, "SPEC.md"), "utf8").length > 0, true, "other files are still written");
  });

  test("--overwrite replaces only the named file", () => {
    const dir = repoWithSession(fixture());
    writeFileSync(join(dir, "CLAUDE.md"), "mine\n");
    writeFileSync(join(dir, "SPEC.md"), "also mine\n");
    const r = run(dir, "--overwrite", "CLAUDE.md");
    assert.equal(r.status, 5);
    assert.notEqual(readFileSync(join(dir, "CLAUDE.md"), "utf8"), "mine\n");
    assert.equal(readFileSync(join(dir, "SPEC.md"), "utf8"), "also mine\n");
  });

  test("CRLF line endings alone don't count as a change", () => {
    const dir = repoWithSession(fixture());
    run(dir);
    const spec = join(dir, "SPEC.md");
    writeFileSync(spec, readFileSync(spec, "utf8").replace(/\n/g, "\r\n"));
    assert.equal(run(dir).body.files.find((f: { file: string }) => f.file === "SPEC.md").status, "unchanged");
  });

  test("refuses before the reflect-back is confirmed, and rejects unknown --overwrite targets", () => {
    const unconfirmed = makeSession([makeItem("item-1")], { confirmed: false });
    assert.equal(run(repoWithSession(unconfirmed)).status, 4);
    assert.equal(run(repoWithSession(fixture()), "--overwrite", "README.md").status, 4);
  });
});

describe("render ledger", () => {
  const dirs: string[] = [];
  after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
  const run = (dir: string, ...args: string[]) => {
    const r = spawnSync(process.execPath, [resolve("dist/intake.mjs"), "render", "--dir", dir, ...args], { encoding: "utf8" });
    return { status: r.status, body: JSON.parse(r.stdout || "null") };
  };
  const statusOf = (body: { files: Array<{ file: string; status: string }> }, file: string) => body.files.find((f) => f.file === file)?.status;
  function repoWith(claude?: string) {
    const dir = mkdtempSync(join(tmpdir(), "intake-kit-ledger-"));
    dirs.push(dir);
    writeSession(dir, fixture());
    if (claude) writeFileSync(join(dir, "CLAUDE.md"), claude);
    return dir;
  }

  test("--keep stops the question until the proposed content changes", () => {
    const dir = repoWith("mine\n");
    assert.equal(run(dir).status, 5);
    const kept = run(dir, "--keep", "CLAUDE.md");
    assert.equal(kept.status, 0);
    assert.equal(statusOf(kept.body, "CLAUDE.md"), "kept");
    assert.equal(statusOf(run(dir).body, "CLAUDE.md"), "kept", "not asked again");
    assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf8"), "mine\n");

    mkdirSync(join(dir, ".intake-kit"), { recursive: true });
    writeFileSync(join(dir, ".intake-kit", "checks.json"), JSON.stringify({ version: 1, flagged_paths: ["sql/**"] }));
    // CLAUDE.md's generated content doesn't depend on checks.json, so it stays kept; GUARDRAILS.md
    // was written by intake-kit and is untouched, so it's refreshed without asking.
    const after = run(dir);
    assert.equal(statusOf(after.body, "CLAUDE.md"), "kept");
    assert.equal(statusOf(after.body, "GUARDRAILS.md"), "updated");
  });

  test("a file found identical is recorded, so later changes refresh it silently", () => {
    const dir = repoWith();
    run(dir);
    rmSync(join(dir, ".intake-kit", "rendered.json")); // as if rendered by an older version
    assert.equal(statusOf(run(dir).body, "GUARDRAILS.md"), "unchanged");
    writeFileSync(join(dir, ".intake-kit", "checks.json"), JSON.stringify({ version: 1, flagged_paths: ["sql/**"] }));
    assert.equal(statusOf(run(dir).body, "GUARDRAILS.md"), "updated");
  });

  test("--overwrite and --keep on the same file is refused", () => {
    assert.equal(run(repoWith("mine\n"), "--overwrite", "CLAUDE.md", "--keep", "CLAUDE.md").status, 4);
  });
});

describe("Gather more: the brief always has open questions, and the card matches it (enablement live test)", () => {
  const fwG = loadFramework(".");
  const tplG = readTemplates(".");
  const enablement = () => {
    const s = parseYaml(readFileSync("tests/fixtures/session/enablement-live-gather-more.yaml", "utf8"));
    for (const item of s.items) { item.scoring = null; item.gate = null; item.open_questions = []; }
    return scoreAndGate(s, fwG).session;
  };

  test("one open question per unknown or vague critical fact, with who can answer and what would settle it", () => {
    const s = enablement();
    const item = s.items[0];
    assert.equal(item.gate!.decision, "gather_more");
    const qs = item.open_questions.map((q) => q.question);
    assert.ok(qs.some((q) => q.startsWith("What decision or outcome depends on this")), qs.join(" | "));
    assert.ok(qs.some((q) => q.startsWith("What number would show this worked")), qs.join(" | "));
    assert.ok(qs.some((q) => q.startsWith("What is the current way costing")), qs.join(" | "));
    for (const q of item.open_questions) assert.ok(q.who_can_answer && q.artifact_needed, q.question);
    const brief = new Map(renderAll(s, fwG, tplG)).get("DISCOVERY_BRIEF.md")!;
    assert.doesNotMatch(brief, /_Nothing recorded\._/);
    assert.match(brief, /Who can answer: .*What would settle it: /);
  });

  test("the card's line and the brief can't disagree", () => {
    const cases = [enablement()];
    const bare = enablement();
    bare.items[0].open_questions = [];
    cases.push(bare);
    for (const s of cases) {
      const item = s.items[0];
      const brief = new Map(renderAll(s, fwG, tplG)).get("DISCOVERY_BRIEF.md")!;
      const section = brief.slice(brief.indexOf("Open questions:"));
      const lines = section.split("\n").filter((l) => l.startsWith("- "));
      const blurb = gateBlurb(s, item, fwG);
      if (lines.length === 0) assert.doesNotMatch(blurb, /lists/, blurb);
      else {
        assert.match(blurb, new RegExp(`lists ${lines.length} open question`), blurb);
        if (/who can answer/.test(blurb)) assert.ok(lines.every((l) => l.includes("Who can answer:")), blurb);
      }
    }
  });
});

// The README and docs: every relative link resolves, and the README's excerpts are real
// output from the recorded worked example (examples/async-example/walkthrough.md), not hand-written.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DOCS = ["README.md", "docs/evals/how-we-tested-it.md", "examples/async-example/walkthrough.md"].filter((f) => existsSync(f));
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

describe("docs", () => {
  test("every relative link resolves to a file in the repo", () => {
    const broken: string[] = [];
    for (const doc of DOCS) {
      for (const [, target] of readFileSync(doc, "utf8").matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const path = join(dirname(doc), target.split("#")[0]);
        if (!existsSync(path)) broken.push(`${doc} -> ${target}`);
      }
    }
    assert.deepEqual(broken, []);
  });

  test("the README's excerpts appear in the replayed walkthrough", () => {
    const readme = readFileSync("README.md", "utf8");
    const walk = collapse(readFileSync("examples/async-example/walkthrough.md", "utf8"));
    const blocks = [...readme.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.ok(blocks.length >= 3);
    // The first two are verbatim output, re-wrapped; the third is the early gate, checked by its reason.
    for (const b of blocks.slice(0, 2)) for (const line of b.split(/\n(?=\d+\. )/)) assert.ok(walk.includes(collapse(line)), line.slice(0, 80));
    assert.match(blocks[2], /"short[- ]pick" has no confirmed definition/);
    assert.match(walk, /"short[- ]pick" has no confirmed definition/);
  });
});

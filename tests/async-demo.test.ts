// The async demo replays exactly: the recorded model answers, fed back through the plugin's CLI,
// reproduce the committed walkthrough, packet and both spec packs (examples/async-demo).

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { replay, walkthrough } from "../scripts/replay-async-demo.mjs";

const DIR = "examples/async-demo";

describe("async demo replay", () => {
  const r = replay();

  test("the walkthrough and packet match what's committed", () => {
    assert.equal(walkthrough(r.results) + "\n", readFileSync(join(DIR, "walkthrough.md"), "utf8"));
    assert.equal(r.packet, readFileSync(join(DIR, "packet.md"), "utf8"));
  });

  test("both spec packs match what's committed", () => {
    for (const branch of ["final", "early"] as const) {
      const committed = readdirSync(join(DIR, "output", branch)).sort();
      assert.deepEqual(Object.keys(r[branch]).sort(), committed, branch);
      for (const f of committed) assert.equal(r[branch][f], readFileSync(join(DIR, "output", branch, f), "utf8"), `${branch}/${f}`);
    }
  });

  test("the two demo moments: the 6am conflict, and the refusal to guess \"short pick\"", () => {
    const text = readFileSync(join(DIR, "walkthrough.md"), "utf8");
    assert.match(text, /7am[^\n]*6am[^\n]*Which is right\?/);
    const early = r.results.find((x) => x.step.id === "early-05-signoff")!.body.gates[0];
    assert.equal(early.decision, "gather_more");
    assert.deepEqual(early.reasons, ['"short pick" has no confirmed definition']);
    const final = r.results.find((x) => x.step.id === "06-signoff")!.body.gates;
    assert.deepEqual(final.map((g: { decision: string }) => g.decision), ["go", "dont_build"]);
    assert.match(r.final["DEFINITIONS.md"], /### short pick \(metric\): confirmed/);
    assert.match(r.early["DEFINITIONS.md"], /### short pick \(metric\): unconfirmed\n\n_The owner hasn't defined it yet\. Don't interpret it: ask\._/);
  });

  test("the demo's sources and recorded answers are synthetic and in the repo", () => {
    assert.deepEqual(readdirSync(join(DIR, "sources")).sort(), ["1-reply-sam.txt", "2-notes-tom.txt", "3-reply-sam-round2.txt"]);
    assert.match(readFileSync(join(DIR, "recorded", "meta.json"), "utf8"), /synthetic/);
  });
});

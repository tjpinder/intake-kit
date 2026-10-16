// Async intake through the plugin's CLI, end to end: triage, packet, ingest (Claude answers the
// call through .intake-kit/calls, as with turn), gaps, summary, correct, signoff and render.

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const DIST = resolve("dist");
const dirs: string[] = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function repo(): string {
  const dir = mkdtempSync(join(tmpdir(), "intake-kit-async-"));
  dirs.push(dir);
  return dir;
}
function intake(dir: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [join(DIST, "intake.mjs"), ...args, "--dir", dir], { encoding: "utf8" });
  let body: any = null;
  try { body = JSON.parse(r.stdout); } catch { /* asserted by callers */ }
  return { status: r.status, body, stderr: r.stderr };
}
const answer = (dir: string, call: string, outputs: unknown[]) => {
  mkdirSync(join(dir, ".intake-kit", "calls"), { recursive: true });
  writeFileSync(join(dir, ".intake-kit", "calls", `${call}.json`), JSON.stringify(outputs));
};
const session = (dir: string) => parseYaml(readFileSync(join(dir, "intake-answers.yaml"), "utf8"));

const REPLY = [
  "We'd use it to pick who gets retraining each week.",
  "I build it, the three shift leads use it on Tuesday, and the DC manager signs off on retraining.",
  "Today it takes about four hours every Monday. If the leads pick the right people, short picks per picker should drop within a month.",
  "It all comes out of the WMS pick confirmations. No customer data, just badge numbers.",
  "Just the WMS reporting copy and Excel. Nothing is changing on the WMS this year.",
  "It needs to be there by 7am. Nobody outside the team requires it.",
  "If a count looks wrong the shift lead checks it with me before pulling anyone, and if the counts stopped matching the WMS I'd go back to the Excel sheet.",
  "Short picks and wrong-location scans count, not the cancelled lines.",
  "The WMS dashboard only gives me the total for the building, nothing by picker.",
  "Yes, every Monday I build the sheet by hand in Excel.",
  "If the numbers disagreed with the WMS two weeks running, I'd switch it off.",
].join("\n\n");
const a = (area: string, quote: string) => ({ item: "item-1", area, status: "answered", value: quote, quotes: [quote], conflict: false });
const INGEST = {
  answers: [
    a("data_report.decision", "We'd use it to pick who gets retraining each week."),
    a("core.users", "I build it, the three shift leads use it on Tuesday, and the DC manager signs off on retraining."),
    a("core.outcome", "Today it takes about four hours every Monday."),
    a("core.data", "It all comes out of the WMS pick confirmations."),
    a("core.systems", "Just the WMS reporting copy and Excel. Nothing is changing on the WMS this year."),
    a("core.constraints", "It needs to be there by 7am."),
    a("core.trust", "If a count looks wrong the shift lead checks it with me before pulling anyone"),
    a("data_report.definition", "Short picks and wrong-location scans count, not the cancelled lines."),
    a("data_report.existing", "The WMS dashboard only gives me the total for the building, nothing by picker."),
  ],
  checks: [
    { item: "item-1", check: "manual_work", result: "no", value: null, quote: null },
    { item: "item-1", check: "existing_asset", result: "yes", value: "Building totals only", quote: "The WMS dashboard only gives me the total for the building" },
    { item: "item-1", check: "kill_criteria", result: "yes", value: "WMS disagreement two weeks running", quote: "If the numbers disagreed with the WMS two weeks running, I'd switch it off." },
  ],
  terms: [{ term: "short pick", quote: "Short picks and wrong-location scans count", kind: "metric" }],
  definitions: [],
};
const WRITE_UP = {
  facts: [
    { item: "item-1", fact: "decision_depends", band: "yes", evidence: ["data_report.decision"], quote: "pick who gets retraining each week" },
    { item: "item-1", fact: "success_metric", band: "measurable_with_baseline", evidence: ["core.outcome"], quote: "about four hours every Monday" },
    { item: "item-1", fact: "existing_asset", band: "partial", evidence: ["data_report.existing"], quote: null },
    ...([["rule_clarity", "written", "data_report.definition"], ["input_digital", "fully", "core.data"], ["input_structured", "80+", "core.data"], ["ways_done", "one", "data_report.definition"],
      ["stability", "none", "core.systems"], ["documentation", "partial", "core.data"], ["steps_apps", "under_20", "core.systems"], ["access", "programmatic", "core.systems"], ["value", "high", "core.outcome"], ["ai_applies", "no", "core.data"]] as const)
      .map(([fact, band, area]) => ({ item: "item-1", fact, band, evidence: [area], quote: null })),
  ],
  prose: [{ item: "item-1", field: "problem_statement", text: "Shift leads can't see short picks per picker." }],
  acceptance: [{ item: "item-1", kind: "criterion", given: "a day of picks", when: "the report runs", then: "each picker's short picks are listed", evidence: ["data_report.definition"] }],
  guardrails: [{ item: "item-1", kind: "fallback", text: "Back to the Excel sheet", evidence: ["core.trust"] }],
  open_questions: [],
  reflect_back_text: "A daily short-pick report per picker.",
};

describe("async intake through the CLI", () => {
  test("triage, packet, ingest, gaps, summary, correct, signoff, render", () => {
    const dir = repo();
    const t = intake(dir, "triage", "--request", "A daily short-pick report per picker for the shift leads", "--type", "data_report", "--from", "Ops supervisor");
    assert.equal(t.status, 0, t.stderr + JSON.stringify(t.body));
    assert.ok(existsSync(t.body.packet) && existsSync(t.body.agenda));
    assert.match(readFileSync(t.body.packet, "utf8"), /What will you do differently when you see this report\?/);
    assert.equal(intake(dir, "packet", "--format", "agenda").body.result, "packet");

    const replyFile = join(dir, "reply.txt");
    writeFileSync(replyFile, REPLY);
    const need = intake(dir, "ingest", "--file", replyFile, "--kind", "reply", "--from", "Ops supervisor");
    assert.equal(need.status, 6, JSON.stringify(need.body));
    assert.equal(need.body.call, "ingest");
    // The first paste reads the request line first, as the requester's words.
    assert.match(need.body.input, /The document is the request as it came in from Ops supervisor/);
    answer(dir, "ingest", [{ answers: [], checks: [], terms: [], definitions: [] }, INGEST]);
    const ing = intake(dir, "ingest", "--file", replyFile, "--kind", "reply", "--from", "Ops supervisor");
    assert.equal(ing.status, 0, JSON.stringify(ing.body));
    assert.equal(ing.body.result, "ingested");
    assert.ok(ing.body.followup_text.includes('How exactly do you calculate "short pick"?'), "the undefined term is followed up");
    assert.ok(!existsSync(join(dir, ".intake-kit", "calls")), "the call files are cleared");

    // The owner's definition comes back in a follow-up reply.
    const defFile = join(dir, "def.txt");
    writeFileSync(defFile, "A short pick is a pick confirmed with fewer units than the task asked for. Order 88 asked for 5 and 4 were confirmed, so 1 short pick.");
    answer(dir, "ingest", [{ answers: [], checks: [], terms: [], definitions: [{ term: "short pick", definition: "Fewer units confirmed than the task asked for", quotes: ["A short pick is a pick confirmed with fewer units than the task asked for."], certain: true, measurable: "yes", examples: [{ case: "Order 88: task 5, confirmed 4", expected: "1" }], conflict: false }] }]);
    assert.equal(intake(dir, "ingest", "--file", defFile, "--kind", "reply", "--from", "Ops supervisor").status, 0);
    assert.equal(session(dir).terms[0].status, "confirmed");

    assert.equal(intake(dir, "summary").status, 6);
    answer(dir, "write_up", [WRITE_UP]);
    const sum = intake(dir, "summary");
    assert.equal(sum.status, 0, JSON.stringify(sum.body));
    assert.match(sum.body.summary, /short-pick report/i);

    const fix = intake(dir, "correct", "--area", "core.constraints", "--text", "Ready by 7am on weekdays; Saturdays by 9am.", "--by", "Tom");
    assert.equal(fix.status, 0, JSON.stringify(fix.body));
    assert.equal(session(dir).core.constraints.value, "Ready by 7am on weekdays; Saturdays by 9am.");
    assert.equal(intake(dir, "signoff").status, 4, "the summary has to be written up again after a correction");
    answer(dir, "write_up", [WRITE_UP]);
    assert.equal(intake(dir, "summary").status, 0);

    const so = intake(dir, "signoff", "--by", "Tom");
    assert.equal(so.status, 0, JSON.stringify(so.body));
    assert.equal(so.body.gates[0].decision, "go", JSON.stringify(so.body.gates));
    const s = session(dir);
    assert.equal(s.session.reflect_back.signed_off_by, "Tom");
    assert.deepEqual(s.session.reflect_back.dont_build_confirmed, []);

    const r = intake(dir, "render");
    assert.equal(r.status, 0, JSON.stringify(r.body));
    assert.ok(existsSync(join(dir, "SPEC.md")));
  });

  test("a Don't-build reason the interviewer doesn't confirm sends the item to Gather more instead", () => {
    const dir = repo();
    intake(dir, "triage", "--request", "A daily short-pick report per picker", "--type", "data_report", "--from", "Ops");
    const f = join(dir, "r.txt");
    writeFileSync(f, REPLY);
    answer(dir, "ingest", [{ answers: [], checks: [], terms: [], definitions: [] }, INGEST]);
    assert.equal(intake(dir, "ingest", "--file", f, "--kind", "reply", "--from", "Ops").status, 0);
    const covers = { ...WRITE_UP, facts: WRITE_UP.facts.map((x) => (x.fact === "existing_asset" ? { ...x, band: "covers" } : x)) };
    answer(dir, "write_up", [covers]);
    const sum = intake(dir, "summary");
    assert.deepEqual(sum.body.confirm.map((c: { key: string }) => c.key), ["item-1:existing_asset"]);
    assert.equal(intake(dir, "signoff", "--confirm", "item-9:value").status, 4, "only keys the summary lists");
    const so = intake(dir, "signoff");
    assert.equal(so.body.gates[0].decision, "gather_more", JSON.stringify(so.body.gates));
    assert.ok(so.body.gates[0].reasons.some((x: string) => x.endsWith("but that wasn't confirmed at sign-off")));
  });

  test("a live intake can't be driven with async commands, and triage won't overwrite an intake unasked", () => {
    const dir = repo();
    assert.equal(intake(dir, "start", "--grounding", "unverified").status, 0);
    assert.equal(intake(dir, "gaps").body.result, "not_async");
    assert.equal(intake(dir, "triage", "--request", "x", "--type", "known_idea").status, 4);
    assert.equal(intake(dir, "triage", "--request", "x", "--type", "known_idea", "--new").status, 0);
  });
});

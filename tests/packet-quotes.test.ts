// Async intake, cycle-count retest (Oct 17, 2026): quote marks in a packet hold only a source's own
// words, character for character; a follow-on item has a short name and its questions say which
// item they're about; a conflict stays on the area and item it was found on. Ingest is scripted.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadFramework } from "../src/lib/framework-fs.ts";
import type { ItemType } from "../src/lib/framework.ts";
import type { Session } from "../src/lib/session.ts";
import { runIngest, startAsync } from "../src/engine/ingest.ts";
import { findGaps, followUpEmail } from "../src/engine/gaps.ts";
import { buildPacket, packetAgenda, packetEmail } from "../src/lib/packet.ts";
import { exactSpan } from "../src/lib/grounding.ts";
import { validateSession } from "../src/lib/schemas.ts";
import type { Provider } from "../src/llm/types.ts";

const fw = loadFramework(".");
const NOW = "2026-10-17T12:00:00.000Z";

const REQUEST = "Cycle count variances over $500 should go to the controller each week";
const REPLY = `We use it to decide which locations get recounted and which variances get written off, so the controller isn't approving adjustments blind.

Right now I pull the counts from the WMS every morning, paste them into Excel next to the item cost and sort by the biggest swings. It takes me about an hour and a half a day.

Cost lives in the ERP and counts live in the WMS.

A variance is the units off times the cost, I think. Mike might calculate it differently.

The inventory team leads and I use it. It needs to be in my inbox by 7am.`;
const NOTES = `Call with Mike (controller)
- anything over $250 should come to him, not $500
- variance = absolute value per SKU, not net across locations
- weekly is fine for him
- really it's about passing the audit
- the Excel step costs Dana 90 minutes every morning`;

function scripted(outputs: unknown[]): Provider {
  const queue = [...outputs];
  return { name: "azure-openai", async complete() { return { text: JSON.stringify(queue.shift()), usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 }, model: "scripted" }; } };
}
const out = (o: Partial<Record<"answers" | "checks" | "terms" | "definitions", unknown[]>>) => ({ answers: [], checks: [], terms: [], definitions: [], ...o });
// The model's copies differ from the sources in case and spacing, as real ones do; values paraphrase.
const ans = (area: string, quotes: string[], over: Record<string, unknown> = {}) => ({ item: "item-1", area, status: "answered", value: `Paraphrase of ${area} in the third person`, quotes, conflict: false, ...over });

async function cycleCount(): Promise<Session> {
  let s = startAsync(fw, { id: "2026-10-17-cc01", request: REQUEST, title: "Cycle-count variance report", type: "data_report", from: "Dana", provider: "azure-openai", now: NOW });
  const reading = await runIngest({ provider: scripted([
    // The request line, read on the first paste.
    out({ answers: [ans("core.constraints", ["cycle count variances over $500 should go to the controller"], { value: "Dana says variances above $500 go to the controller" })] }),
    out({
      answers: [
        ans("core.outcome", ["We use it to decide which locations get recounted and which variances get written off,  so the controller isn't approving adjustments blind."]),
        ans("data_report.decision", ["we use it to decide which locations get recounted"]),
        ans("core.users", ["The inventory team leads and I use it."]),
        ans("core.data", ["Cost lives in the ERP and counts live in the WMS."]),
        ans("core.systems", ["Cost lives in the ERP and counts live in the WMS."]),
        ans("data_report.delivery", ["It needs to be in my inbox by 7am."]),
        ans("data_report.grain", ["sort by the biggest swings"], { status: "partial" }),
      ],
      checks: [
        { item: "item-1", check: "manual_work", result: "yes", value: "Dana pulls the WMS counts into Excel every morning and sorts them by hand", quote: "Right now I pull the counts from the WMS every morning, paste them into Excel", name: "Morning Excel export" },
        { item: "item-1", check: "existing_asset", result: "no", value: null, quote: null, name: null },
        { item: "item-1", check: "kill_criteria", result: "unclear", value: null, quote: null, name: null },
      ],
      terms: [{ term: "variance", quote: "variances", kind: "metric" }],
      definitions: [{ term: "variance", definition: "She thinks it's units off times cost", quotes: ["A variance is the units off times the cost, I think."], certain: false, measurable: "yes", examples: [], conflict: false }],
    }),
  ]), fw, session: s, source: { kind: "reply", from: "Dana", text: REPLY }, now: NOW });
  s = reading.session;
  const notes = await runIngest({ provider: scripted([out({
    answers: [
      ans("core.constraints", ["anything over $250 should come to him, not $500"], { value: "Mike wants anything above $250", conflict: true }),
      ans("core.outcome", ["really it's about passing the audit"], { value: "It's for the audit", conflict: true }),
      ans("data_report.decision", ["really it's about passing the audit"], { value: "It's for the audit", conflict: true }),
      ans("data_report.truth", ["weekly is fine for him"], { value: "He is fine with a weekly cadence" }),
      // The follow-on item exists by now; its own outcome (a core override).
      { item: "item-2", area: "core.outcome", status: "answered", value: "Give Dana back her mornings", quotes: ["the Excel step costs Dana 90 minutes every morning"], conflict: false },
    ],
    definitions: [{ term: "variance", definition: "Mike says absolute value per SKU", quotes: ["variance = absolute value per SKU"], certain: true, measurable: "yes", examples: [], conflict: true }],
  })]), fw, session: s, source: { kind: "notes", from: "Mike (controller)", text: NOTES }, now: NOW });
  return notes.session;
}

/** Every span in quote marks. */
const quoted = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

describe("quote marks hold only a source's own words", () => {
  test("every quoted span in the follow-up packet is in a source exactly, character for character", async () => {
    const s = await cycleCount();
    assert.equal(validateSession(s).ok, true, validateSession(s).errors.join("; "));
    const texts = (s.session.sources ?? []).map((x) => x.text);
    const email = followUpEmail(s, findGaps(s, fw));
    const spans = quoted(email);
    assert.ok(spans.length >= 5, `expected quotes back, got: ${email}`);
    for (const span of spans) assert.ok(texts.some((t) => t.includes(span)), `not verbatim from any source: "${span}"\n\n${email}`);
    // Values are paraphrases: never quoted; and the model's copy is shown as the source has it.
    assert.ok(!email.includes('"Paraphrase of') && !email.includes('"Mike') && !email.includes('"She thinks'));
    assert.ok(email.includes('"Cycle count variances over $500 should go to the controller"'), email);
  });

  test("the first packet quotes only the request, for every type, and its examples are unquoted", () => {
    const types: ItemType[] = ["data_report", "known_idea", "manual_process", "broken", "exploratory"];
    for (const type of types) {
      const p = buildPacket(fw, { request: REQUEST, title: "Cycle-count variance report", type, modifiers: ["compliance", "integration", "migration"] });
      for (const text of [packetEmail(p), packetAgenda(p)]) for (const span of quoted(text)) assert.equal(span, REQUEST, `${type}: quoted something other than the request: "${span}"`);
    }
  });

  test("a quote is shown as the source has it: case, spacing, curly quotes and dashes", () => {
    const src = "Right now I pull   the counts — every\nmorning ’til 7am.";
    assert.equal(exactSpan("i pull the counts - every morning 'til", [src]), "I pull   the counts — every\nmorning ’til");
    assert.equal(exactSpan("not there", [src]), null);
  });

  test("a paraphrase with no span to show goes unquoted, labelled as a summary", async () => {
    const s = await cycleCount();
    const conflict = s.session.engine!.areas["core.constraints"].conflict!;
    conflict.quote = "words that aren't in any source";
    const g = findGaps(s, fw).gaps.find((x) => x.target === "core.constraints")!;
    assert.match(g.question, /In summary, the other: Mike wants anything above \$250\. Which is right\?/);
  });
});

describe("the packet and follow-up name items by their short titles", () => {
  test("the packet header uses the short title, with the request as it came in below it", () => {
    const email = packetEmail(buildPacket(fw, { request: REQUEST, title: "Cycle-count variance report", type: "data_report" }));
    assert.match(email, /^# Questions about: Cycle-count variance report\n\nThe request: "Cycle count variances over \$500 should go to the controller each week"\n/);
  });

  test("a follow-on item gets the model's short name, and its questions start with a line naming it", async () => {
    const s = await cycleCount();
    assert.equal(s.items[1].title, "Morning Excel export");
    const email = followUpEmail(s, findGaps(s, fw));
    assert.match(email, /^# A few follow-up questions about: Cycle-count variance report\n/);
    assert.equal(email.split("About the morning Excel export you mentioned:").length, 2, email);
    const lead = email.indexOf("About the morning Excel export you mentioned:");
    const item2 = findGaps(s, fw).gaps.filter((g) => g.item === "item-2");
    assert.ok(item2.length > 0);
    for (const g of item2) assert.ok(email.indexOf(g.question) > lead, g.question);
  });

  test("without a name, a follow-on item's title is the value's first clause", async () => {
    const s = startAsync(fw, { id: "2026-10-17-cc02", request: REQUEST, type: "data_report", from: "Dana", provider: "azure-openai", now: NOW });
    s.session.engine!.request_read = true;
    const r = await runIngest({ provider: scripted([out({ checks: [{ item: "item-1", check: "manual_work", result: "yes", value: "Morning paste into Excel. Takes 90 minutes.", quote: "paste them into Excel" }] })]), fw, session: s, source: { kind: "reply", from: "Dana", text: REPLY }, now: NOW });
    assert.equal(r.session.items[1].title, "Morning paste into Excel");
  });
});

describe("a conflict stays where it was found (retest)", () => {
  test("a core-area conflict is asked once, on the primary item, not copied onto the follow-on item", async () => {
    const s = await cycleCount();
    assert.ok(s.items[1].core_overrides.outcome, "the follow-on item has its own outcome");
    const gaps = findGaps(s, fw).gaps.filter((g) => g.kind === "conflict" && g.target === "core.outcome");
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].item, "item-1");
    assert.ok(!findGaps(s, fw).gaps.some((g) => g.item === "item-2" && g.kind === "conflict"));
  });

  test("the threshold disagreement quotes both sides, each with who said it", async () => {
    const s = await cycleCount();
    const g = findGaps(s, fw).gaps.find((x) => x.target === "core.constraints")!;
    assert.equal(g.kind, "conflict");
    assert.match(g.question, /^We have two different answers here\. The request from Dana says: "Cycle count variances over \$500 should go to the controller"\. Our notes from talking to Mike \(controller\) say: "anything over \$250 should come to him, not \$500"\. Which is right\?/);
  });
});

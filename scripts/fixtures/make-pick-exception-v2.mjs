// Builds tests/fixtures/conversations/pick-exception.json for interview engine v2: each user
// message, and the model outputs the engine asks for that turn, in call order. The engine decides
// everything else (what to ask, when to probe, the manual-work item, the summary).
//
//   node scripts/fixtures/make-pick-exception-v2.mjs

import { writeFileSync } from "node:fs";

const none = { status: "answered", value: null, quote: null, check: "none", wrap_up: false, also_answers: [] };
const ans = (value, quote, extra = {}) => ({ ...none, value, quote, ...extra });
const phrase = (question) => ({ call: "phrase", output: { question } });
const extract = (output) => ({ call: "extract", output });

const facts = [
  ["rule_clarity", "written", ["data_report.definition"]], ["input_digital", "fully", ["core.data"]], ["input_structured", "80+", ["core.data"]],
  ["ways_done", "one", ["data_report.definition"]], ["stability", "none", ["core.systems"]], ["documentation", "none", ["core.data"]],
  ["steps_apps", "under_20", ["core.systems"]], ["access", "programmatic", ["core.data"]], ["value", "high", ["core.outcome"]],
  ["ai_applies", "no", ["data_report.definition"]], ["success_metric", "measurable_with_baseline", ["core.outcome"]],
  ["existing_asset", "partial", ["data_report.existing"]], ["decision_depends", "yes", ["data_report.decision"]],
].map(([fact, band, evidence]) => ({ item: "item-1", fact, band, evidence, quote: null }));

const writeUp = {
  facts,
  prose: [
    { item: "item-1", field: "problem_statement", text: "Retraining is chosen by guesswork because short picks aren't visible by picker and shift." },
    { item: "item-1", field: "current_state", text: "The supervisor builds a Monday Excel sheet from the WMS export, which takes about four hours." },
    { item: "item-1", field: "mvp", text: "A daily report of short picks and wrong-location scans per picker, per shift, ready by 7am." },
    { item: "item-1", field: "out_of_scope", text: "Cancelled lines; deciding who gets retrained." },
    { item: "item-1", field: "mitigation", text: "A shift lead checks a count with the supervisor before pulling anyone." },
  ],
  acceptance: [
    { item: "item-1", kind: "criterion", given: "a shift with short picks and wrong-location scans", when: "the report runs before 7am", then: "each picker's count for that shift is shown, excluding cancelled lines", evidence: ["data_report.definition", "core.constraints"] },
    { item: "item-1", kind: "error_case", given: "the counts stop matching the WMS", when: "the report runs", then: "it says so instead of showing the counts", evidence: ["core.trust"] },
  ],
  guardrails: [
    { item: "item-1", kind: "kill_criterion", text: "Stop using it for retraining if the counts don't match the WMS.", evidence: ["core.trust"] },
    { item: "item-1", kind: "fallback", text: "Go back to the Monday Excel sheet.", evidence: ["core.trust"] },
    { item: "item-1", kind: "review_point", text: "A shift lead checks a count with the supervisor before pulling anyone.", evidence: ["core.trust"] },
  ],
  open_questions: [],
  reflect_back_text: "A daily short-pick and wrong-location report per picker and shift, ready by 7am, so shift leads can choose who to retrain.",
};

const steps = [
  {
    user: "/intake-kit:intake I need a report of short picks by shift and picker so the shift leads can target retraining instead of guessing.",
    model: [
      { call: "classify_opening", output: { type: "data_report", confidence: "high", title: "Daily pick-exception report", trigger_quote: "I need a report of short picks by shift and picker", modifiers: [], also_answers: [{ area: "data_report.grain", value: "Per picker, per shift", quote: "by shift and picker" }] } },
      phrase("When you see that report, what will you do differently?"),
    ],
  },
  {
    user: "So I know who to pull for retraining that week. Right now I build it in Excel every Monday and it eats my whole Monday morning.",
    model: [extract(ans("Decide who to pull for retraining each week", "So I know who to pull for retraining that week")), phrase("Who touches this report, from the person who builds it to the people who use it?")],
  },
  {
    user: "I build it, the three shift leads use it on Tuesday, and the DC manager signs off on retraining.",
    model: [extract(ans("The supervisor builds it; three shift leads use it; the DC manager signs off", "I build it, the three shift leads use it on Tuesday, and the DC manager signs off on retraining")), phrase("How will you know it's working, and what is the current way costing you?")],
  },
  {
    user: "Today it takes about four hours every Monday. If the leads pick the right people, short picks per picker should drop within a month.",
    model: [extract(ans("Four hours every Monday now; short picks per picker should drop within a month", "Today it takes about four hours every Monday")), phrase("Where does the data come from, and which copy do you trust?")],
  },
  {
    user: "It all comes out of the WMS pick confirmations. We've got read access to the reporting copy. No customer data or pricing, just orders, locations and badge numbers.",
    model: [extract(ans("WMS pick confirmations, read from the reporting copy; no customer or pricing data", "It all comes out of the WMS pick confirmations")), phrase("Which screens or systems do you open for it, and is anything changing in the next six months?")],
  },
  {
    user: "Just the WMS reporting copy and Excel. Nothing is changing on the WMS this year.",
    model: [extract(ans("The WMS reporting copy and Excel; no changes this year", "Just the WMS reporting copy and Excel. Nothing is changing on the WMS this year.")), phrase("Does it have to be ready by a certain time, or does anyone outside your team require it?")],
  },
  {
    user: "It needs to be there by 7am when I walk in. Nobody outside the team requires it.",
    model: [extract(ans("Ready by 7am daily; no outside requirement", "It needs to be there by 7am when I walk in")), phrase("When a count is wrong today, who catches it?")],
  },
  {
    user: "I guess the shift lead would catch it.",
    model: [extract({ ...none, status: "partial", value: "Probably the shift lead", quote: "I guess the shift lead would catch it." }), phrase("Tell me about the last time a count was wrong. Who caught it, and what happened?")],
  },
  {
    user: "Honestly I don't remember one. If a count looks wrong the shift lead checks it with me before pulling anyone, and if the counts stopped matching the WMS I'd go back to the Excel sheet.",
    model: [extract(ans("The shift lead checks a wrong-looking count with the supervisor; if counts stop matching the WMS, back to the Excel sheet", "If a count looks wrong the shift lead checks it with me before pulling anyone")), phrase("When you count a short pick, what's in and what's out?")],
  },
  {
    user: "Short picks and wrong-location scans, not the cancelled lines. Count them per picker, per shift, per day.",
    model: [extract(ans("Short picks and wrong-location scans, excluding cancelled lines", "Short picks and wrong-location scans, not the cancelled lines")), phrase("Is there a report today that's close to this? What's wrong with it?")],
  },
  {
    user: "The WMS dashboard only gives me the total for the building, nothing by picker.",
    // The manual-work question is fixed text, so no phrase call.
    model: [extract(ans("The WMS dashboard shows building totals only", "The WMS dashboard only gives me the total for the building", { check: "yes" }))],
  },
  {
    user: "Yes, I built it last Monday. If I had the daily report every morning I'd stop doing the Monday thing.",
    model: [extract(ans("The Monday Excel sheet, built by hand weekly", "I built it last Monday", { check: "yes" })), phrase("Roughly how long does the Monday sheet take, and how often do you do it?")],
  },
  {
    user: "About four hours, once a week, every Monday morning.",
    model: [extract(ans("About four hours once a week", "About four hours, once a week")), { call: "write_up", output: writeUp }],
  },
  {
    user: "Yes, that's it.",
    model: [extract({ ...none, value: "Agrees with the summary", quote: "Yes, that's it.", check: "yes" })],
  },
];

writeFileSync(
  "tests/fixtures/conversations/pick-exception.json",
  JSON.stringify({ description: "The worked example (pick-exception report) through interview engine v2: each user message and the model outputs the engine asks for that turn, in call order. Code decides everything else.", steps }, null, 2) + "\n",
);
console.log(`wrote ${steps.length} steps`);

// The async worked example (examples/async-example): one intake, run through the plugin's CLI exactly as
// /intake-kit:collect runs it. scripts/record-async-example.mjs records the model's answer to every call
// once; scripts/replay-async-example.mjs replays them with no model. Sources are synthetic.
//
// The main path: triage, Sam's email, Tom's notes from a call with Priya (the 6am vs 7am conflict;
// "short pick" defined only in notes), Sam's round-2 reply (settles 6am, defines "short pick" in his
// words), then summary, sign-off and render. The "early" branch signs off straight after the notes,
// to show the kit refusing to guess what "short pick" means.

export const EXAMPLE = "examples/async-example";
export const FIXED = { INTAKE_KIT_NOW: "2026-10-14T09:00:00.000Z", INTAKE_KIT_SESSION_ID: "2026-10-14-de70" };

export const STEPS = [
  { id: "01-triage", args: ["triage", "--request", "A daily short-pick report per picker so the shift leads can target retraining", "--type", "data_report", "--from", "Sam (ops supervisor)", "--title", "Daily short-pick report"] },
  { id: "02-ingest-email", args: ["ingest", "--file", "SOURCES/1-reply-sam.txt", "--kind", "reply", "--from", "Sam (ops supervisor)"] },
  { id: "03-ingest-notes", args: ["ingest", "--file", "SOURCES/2-notes-tom.txt", "--kind", "notes", "--from", "Tom"] },
  { id: "early-04-summary", branch: "early", args: ["summary"] },
  { id: "early-05-signoff", branch: "early", args: ["signoff", "--by", "Tom"] },
  { id: "early-06-render", branch: "early", args: ["render"] },
  { id: "04-ingest-round2", args: ["ingest", "--file", "SOURCES/3-reply-sam-round2.txt", "--kind", "reply", "--from", "Sam (ops supervisor)"] },
  { id: "05-summary", args: ["summary"] },
  // The interviewer agrees the Monday sheet goes away once the report exists, so confirms that reason only.
  { id: "06-signoff", args: ["signoff", "--by", "Tom", "--confirm", "item-2:superseded"] },
  { id: "07-render", args: ["render"] },
];

/** Spec-pack files copied out of each branch's working folder after render. */
export const PACK = ["SPEC.md", "ACCEPTANCE.md", "CLAUDE.md", "GUARDRAILS.md", "DECISIONS.md", "FIRST_PROMPT.md", "PROCESS_MAP.md", "DISCOVERY_BRIEF.md", "DEFINITIONS.md", "SOW_DRAFT.md"];

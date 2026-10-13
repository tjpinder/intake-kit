// The kit's pure core: everything the web app runs in the browser. No file system, process or
// Node built-ins anywhere below this entry point; tests/core-browser.test.ts bundles it for the
// browser and fails if one creeps in. The plugin and CLI use the same modules plus the
// Node-only loaders in framework-fs.ts, state.ts and checks.ts.

export { buildFramework, FrameworkError, schemaFactNames } from "./lib/framework.ts";
export type { Framework, FrameworkSources, Area, Module, ItemType, Modifier } from "./lib/framework.ts";


export { scoreItem, levelOf, quadrantOf, adoptionRisks } from "./lib/score.ts";
export { scoreAndGate, gateItem, criticalAreas } from "./lib/gates.ts";
export { guide, statusOf, factsFor } from "./lib/guide.ts";
export { buildSummary, summaryText, summaryIndex } from "./lib/summary.ts";
export type { Summary, SummaryItem } from "./lib/summary.ts";
export type { Status, ItemStatus } from "./lib/guide.ts";

export { renderAll, scope, RenderError } from "./lib/render.ts";
export { lineDiff } from "./lib/diff.ts";
export { normalize, findQuote } from "./lib/grounding.ts";
export type { TranscriptEntry } from "./lib/grounding.ts";

export { validateSession, validateOpening, validatePhrase, validateExtract, validateWriteUp, sessionSchema } from "./lib/schemas.ts";
export { CHECK_IDS, CHECK_LABELS, DEFAULT_CONFIG } from "./lib/check-meta.ts";
export type { ChecksConfig, CheckId } from "./lib/check-meta.ts";

export { ProviderError } from "./llm/types.ts";
export type { Provider, ProviderResult, TurnRequest, ChatMessage, Usage } from "./llm/types.ts";

export { coverageFor, isCaptured } from "./lib/session.ts";
export type { Session, Item, CoverageEntry, Gate, Scoring, Acceptance, Guardrail } from "./lib/session.ts";

// Interview engine v2: code runs the interview; the model classifies and phrases.
export { runEngineTurn, SUMMARY_REPLY, DONE_REPLY } from "./engine/turn.ts";
export type { EngineTurnInput, EngineTurnOutcome, EngineCall } from "./engine/turn.ts";
export { newEngine, TURN_BUDGET, SEND_AGAIN } from "./engine/types.ts";
export type { EngineState, Pending, Extraction, OpeningResult } from "./engine/types.ts";

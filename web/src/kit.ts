// The kit's framework and templates, bundled into the web app as text, plus the browser-side
// helpers the UI needs. Same core as the plugin and the API (src/core.ts).

import { buildFramework, startAsync, type Framework, type ItemType, type Modifier, type Session } from "../../src/core.ts";
import { newEngine } from "../../src/engine/types.ts";
// The framework YAML is parsed at build time (?parsed), so no YAML parser loads at startup.
import router from "../../skills/intake/router.yaml?parsed";
import scoring from "../../skills/intake/scoring.yaml?parsed";
import sections from "../../templates/sections.yaml?parsed";

const byName = <T>(files: Record<string, T>) =>
  Object.fromEntries(Object.entries(files).map(([path, value]) => [path.split("/").pop()!, value]));

const modules = byName(import.meta.glob<object>("../../skills/intake/modules/*.yaml", { query: "?parsed", import: "default", eager: true }));
export const templates: Record<string, string> = byName(import.meta.glob("../../templates/*.md", { query: "?raw", import: "default", eager: true }));

export const fw: Framework = buildFramework({ router, scoring, sections, modules });

const newId = (now: Date) => `${now.toISOString().slice(0, 10)}-${Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

/** Async intake: triage starts the session from the request and the chosen type, as the CLI's `triage` does. */
export function newAsyncSession(f: { request: string; from: string; title: string; type: ItemType; modifiers: Modifier[] }, provider: "kit" | "azure" | "claude", now = new Date()): Session {
  return startAsync(fw, { id: newId(now), request: f.request, type: f.type, modifiers: f.modifiers, title: f.title || undefined, from: f.from, provider: provider === "claude" ? "claude" : "azure-openai", now: now.toISOString() });
}

/** A new, empty session, seeded the way the CLI's `start` seeds one. */
export function newSession(provider: "kit" | "azure" | "claude", now = new Date()): Session {
  const id = `${now.toISOString().slice(0, 10)}-${Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  const seeded = () => ({ status: "unknown" as const, value: null, quotes: [], probe_count: 0 });
  return {
    schema_version: 1,
    framework_version: fw.router.framework_version,
    session: {
      id,
      started_at: now.toISOString(),
      mode: "stakeholder",
      provider: provider === "claude" ? "claude" : "azure-openai",
      grounding: "transcript",
      reflect_back: null,
      asked: {},
      engine: newEngine(),
    },
    core: { users: seeded(), outcome: seeded(), data: seeded(), systems: seeded(), constraints: seeded(), trust: seeded() },
    items: [],
  };
}

// The kit's framework and templates, bundled into the web app as text, plus the browser-side
// helpers the UI needs. Same core as the plugin and the API (src/core.ts).

import { buildFramework, type Framework, type Session } from "../../src/core.ts";
import router from "../../skills/intake/router.yaml?raw";
import scoring from "../../skills/intake/scoring.yaml?raw";
import sections from "../../templates/sections.yaml?raw";

const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([path, text]) => [path.split("/").pop()!, text]));

const modules = byName(import.meta.glob("../../skills/intake/modules/*.yaml", { query: "?raw", import: "default", eager: true }));
export const templates: Record<string, string> = byName(import.meta.glob("../../templates/*.md", { query: "?raw", import: "default", eager: true }));

export const fw: Framework = buildFramework({ router, scoring, sections, modules });

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
    },
    core: { users: seeded(), outcome: seeded(), data: seeded(), systems: seeded(), constraints: seeded(), trust: seeded() },
    items: [],
  };
}

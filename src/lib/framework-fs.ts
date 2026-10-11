// Node-side loaders: read the framework YAML and templates from a kit root, then hand the text
// to the pure builders. The web app bundles the same files instead.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildFramework, type Framework, type FrameworkSources } from "./framework.ts";

/** Where the framework YAML lives: beside the skill in the plugin, in framework/ in the standalone kit. */
function frameworkDir(root: string): string {
  return existsSync(join(root, "framework")) ? join(root, "framework") : join(root, "skills", "intake");
}

export function readFrameworkSources(root: string): FrameworkSources {
  const dir = frameworkDir(root);
  const modules: Record<string, string> = {};
  for (const file of readdirSync(join(dir, "modules")).filter((f) => f.endsWith(".yaml"))) {
    modules[file] = readFileSync(join(dir, "modules", file), "utf8");
  }
  return {
    router: readFileSync(join(dir, "router.yaml"), "utf8"),
    scoring: readFileSync(join(dir, "scoring.yaml"), "utf8"),
    sections: readFileSync(join(root, "templates", "sections.yaml"), "utf8"),
    modules,
  };
}

/** Loads the framework from a kit root. Throws FrameworkError listing every problem found. */
export function loadFramework(root: string): Framework {
  return buildFramework(readFrameworkSources(root));
}

/** Every template in templates/, keyed by file name. */
export function readTemplates(root: string): Record<string, string> {
  const dir = join(root, "templates");
  return Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => [f, readFileSync(join(dir, f), "utf8")]));
}

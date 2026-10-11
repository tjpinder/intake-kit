// Node version guard. The bundler prepends nodeVersionBanner() to every dist script, so a
// too-old Node fails with a clear message before any intake-kit code runs. A missing Node
// can't be caught here; each skill checks for it first (see skills/*/SKILL.md).

export const MIN_NODE_MAJOR = 22;

export function meetsMinimum(version: string, min: number = MIN_NODE_MAJOR): boolean {
  const major = Number.parseInt(version.replace(/^v/, "").split(".")[0] ?? "", 10);
  return Number.isInteger(major) && major >= min;
}

export function versionError(version: string, min: number = MIN_NODE_MAJOR): string {
  return `intake-kit needs Node ${min} or later (found ${version}). Install it from https://nodejs.org`;
}

// Plain ES5-safe JS so it parses on any Node that might run it.
export function nodeVersionBanner(min: number = MIN_NODE_MAJOR): string {
  return [
    "// intake-kit: Node version guard",
    "{",
    `  var __ikMajor = parseInt(process.versions.node.split(".")[0], 10);`,
    `  if (!(__ikMajor >= ${min})) {`,
    `    process.stderr.write("intake-kit needs Node ${min} or later (found " + process.versions.node + "). Install it from https://nodejs.org\\n");`,
    "    process.exit(1);",
    "  }",
    "}",
  ].join("\n");
}

// The turn schema as each provider's structured-output feature wants it. The source is
// schema/turn.schema.json, which already stays inside the strict subset (tests enforce it).

import { turnSchema } from "../lib/schemas.ts";

type Json = any;

/** Document-level keys providers don't want. Only stripped at the root: "title" is also a real turn property. */
const ROOT_META_KEYS = new Set(["$schema", "$id", "title"]);

function transform(node: Json, rewrite: (n: Json) => Json): Json {
  if (Array.isArray(node)) return node.map((n) => transform(n, rewrite));
  if (node === null || typeof node !== "object") return node;
  const out: Json = {};
  for (const [k, v] of Object.entries(node)) {
    // Inside "properties" and "$defs" the keys are names, not keywords: copy each value through.
    if (k === "properties" || k === "$defs") out[k] = Object.fromEntries(Object.entries(v as object).map(([name, sub]) => [name, transform(sub, rewrite)]));
    else out[k] = k === "enum" || k === "required" ? v : transform(v, rewrite);
  }
  return rewrite(out);
}

function withoutRootMeta(schema: Json): Json {
  return Object.fromEntries(Object.entries(schema).filter(([k]) => !ROOT_META_KEYS.has(k)));
}

/** Azure OpenAI strict json_schema: the schema minus its document-level meta keys. */
export function azureSchema(schema: Json): Json {
  return withoutRootMeta(transform(schema, (n) => n));
}
export const azureTurnSchema = (): Json => azureSchema(turnSchema);

/**
 * Claude structured outputs: the schema minus meta keys, with nullable type arrays such as
 * ["string", "null"] rewritten as anyOf, which Claude's documented schema subset supports.
 */
export const claudeTurnSchema = (): Json => claudeSchema(turnSchema);
export function claudeSchema(schema: Json): Json {
  return withoutRootMeta(transform(schema, (n) => {
    if (!Array.isArray(n.type)) return n;
    const { type, description, ...rest } = n;
    return {
      ...(description ? { description } : {}),
      anyOf: (type as string[]).map((t) => (t === "null" ? { type: "null" } : { type: t, ...rest })),
    };
  }));
}

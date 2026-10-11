// The turn schema as each provider's structured-output feature wants it. The source is
// schema/turn.schema.json, which already stays inside the strict subset (tests enforce it).

import { turnSchema } from "../lib/schemas.ts";

type Json = any;

const META_KEYS = new Set(["$schema", "$id", "title"]);

function transform(node: Json, rewrite: (n: Json) => Json): Json {
  if (Array.isArray(node)) return node.map((n) => transform(n, rewrite));
  if (node === null || typeof node !== "object") return node;
  const out: Json = {};
  for (const [k, v] of Object.entries(node)) {
    if (META_KEYS.has(k)) continue;
    out[k] = k === "enum" || k === "required" ? v : transform(v, rewrite);
  }
  return rewrite(out);
}

/** Azure OpenAI strict json_schema: the schema minus its meta keys. */
export function azureTurnSchema(): Json {
  return transform(turnSchema, (n) => n);
}

/**
 * Claude structured outputs: the schema minus meta keys, with nullable type arrays such as
 * ["string", "null"] rewritten as anyOf, which Claude's documented schema subset supports.
 */
export function claudeTurnSchema(): Json {
  return transform(turnSchema, (n) => {
    if (!Array.isArray(n.type)) return n;
    const { type, description, ...rest } = n;
    return {
      ...(description ? { description } : {}),
      anyOf: (type as string[]).map((t) => (t === "null" ? { type: "null" } : { type: t, ...rest })),
    };
  });
}

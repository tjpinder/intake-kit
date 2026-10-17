// Grounding: every quote must be the user's own words. A quote is grounded when, after
// normalization, it's a contiguous span of a single user turn in the transcript. Anything else,
// including the assistant's own words, is treated as a fabrication.

export interface TranscriptEntry {
  role: "user";
  text: string;
  at: string;
  /** True for the prompt that invoked the intake command. */
  command?: boolean;
}

/**
 * Normalizes only what HANDOFF.md allows: curly quotes to straight, en and em dashes to a
 * hyphen, the ellipsis character to three dots, whitespace runs to one space, and case.
 */
export function normalize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * A quote as the source has it, character for character: the span of the first text it matches
 * after normalization, or null. Anything shown in quote marks uses this, never the model's copy.
 */
export function exactSpan(quote: string, texts: string[]): string | null {
  const q = normalize(quote);
  if (!q) return null;
  for (const text of texts) {
    // The normalized text, with where each of its characters came from in the original.
    let norm = "";
    const at: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) {
        if (norm && !norm.endsWith(" ")) { norm += " "; at.push(i); }
        continue;
      }
      for (const c of normalize(text[i])) { norm += c; at.push(i); }
    }
    const k = norm.indexOf(q);
    if (k >= 0) return text.slice(at[k], at[k + q.length - 1] + 1);
  }
  return null;
}

/**
 * Of an answer's quotes, the one its value most likely came from: the most words in common (an
 * entry gathers quotes from several sources, and the latest isn't always the recorded value's).
 */
export function quoteFor(value: string | null | undefined, quotes: string[]): string | null {
  const words = (t: string) => new Set(normalize(t).match(/[a-z0-9$]{3,}/g) ?? []);
  const want = words(value ?? "");
  let best: string | null = null;
  let score = -1;
  for (const q of quotes) {
    const have = words(q);
    const n = [...want].filter((w) => have.has(w)).length;
    if (n > score) { best = q; score = n; }
  }
  return best;
}

/** The user turn a quote comes from, or null if it isn't a span of any single user turn. */
export function findQuote(quote: string, transcript: TranscriptEntry[]): TranscriptEntry | null {
  const q = normalize(quote);
  if (!q) return null;
  return transcript.find((entry) => entry.role === "user" && normalize(entry.text).includes(q)) ?? null;
}

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

/** The user turn a quote comes from, or null if it isn't a span of any single user turn. */
export function findQuote(quote: string, transcript: TranscriptEntry[]): TranscriptEntry | null {
  const q = normalize(quote);
  if (!q) return null;
  return transcript.find((entry) => entry.role === "user" && normalize(entry.text).includes(q)) ?? null;
}

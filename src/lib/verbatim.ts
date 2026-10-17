// Quote marks in anything a stakeholder reads (a packet, a follow-up, the summary) hold only a
// source's own words, character for character (HANDOFF.md, async intake; cycle-count retests, three
// packets in a row quoted paraphrases). Builders quote stored verbatim spans and label paraphrases
// "our summary"; this is the last step every such text goes through, so a builder that slips can't
// put words in someone's mouth: a quoted span that isn't in a source loses its quote marks.

/** Every span in straight double quotes. */
export function quotedSpans(text: string): string[] {
  return [...text.matchAll(/"([^"\n]+)"/g)].map((m) => m[1]);
}

/** The text with quote marks kept only around spans found, exactly, in one of the sources. */
export function enforceVerbatim(text: string, sources: string[]): string {
  return text.replace(/"([^"\n]+)"/g, (whole, span: string) => (sources.some((s) => s.includes(span)) ? whole : span));
}

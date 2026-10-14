// Short item titles: the summary and sign-off questions quote them, so they must read as names,
// not as a request cut off mid-word (async persona 7: "…done by hand in spreadsheets or ").

/** The first clause of a text, at most `max` characters, cut at a word boundary. */
export function shortTitle(text: string, max = 60): string {
  const first = text.trim().split(/(?<=[.!?;:])\s|\n/)[0].replace(/[.!?;:,]+$/, "").trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  const words = (at > max / 2 ? cut.slice(0, at) : first.slice(0, max)).replace(/[\s,;:-]+$/, "");
  // Don't end on a dangling joining word.
  return `${words.replace(/\s+(and|or|but|so|to|of|for|in|on|with|the|a|an|by|from)$/i, "")}…`;
}

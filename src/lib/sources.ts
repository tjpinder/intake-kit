// Async intake: what a pasted source needs before it can be read.

export type SourceKind = "reply" | "notes" | "transcript";

/**
 * A pasted source can be read only once its type and its speaker are chosen: nothing is assumed
 * (live test: notes from a call with a third party went in as the requester's own reply, the
 * screen's default, and confirmed a definition).
 */
export function readyToRead(s: { kind: SourceKind | null; speaker: string; text: string }): s is { kind: SourceKind; speaker: string; text: string } {
  return !!s.kind && !!s.speaker.trim() && !!s.text.trim();
}

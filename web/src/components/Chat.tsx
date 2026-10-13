// The conversation: the interviewer's replies and the user's messages, and the box to answer in.

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Summary, TranscriptEntry } from "../../../src/core.ts";
import { SummaryCard } from "./SummaryCard.tsx";

export const STARTERS = [
  "I need a daily report of late trailers by carrier. Right now I copy the yard log into a spreadsheet every morning.",
  "Orders from one of our customers stopped flowing into the WMS last week.",
  "Could AI help us match supplier invoices to purchase orders?",
];

export function Chat(props: {
  transcript: TranscriptEntry[];
  replies: string[];
  /** The proposed reflect-back, built from the session, and the reply it goes under. */
  summary?: { at: number; summary: Summary } | null;
  pending: string | null;
  busy: boolean;
  disabled: boolean;
  /** Why the box is disabled, shown as its placeholder. */
  disabledReason?: string;
  maxChars: number;
  draft: string;
  onDraft: (text: string) => void;
  onSend: (text: string) => void;
  onSample: (() => void) | null;
  /** Set when live interviews need the visitor's own key (no built-in model on this server). */
  needsKey?: { onOpenSettings: () => void } | null;
}) {
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // Keep the newest message in view, but leave the welcome page at the top.
    if (props.transcript.length || props.pending) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [props.transcript.length, props.replies.length, props.pending, props.busy]);

  useEffect(() => {
    if (!props.busy && !props.disabled) input.current?.focus();
  }, [props.busy, props.disabled]);

  const send = () => {
    const text = props.draft.trim();
    if (text && !props.busy && !props.disabled) props.onSend(text);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const empty = props.transcript.length === 0 && !props.pending;
  return (
    <section className="chat" aria-label="Interview">
      <div className="messages" aria-live="polite">
        {empty ? (
          <div className="welcome">
            <h2>What do you need?</h2>
            <p>
              Describe the problem in your own words, the way you'd explain it to a colleague. I'll ask one question at a time,
              play back what I heard, and then show whether it's worth building, with a spec pack you can hand to a builder.
            </p>
            <div className="starters">
              {STARTERS.map((s) => (
                <button key={s} className="starter" onClick={() => props.onDraft(s)}>{s}</button>
              ))}
            </div>
            {props.needsKey ? (
              <p className="needs-key">
                The built-in model isn't available on this server right now.{" "}
                <button className="link" onClick={props.needsKey.onOpenSettings}>Use your own API key</button>
                {props.onSample ? ", or watch the sample below." : "."}
              </p>
            ) : null}
            {props.onSample ? (
              <p className="sample-cta">
                Or <button className="link" onClick={props.onSample}>watch a sample intake</button>: a warehouse supervisor's request,
                replayed in your browser with no model calls.
              </p>
            ) : null}
          </div>
        ) : null}
        {props.transcript.map((entry, i) => (
          <div key={`${i}-${entry.at}`}>
            <div className="msg user"><p>{entry.text}</p></div>
            {props.replies[i] !== undefined ? <div className="msg bot"><p>{props.replies[i]}</p></div> : null}
            {props.summary?.at === i && props.replies[i] !== undefined ? <SummaryCard summary={props.summary.summary} /> : null}
          </div>
        ))}
        {props.pending ? <div className="msg user pending"><p>{props.pending}</p></div> : null}
        {props.busy ? <div className="msg bot typing" aria-label="Thinking"><span /><span /><span /></div> : null}
        <div ref={end} />
      </div>

      <form className={`composer${focused ? " focused" : ""}`} onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor="message" className="sr-only">Your answer</label>
        <textarea
          id="message"
          ref={input}
          value={props.draft}
          onChange={(e) => props.onDraft(e.target.value.slice(0, props.maxChars))}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={2}
          placeholder={props.disabled ? (props.disabledReason ?? "") : empty ? "Describe what you need..." : "Your answer..."}
          disabled={props.disabled}
        />
        <button type="submit" className="primary" disabled={props.busy || props.disabled || !props.draft.trim()}>Send</button>
      </form>
    </section>
  );
}

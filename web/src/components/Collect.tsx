// Async intake in the browser (HANDOFF.md, "Async intake mode"): triage, send the question packet,
// paste back replies, notes or transcripts, follow up on what's still open, check the summary
// line by line, and sign off. Only reading a source and writing the summary call the server; the
// rest is the same code the plugin runs.

import { useMemo, useState } from "react";
import { buildPacket, buildSummary, findGaps, followUpEmail, packetAgenda, packetEmail, readinessLines, type ItemType, type Modifier, type Session } from "../../../src/core.ts";
import { fw } from "../kit.ts";
import { SummaryCard } from "./SummaryCard.tsx";

export interface TriageForm {
  request: string;
  from: string;
  title: string;
  type: ItemType;
  modifiers: Modifier[];
}

import { readyToRead, type SourceKind } from "../../../src/lib/sources.ts";

const TYPES: Array<{ type: ItemType; label: string; hint: string }> = [
  { type: "known_idea", label: "A specific thing to build", hint: "They already know what they want built." },
  { type: "data_report", label: "A report or a number", hint: "They want to see something they can't see today." },
  { type: "manual_process", label: "Work done by hand", hint: "Someone does it manually, over and over." },
  { type: "broken", label: "Something that broke", hint: "It used to work, and now it doesn't." },
  { type: "exploratory", label: "Looking for where to start", hint: "They want ideas, not a specific build." },
];
const MODIFIERS: Array<{ m: Modifier; label: string }> = [
  { m: "integration", label: "Connects two systems" },
  { m: "compliance", label: "Answers to a compliance rule" },
  { m: "migration", label: "Replaces an existing system" },
];
const KIND_LABEL: Record<string, string> = { request: "Request", reply: "Their reply", notes: "My notes", transcript: "Call transcript" };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CopyBar({ text, file, extra }: { text: string; file: string; extra?: { label: string; file: string; text: string } }) {
  const [copied, setCopied] = useState(false);
  return (
    <p className="copybar">
      <button onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>{copied ? "Copied" : "Copy"}</button>
      <button onClick={() => download(file, text)}>Download .md</button>
      {extra ? <button onClick={() => download(extra.file, extra.text)}>{extra.label}</button> : null}
    </p>
  );
}

/** Triage: the request in one line, who it's from, the type and any modifiers. No model call. */
export function TriageView({ onStart, onCancel }: { onStart: (f: TriageForm) => void; onCancel: () => void }) {
  const [f, setF] = useState<TriageForm>({ request: "", from: "", title: "", type: "known_idea", modifiers: [] });
  const ok = f.request.trim() && f.from.trim();
  return (
    <section className="collect" aria-label="Start an async intake">
      <div className="collect-inner">
      <h2>Collect answers from someone else</h2>
      <p className="muted">You'll get a question packet to send them. Paste back whatever comes back (their reply, your notes, a call transcript) and the kit reads it, shows what's covered and what conflicts, and writes a round-2 packet with only what's still open.</p>
      <label className="field">The request, in one line, the way it came in
        <textarea rows={2} value={f.request} onChange={(e) => setF({ ...f, request: e.target.value })} placeholder="A daily short-pick report per picker so the shift leads can target retraining" />
      </label>
      <div className="row">
        <label className="field">Who it's from<input value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} placeholder="Sam (ops supervisor)" /></label>
        <label className="field">Short title (optional)<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Daily short-pick report" /></label>
      </div>
      <fieldset className="field">
        <legend>Do they already have something specific in mind to build, or are they looking for where to start?</legend>
        {TYPES.map((t) => (
          <label key={t.type} className="choice">
            <input type="radio" name="type" checked={f.type === t.type} onChange={() => setF({ ...f, type: t.type })} />
            <span><strong>{t.label}</strong> <span className="muted">{t.hint}</span></span>
          </label>
        ))}
      </fieldset>
      <fieldset className="field">
        <legend>Only if it applies</legend>
        {MODIFIERS.map(({ m, label }) => (
          <label key={m} className="choice">
            <input type="checkbox" checked={f.modifiers.includes(m)} onChange={(e) => setF({ ...f, modifiers: e.target.checked ? [...f.modifiers, m] : f.modifiers.filter((x) => x !== m) })} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <p className="actions">
        <button className="primary" disabled={!ok} onClick={() => onStart({ ...f, request: f.request.trim(), from: f.from.trim(), title: f.title.trim() })}>Make the question packet</button>
        <button className="link" onClick={onCancel}>Back</button>
      </p>
      </div>
    </section>
  );
}

export function CollectView(props: {
  session: Session;
  busy: boolean;
  disabled: boolean;
  disabledReason: string;
  maxSourceChars: number;
  confirm: Array<{ key: string; question: string }> | null;
  onIngest: (source: { kind: SourceKind; from: string; text: string }) => Promise<boolean>;
  onSummary: () => void;
  onCorrect: (c: { item?: string; area?: string; term?: string; text: string }) => void;
  onSignOff: (keys: string[], by: string) => void;
}) {
  const { session } = props;
  const item = session.items.find((i) => !i.spawned_from)!;
  const request = session.session.sources?.find((s) => s.kind === "request");
  const packet = useMemo(() => buildPacket(fw, { request: request?.text ?? item.title, type: item.type, modifiers: item.modifiers }), [request?.text, item.title, item.type, item.modifiers]);
  const gaps = useMemo(() => findGaps(session, fw), [session]);
  const followUp = useMemo(() => followUpEmail(session, gaps), [session, gaps]);
  const pasted = (session.session.sources ?? []).filter((s) => s.kind !== "request");
  const phase = session.session.engine?.phase;
  const summary = useMemo(() => (phase === "summary" ? buildSummary(session, fw) : null), [phase, session]);

  // No defaults: the interviewer says what it is and whose words it holds, every time.
  const [kind, setKind] = useState<SourceKind | null>(null);
  const [from, setFrom] = useState("");
  const [text, setText] = useState("");
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixText, setFixText] = useState("");
  const [agreed, setAgreed] = useState<string[]>([]);
  const [by, setBy] = useState("");

  const read = async () => {
    const s = { kind, speaker: from, text };
    if (!readyToRead(s)) return;
    const ok = await props.onIngest({ kind: s.kind, from: s.speaker.trim(), text });
    if (ok) { setText(""); setKind(null); setFrom(""); }
  };
  const startFix = (key: string, current: string) => { setFixing(key); setFixText(current); };

  return (
    <section className="collect" aria-label="Async intake">
      <div className="collect-inner">
      <header className="collect-head">
        <h2>{item.title} <span className="badge">{TYPES.find((t) => t.type === item.type)?.label}</span></h2>
        {request ? <p className="muted">"{request.text}" from {request.from}</p> : null}
      </header>

      <details className="step" open={pasted.length === 0}>
        <summary><h3>1. Send the questions</h3></summary>
        <p className="muted">{packet.questions.length} questions, plus {packet.if_you_know.length} "if you know". Send it by email, or use it as your meeting agenda.</p>
        <CopyBar text={packetEmail(packet)} file="intake-packet.md" extra={{ label: "Download agenda", file: "intake-agenda.md", text: packetAgenda(packet) }} />
        <pre className="doc">{packetEmail(packet)}</pre>
      </details>

      <div className="step">
        <h3>2. Paste what came back</h3>
        <div className="kind-row" role="radiogroup" aria-label="What it is">
          {(["reply", "notes", "transcript"] as const).map((k) => (
            <label key={k} className="choice inline">
              <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} disabled={props.disabled} />
              <span>{KIND_LABEL[k]}</span>
            </label>
          ))}
        </div>
        <label className="field from">{kind === "notes" ? "Whose answers are these notes of?" : kind === "transcript" ? "Who was answering on the call?" : "Who wrote it?"}
          <input value={from} onChange={(e) => setFrom(e.target.value)} disabled={props.disabled} placeholder={request ? `For example, ${request.from}` : "Name and role"} />
        </label>
        {kind === "notes" ? <p className="hint">Your notes are your paraphrase. Anything that's only in your notes stays "needs confirming" until the person confirms it in their own words.</p> : null}
        {!kind ? <p className="hint">Choose what it is first: their own reply, your notes from a conversation, or a call transcript.</p> : null}
        <textarea className="paste" rows={8} value={text} onChange={(e) => setText(e.target.value.slice(0, props.maxSourceChars))} disabled={props.disabled}
          placeholder={props.disabled ? props.disabledReason : "Paste their email reply, your meeting notes, or a call transcript, exactly as it is."} />
        <p className="actions">
          <button className="primary" disabled={props.busy || props.disabled || !readyToRead({ kind, speaker: from, text })} onClick={() => void read()}>{props.busy ? "Reading…" : "Read it"}</button>
          <span className="muted">{text.length ? `${text.length.toLocaleString()} / ${props.maxSourceChars.toLocaleString()} characters` : ""}</span>
        </p>
        {pasted.length ? (
          <ul className="sources">
            {pasted.map((s) => <li key={s.id}><strong>{KIND_LABEL[s.kind]}</strong> {s.kind === "notes" ? "on what" : "from"} {s.from}{s.kind === "notes" ? " said" : ""} <span className="muted">({s.text.length.toLocaleString()} characters)</span></li>)}
          </ul>
        ) : null}
      </div>

      {pasted.length ? (
        <div className="step">
          <h3>3. Where it stands</h3>
          <ul className="readiness">{readinessLines(gaps).map((l) => <li key={l}>{l}</li>)}</ul>
          {followUp ? (
            <>
              <h4>Round-2 packet: {gaps.gaps.length} question{gaps.gaps.length === 1 ? "" : "s"}, only what's still open</h4>
              <CopyBar text={followUp} file="intake-round-2.md" />
              <pre className="doc">{followUp}</pre>
            </>
          ) : <p className="ready">Nothing is open. Write the summary when you're ready.</p>}
        </div>
      ) : null}

      {pasted.length ? (
        <div className="step">
          <h3>4. Summary and sign-off</h3>
          {!summary ? (
            <p className="actions">
              <button className="primary" disabled={props.busy || props.disabled} onClick={props.onSummary}>{props.busy ? "Writing…" : "Write the summary"}</button>
              <span className="muted">You can do this any time; open questions show up in it.</span>
            </p>
          ) : (
            <>
              <SummaryCard summary={summary} />
              <h4>Correct a line</h4>
              <p className="hint">A correction is recorded as your notes, so it stays "needs confirming" until they confirm it. The summary is written again afterwards.</p>
              <ul className="fix-list">
                {summary.items.flatMap((it) => it.answers.map((a) => {
                  const key = `${it.id}:${a.area}`;
                  return (
                    <li key={key}>
                      <span><strong>{a.label}:</strong> {a.value ?? <em className="muted">not known</em>}</span>
                      {fixing === key ? (
                        <span className="fix">
                          <input value={fixText} onChange={(e) => setFixText(e.target.value)} aria-label={`Correction for ${a.label}`} />
                          <button className="primary" disabled={!fixText.trim()} onClick={() => { props.onCorrect({ item: it.id, area: a.area, text: fixText }); setFixing(null); }}>Save</button>
                          <button className="link" onClick={() => setFixing(null)}>Cancel</button>
                        </span>
                      ) : <button className="link" disabled={props.disabled} onClick={() => startFix(key, a.value ?? "")}>Correct</button>}
                    </li>
                  );
                }))}
                {(session.terms ?? []).filter((t) => t.status !== "not_a_term").map((t) => {
                  const key = `term:${t.id}`;
                  return (
                    <li key={key}>
                      <span><strong>"{t.term}":</strong> {t.status === "confirmed" ? t.definition : <em className="muted">{t.draft ? `draft: ${t.draft.definition}` : "not defined yet"}</em>}</span>
                      {fixing === key ? (
                        <span className="fix">
                          <input value={fixText} onChange={(e) => setFixText(e.target.value)} aria-label={`Definition of ${t.term}`} />
                          <button className="primary" disabled={!fixText.trim()} onClick={() => { props.onCorrect({ term: t.term, text: fixText }); setFixing(null); }}>Save</button>
                          <button className="link" onClick={() => setFixing(null)}>Cancel</button>
                        </span>
                      ) : <button className="link" disabled={props.disabled} onClick={() => startFix(key, t.definition ?? t.draft?.definition ?? "")}>Correct</button>}
                    </li>
                  );
                })}
              </ul>

              {props.confirm?.length ? (
                <>
                  <h4>Don't-build reasons: confirm each one separately</h4>
                  <p className="hint">A reason you don't confirm sends that item to Gather more, never Don't build.</p>
                  <ul className="confirm-list">
                    {props.confirm.map((c) => (
                      <li key={c.key}>
                        <label className="choice">
                          <input type="checkbox" checked={agreed.includes(c.key)} onChange={(e) => setAgreed(e.target.checked ? [...agreed, c.key] : agreed.filter((k) => k !== c.key))} />
                          <span>{c.question}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <div className="row signoff">
                <label className="field compact">Signed off by<input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Your name" /></label>
                <button className="primary" disabled={props.busy || !by.trim()} onClick={() => props.onSignOff(agreed, by.trim())}>Sign off</button>
                <span className="muted">Sign off when it meets your expectations and you understand the work.</span>
              </div>
            </>
          )}
        </div>
      ) : null}
      </div>
    </section>
  );
}

// The reflect-back the user checks, built by code from the session (src/lib/summary.ts), shown
// under the reply that proposed it. Never the model's own words.

import type { Summary } from "../../../src/core.ts";

const STATUS_NOTE: Record<string, string> = {
  covered: "",
  assumed: "my reading; please check",
  unknown: "not known yet",
  not_applicable: "doesn't apply",
};

export function SummaryCard({ summary, onConfirm = null }: { summary: Summary; onConfirm?: (() => void) | null }) {
  return (
    <div className="msg bot summary" aria-label="Summary of what you told me">
      <p className="summary-lead">Here's what I've recorded. Tell me anything that's wrong or missing.</p>
      {summary.items.map((it) => (
        <section key={it.id}>
          <h4>{it.title} <span className="badge">{it.type}</span></h4>
          <dl>
            {([["The problem", it.problem], ["Today", it.today], ["Smallest useful version", it.smallest_version], ["Out of scope", it.out_of_scope], ["How risk is reduced", it.mitigation]] as const)
              .filter(([, text]) => text)
              .map(([label, text]) => (
                <div key={label}><dt>{label}</dt><dd>{text}</dd></div>
              ))}
          </dl>
          {it.answers.length ? (
            <>
              <h5>What you told me</h5>
              <ul>
                {it.answers.map((a) => (
                  <li key={a.area} className={a.captured ? "captured" : `s-${a.status}`}>
                    <strong>{a.label}:</strong> {a.value ?? ""}
                    {a.captured ? <em> (your words as typed; not yet confirmed)</em> : STATUS_NOTE[a.status] ? <em> ({STATUS_NOTE[a.status]})</em> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {it.bands.length ? (
            <>
              <h5>How I'd rate it</h5>
              <ul>
                {it.bands.map((b) => (
                  <li key={b.fact} className={b.unknown ? "s-unknown" : ""}>
                    <strong>{b.label}:</strong> {b.text}{b.note ? <em> {b.note}</em> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {it.acceptance.length ? (<><h5>It works when</h5><ul>{it.acceptance.map((a) => <li key={a}>{a}</li>)}</ul></>) : null}
          {it.guardrails.length ? (<><h5>Guardrails</h5><ul>{it.guardrails.map((g) => <li key={g}>{g}</li>)}</ul></>) : null}
          {it.open_questions.length ? (<><h5>Still open</h5><ul>{it.open_questions.map((q) => <li key={q}>{q}</li>)}</ul></>) : null}
        </section>
      ))}
      {summary.set_aside.length ? (<><h5>Set aside</h5><ul>{summary.set_aside.map((s) => <li key={s}>{s}</li>)}</ul></>) : null}
      {onConfirm ? (
        <p className="summary-actions">
          <button className="primary" onClick={onConfirm}>Looks right</button>
          <span className="muted"> or type what to change below.</span>
        </p>
      ) : null}
    </div>
  );
}

// After the reflect-back is confirmed: each item's gate, why, and the spec pack to download.

import { useMemo, useState } from "react";
import { gateBlurb, type Session } from "../../../src/core.ts";
import { fw } from "../kit.ts";
import { downloadPack, packFiles } from "../pack.ts";

const DECISION: Record<string, { label: string; cls: string }> = {
  go: { label: "Go", cls: "g-go" },
  gather_more: { label: "Gather more", cls: "g-more" },
  dont_build: { label: "Don't build", cls: "g-dont" },
  fix_not_build: { label: "Fix, not build", cls: "g-fix" },
};

export function Review({ session, onNewIntake }: { session: Session; onNewIntake: () => void }) {
  const files = useMemo(() => packFiles(session), [session]);
  const [selected, setSelected] = useState(files.find(([n]) => n === "SPEC.md")?.[0] ?? files[0][0]);
  const content = files.find(([n]) => n === selected)?.[1] ?? "";

  return (
    <div className="review">
      <section className="gates" aria-label="Decisions">
        <h2>Decisions</h2>
        {session.items.map((item) => {
          const gate = item.gate!;
          const d = DECISION[gate.decision];
          const primary = gate.reasons.filter((r) => !r.startsWith("(also matched"));
          const also = gate.reasons.filter((r) => r.startsWith("(also matched"));
          return (
            <article key={item.id} className={`gate ${d.cls}`}>
              <header>
                <span className="decision">{d.label}</span>
                <h3>{item.title}</h3>
              </header>
              <p className="blurb">{primary[0]?.startsWith("Superseded by") ? `Not needed: ${item.superseded_by} replaces it.` : gateBlurb(session, item, fw)}</p>
              <ul>{primary.map((r) => <li key={r}>{r}</li>)}</ul>
              {also.length ? (
                <details>
                  <summary>Other rules that also matched</summary>
                  <ul>{also.map((r) => <li key={r}>{r.replace(/^\(also matched [a-z_]+\) /, "")}</li>)}</ul>
                </details>
              ) : null}
              {item.scoring?.quadrant ? (
                <p className="scores">Automation potential {item.scoring.automation_potential} · ease {item.scoring.ease} · {item.scoring.quadrant}</p>
              ) : null}
              {gate.revisit_trigger ? <p className="revisit">{gate.revisit_trigger}.</p> : null}
            </article>
          );
        })}
      </section>

      <section className="files" aria-label="Spec pack">
        <div className="files-head">
          <h2>Spec pack</h2>
          <button className="primary" onClick={() => downloadPack(session)}>Download all ({files.length} files)</button>
        </div>
        <div className="file-tabs" role="tablist" aria-label="Files">
          {files.map(([name]) => (
            <button key={name} role="tab" aria-selected={name === selected} className={name === selected ? "tab active" : "tab"} onClick={() => setSelected(name)}>
              {name}
            </button>
          ))}
        </div>
        <pre className="file-view" role="tabpanel" aria-label={selected} tabIndex={0}>{content}</pre>
        <p className="muted">
          Every requirement in SPEC.md and ACCEPTANCE.md cites the answer it came from, in the interviewee's own words. To start
          building, open FIRST_PROMPT.md in a new Claude Code or Codex session.
        </p>
        <button onClick={onNewIntake}>Start a new intake</button>
      </section>
    </div>
  );
}

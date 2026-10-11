// Live coverage: what the interview has captured so far, per item, from the same statusOf the
// interviewer sees. Lets the user (and a demo audience) watch the spec fill in.

import { coverageFor, statusOf, type Session } from "../../../src/core.ts";
import { fw } from "../kit.ts";

const TYPE_LABEL: Record<string, string> = {
  broken: "Something's broken",
  manual_process: "Manual process",
  known_idea: "Idea to test",
  exploratory: "Exploring",
  data_report: "Data / report",
};

const short = (id: string) => id.split(".").pop()!.replace(/_/g, " ");

function areaState(session: Session, itemIndex: number | null, id: string): { label: string; cls: string } {
  const entry = itemIndex === null
    ? session.core[id.slice(5) as keyof Session["core"]]
    : coverageFor(session, session.items[itemIndex], id);
  if (!entry || !entry.updated_at) return { label: "not asked yet", cls: "a-unasked" };
  if (entry.status === "covered") return { label: "covered", cls: "a-covered" };
  if (entry.status === "assumed") return { label: "assumed", cls: "a-assumed" };
  if (entry.status === "not_applicable") return { label: "not applicable", cls: "a-covered" };
  return { label: "unknown", cls: "a-unknown" };
}

function Area({ session, itemIndex, id, critical }: { session: Session; itemIndex: number | null; id: string; critical: boolean }) {
  const s = areaState(session, itemIndex, id);
  return (
    <li className={`area ${s.cls}`} title={`${id}: ${s.label}${critical ? " (needed to build)" : ""}`}>
      <span className="dot" aria-hidden="true" />
      <span className="area-name">{short(id)}{critical ? <span className="crit" aria-label="needed to build">*</span> : null}</span>
      <span className="sr-only">{s.label}</span>
    </li>
  );
}

export function Sidebar({ session }: { session: Session }) {
  const status = statusOf(session, fw);
  const coreAreas = fw.modules.core.areas;
  return (
    <aside className="sidebar" aria-label="What the interview has captured">
      <h2>Captured so far</h2>
      {status.reflect_back === "confirmed" ? (
        <p className="ready done">Confirmed. The spec pack is ready.</p>
      ) : status.ready_for_reflect_back ? (
        <p className="ready">Enough to play it back.</p>
      ) : null}

      <section>
        <h3>Shared</h3>
        <ul className="areas">
          {coreAreas.map((a) => <Area key={a.id} session={session} itemIndex={null} id={a.id} critical={a.critical} />)}
        </ul>
      </section>

      {session.items.length === 0 ? <p className="muted">Items appear here as you describe what you need.</p> : null}

      {session.items.map((item, i) => {
        const st = status.items[i];
        const modules = [item.type, ...item.modifiers.map((m) => `mod.${m}`)];
        const areas = modules.flatMap((m) => fw.modules[m]?.areas ?? []);
        return (
          <section key={item.id} className="item">
            <h3>
              {item.title}
              <span className="badge">{TYPE_LABEL[item.type]}</span>
              {item.superseded_by ? <span className="badge subtle">replaced by {item.superseded_by}</span> : null}
            </h3>
            <ul className="areas">
              {areas.map((a) => <Area key={a.id} session={session} itemIndex={i} id={a.id} critical={a.critical} />)}
            </ul>
            <p className="counts">
              {Object.keys(item.facts).length} ratings
              {st.facts_missing.length ? ` (${st.facts_missing.length} to go)` : ""}
              {" · "}{st.acceptance.criteria + st.acceptance.error_cases} acceptance checks
              {" · "}{item.guardrails.length} guardrails
              {item.open_questions.length ? ` · ${item.open_questions.length} open question${item.open_questions.length === 1 ? "" : "s"}` : ""}
            </p>
          </section>
        );
      })}

      <p className="legend">
        <span className="area a-covered"><span className="dot" /> covered</span>
        <span className="area a-assumed"><span className="dot" /> assumed</span>
        <span className="area a-unknown"><span className="dot" /> unknown</span>
        <span className="area a-unasked"><span className="dot" /> not asked</span>
        <span>* needed to build</span>
      </p>
    </aside>
  );
}

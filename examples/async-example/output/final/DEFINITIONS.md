# Definitions: Daily short-pick report; Monday Excel export

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14). Every business term the intake found, defined by the owner in their own words. An item can't reach Go while a term it uses is unconfirmed.

Wherever a term turns into SQL, a rule or a metric, put its definition next to the logic, in a comment or the acceptance check, and cite this file. For example: `-- Over pick = units picked that aren't on the system transaction (owner-confirmed, DEFINITIONS.md)`. Never interpret a term that isn't here: add it as unconfirmed and ask the owner.

### short-pick (metric): confirmed

> A short pick is a pick confirmed with fewer units than the task asked for; cancelled lines don't count; wrong-location scans do count. Example: order 88's task said 5 and the picker confirmed 4, so that's 1 short pick.

In the owner's words: "Short pick, in my words: a pick confirmed with fewer units than the task asked for. Cancelled lines don't count, and wrong-location scans do count. Example: order 88's task said 5 and the picker confirmed 4, so that's 1 short pick.". Given by Sam (ops supervisor), in a reply from Sam (ops supervisor).

Can it be seen in the data? Yes.

Known answers (each becomes an acceptance check):
- order 88's task said 5 and the picker confirmed 4 → 1 short pick

### over pick (metric): confirmed

> An over pick is when someone physically takes more than the ticket says; the system never sees it because they confirm the ticket quantity.

In the owner's words: "An over pick is when someone physically takes more than the ticket says - the system never sees it because they confirm the ticket quantity.". Given by Sam (ops supervisor), in a reply from Sam (ops supervisor).

Can it be seen in the data? No: it isn't in the system's data.

_Recommended: one real example with its correct result, so the build can be checked against it._

# Definitions: Daily short-pick report; Sam builds the report manually in Excel from WMS export

Rendered by intake-kit from `intake-answers.yaml` (session 2026-10-14-de70, 2026-10-14). Every business term the intake found, defined by the owner in their own words. An item can't reach Go while a term it uses is unconfirmed.

Wherever a term turns into SQL, a rule or a metric, put its definition next to the logic, in a comment or the acceptance check, and cite this file. For example: `-- Over pick = units picked that aren't on the system transaction (owner-confirmed, DEFINITIONS.md)`. Never interpret a term that isn't here: add it as unconfirmed and ask the owner.

### short pick (metric): unconfirmed

_The owner hasn't defined it yet. Don't interpret it: ask._

Found in: "a short pick is when the confirmed quantity is less than the task quantity. Cancelled lines don't count. I think wrong-location scans should count too but I'm not totally sure, Priya might know.".

Draft, not yet certain: "A short pick is when the confirmed quantity is less than the task quantity; cancelled lines don't count; wrong-location scans do count." (notes from Tom).

Can it be seen in the data? Yes.

_Recommended: one real example with its correct result, so the build can be checked against it._

### over pick (metric): confirmed

> An over pick is when someone physically takes more than the ticket says, but the system never sees it because they confirm the ticket quantity.

In the owner's words: "An over pick is when someone physically takes more than the ticket says - the system never sees it because they confirm the ticket quantity. Last week order 5521's ticket said 12 and 14 came off the slot, so that's 2 over picked.". Given by Sam (ops supervisor), in a reply from Sam (ops supervisor).

Can it be seen in the data? No: it isn't in the system's data.

_Recommended: one real example with its correct result, so the build can be checked against it._

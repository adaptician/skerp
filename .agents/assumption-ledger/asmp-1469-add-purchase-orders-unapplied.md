---
status: open
tier: assumed
claim: >
  No environment (local shared database, Development, QA, Production) has applied the AddPurchaseOrders
  migration as first committed (20261023070746), so it could be regenerated in place.
settles: >
  A human checks the `__EFMigrationsHistory` table of each deployed environment for the id
  `20261023070746_AddPurchaseOrders`; none has it.
---
# AddPurchaseOrders was never applied

PR 728 review thread 4276 moved every timestamp from UTC ticks to ISO 8601 text. The columns are created
by `AddPurchaseOrders`, so the migration was regenerated in place (now `20261025131942_AddPurchaseOrders`)
with the human's explicit approval, which stated that no environment has applied it. Taken on that word, not
checked. If one has, it holds the old id and INTEGER columns: the new migration would not run there (it
would try to create tables that exist) and the schema would diverge. The fix then is a converting
migration on top of the old one. A developer's local `App_Data/skerp.db` made from the old migration also
needs deleting.

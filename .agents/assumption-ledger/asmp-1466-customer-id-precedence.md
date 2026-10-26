---
status: settled
tier: derived
claim: >
  A create request that names an existing customer by id plus only one of name or email uses the
  stored customer unchanged; only id, name and email together are refused (400).
settles: >
  api.md → Create endpoint: "if a customer id and customer name and email address are all present
  fail with a bad request error", and "when an existing customer is selected (id is populated) DO
  NOT overwrite the customer name and email".
outcome: >
  Derived 2026-10-23 for AB#1466 from api.md's wording, which refuses only the three-field case and
  says an id means the stored values win. The same rule applies to products (id plus SKU and name
  refused). The client never sends the extra fields, so the case arises only from a direct API call.
---
# Customer and product id precedence

`api.md`'s own request example shows all three customer fields together, which its rule refuses;
the rule text was taken as authoritative over the example. If the product owner wants an id with any
extra field refused, `CreatePurchaseOrderCommandValidator` and `LineItemInputValidator` change from
"all three" to "any".

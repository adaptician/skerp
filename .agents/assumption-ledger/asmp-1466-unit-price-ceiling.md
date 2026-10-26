---
status: settled
tier: derived
claim: >
  A unit price may be at most 999 999 999.9999, so 100 lines of 1 000 units still fit the 18,4
  precision every amount is stored with.
settles: >
  The storage arithmetic: amounts are stored as 64-bit ten-thousandths (precision 18,4), a grand
  total is at most 100 × 1 000 × the unit price, and that product must stay below 10^14.
outcome: >
  Derived 2026-10-23 for AB#1466: 100 × 1 000 × 999 999 999.9999 ≈ 10^14, inside 18,4 and inside a
  64-bit integer of ten-thousandths (9.2 × 10^18). Enforced by PurchaseOrderLineItem.IsValidPrice on
  the server and priceError on the client. A higher ceiling needs a wider storage type.
---
# Unit-price ceiling

`entities.md` gives a minimum price (0.01) and a precision (18,4) but no maximum. Without one, a
large price × quantity overflows the stored grand total. The ceiling is the largest value the stated
precision allows for the largest order (100 lines × 1 000 units). Edit (AB#1468) reuses it.

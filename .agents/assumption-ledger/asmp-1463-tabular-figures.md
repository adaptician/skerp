---
status: settled
tier: measured
claim: >
  Nunito Sans supports tabular figures (the OpenType tnum feature), so the Numeric/* text styles and
  font-variant-numeric: tabular-nums align numbers in tables and totals without a third font family.
settles: >
  A human enables "Tabular figures" on the Numeric/* text styles in the Figma file and confirms that the
  totals column in Sales / Purchase Orders / List / Desktop aligns; or AB#1464 renders R 1 284.50 and
  R 742.80 right-aligned in the browser with tabular-nums and the digits line up.
outcome: >
  Measured 2026-10-22 in Chromium (AB#1464): with Nunito Sans 600 at 16px from Google Fonts, "1111" and
  "8888" both render 38.41px wide, with and without font-variant-numeric: tabular-nums. The digits are
  equal-width, so totals align without a third font family. The client's Numeric/* mixins also set
  tabular-nums. The Figma toggle on the Numeric/* styles is still a human's to switch on.
---
# Tabular figures in Nunito Sans

The designer prompt requires that numbers in tables and totals align, using tabular figures where the
font supports them, and allows at most two font families (Fraunces and Nunito Sans are used). The Figma
plugin API used to build the file cannot set OpenType features, so the `Numeric/*` styles in Figma still
render proportional figures until a human switches on *Tabular figures*.

If Nunito Sans does not ship `tnum`, the total, price, quantity and sub-total columns will not align. The
fallback is to swap the `Numeric/*` styles to a family that does (for example Source Sans 3), which needs
the operator's agreement because it changes the type pairing.

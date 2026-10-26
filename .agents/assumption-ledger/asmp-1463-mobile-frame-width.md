---
status: settled
tier: assumed
claim: >
  Mobile Figma frames are drawn at 576px ($breakpoint-sm) and desktop at 1400px ($breakpoint-xxl), with no
  frame narrower than the sm breakpoint, satisfying design.md's rule that frames sit at the code scale.
settles: >
  A human confirms the two widths, or approves a sub-sm phone reference width (e.g. 375px) recorded as a
  solution overlay, before the designer builds screen frames under AB#1463.
outcome: >
  Product owner decision (2026-10-22): mobile frames at 576px and desktop frames at 1400px are acceptable. No frame below the sm breakpoint is needed.
---
# Mobile frame width

`design.md` → *Breakpoint Frames Must Match the Code Scale* requires frames at exactly the five breakpoint
widths. The mobile-first base (below 576px) has no breakpoint value, so the narrowest compliant frame is
576px — wider than most phones. The designer prompt
(`docs/prompts/design-system-designer-prompt.md`) uses 576/1400 and tells the designer to raise a narrower
frame rather than add one. Every UI Story's design verification compares against these widths.

## Re-planned 2026-10-22

The backlog was condensed. AB#1463 is unchanged. The dependent UI items are now AB#1465, AB#1466, AB#1467, AB#1468, AB#1469 and AB#1470.

## Settled 2026-10-22

Product owner decision (2026-10-22): mobile frames at 576px and desktop frames at 1400px are acceptable. No frame below the sm breakpoint is needed.

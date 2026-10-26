---
title: Solution Figma Files and Screen Index
tier: 1
enforced-by: [verify.mjs, review]
applies-when: >
  Planning, implementing or reviewing any work item with a UI surface in this solution, or reading or
  editing one of its Figma files — whether or not a Figma link was supplied.
disposition: >
  keep — solution bindings, not a rule to mechanise; the screen index it defines is validated
  structurally, and spec citations against it, by verify.mjs (check-screen-index.mjs).
last-reviewed: 2026-10-21
---
# Solution Figma Files and Screen Index

Solution-specific bindings that overlay [`technologies/figma.md`](../technologies/figma.md).
That file says *how* to work with Figma; this file says *which* Figma files this solution uses
and where its screen index lives.

> **Scaffold note.** This file ships as a template. A solution that uses Figma fills in the
> *Which Figma file governs which app* table and the *Themes* list below, and keeps the rest. A solution
> that does not use Figma leaves it untouched; the empty screen index passes the gate and the
> citation check skips, loudly, until the index has screens.

## Which Figma file governs which app

**Use exactly the file named here for each app — never another, even if no link was supplied,
and even if a different file looks relevant.** If a work item, Deliverable field or prompt
points somewhere else for the same app, stop and raise it.

| App | Code | Figma file | File key | Governing design system | ADO source |
|---|---|---|---|---|---|
| Sharp ERP web client | `client/` | [Skerp](https://www.figma.com/design/yzLk80i2s6D2NaP0CO0Irc/Skerp) | `yzLk80i2s6D2NaP0CO0Irc` | Its own variables (Primitives, Color) and components inside the same file | AB#1427 ERP Web App |

If a design system lives in a separate file, say whether the app files link it as a library. Take each
app's variables, styles and components only from the file named for that app (or the design system it
names), never from another app's file.

## Themes

List the audience themes the solution designs for (for example Staff and Client), the colour scheme
each uses, and which Figma variable mode each theme's frames set. Theme and scheme are separate axes
(see `technologies/figma.md` → *Naming convention*). A new screen frame sets its mode before anything
is placed in it.

| Theme (index key segment) | Scheme | Variable mode |
|---|---|---|
| Sales (`sales`) | Light only — no dark variant in scope | `Light` (Color collection) |

## Stock framework screens accepted as stock

List here each pre-built screen the solution deliberately keeps as the framework ships it, with who
accepted it and when. A screen listed here is not a missing design
(`technologies/figma.md` → *No design, no build*).

| Screen | Accepted by | Date |
|---|---|---|
| _none yet_ | | |

## Screen index

[`figma-screen-index.json`](figma-screen-index.json), beside this file, is the only citable source of
node IDs for the files it lists (rule: [`technologies/figma.md`](../technologies/figma.md) → *Screen
index*). It starts empty; it is filled as frames are named to the convention. A file the index does not
list is cited by URL with `node-id` instead.

```json
{
  "version": 1,
  "themes": ["staff", "client", "auth"],
  "breakpoints": ["desktop", "mobile"],
  "files": {
    "app-design": {
      "name": "Example App Design",
      "fileKey": "AbCdEfGhIjKlMnOpQrStUv",
      "url": "https://www.figma.com/design/AbCdEfGhIjKlMnOpQrStUv/Example-App-Design",
      "screens": {
        "client/profile/view/desktop": {
          "node": "123:456",
          "name": "Client / Profile / View / Desktop",
          "approved": { "by": "<name of the approving human>", "on": "2026-10-02", "fingerprint": "fp1:0123456789abcdef" }
        }
      }
    }
  }
}
```

(The file and screen entries above are an illustration of the shape, not real entries.)

- **`themes`** — the allowed first key segments, as slugs. Optional; when empty or absent any slug is
  accepted. Declare it once the solution has themes, so a typo in a key fails the gate.
- **`breakpoints`** — the allowed last key segments. Optional; when empty or absent any slug is accepted.
- **Key** — the kebab-case slug of each segment of the frame name, joined by `/`. Unique within a file.
  **Exactly four segments** (`<theme>/<screen>/<state>/<breakpoint>`). Email frames are named like any
  other: `<Theme> / <Email> / <State> / Desktop`. The colour scheme is not part of the key: each theme's
  page declares it.
- **`node`** — the frame's node ID, `<int>:<int>`. Unique within a file.
- **`name`** — the live frame name when the entry was written. A live name that no longer slugs to the
  key is drift.
- **`approved`** — `null` until a human marks the frame Ready for dev in Figma; then `by` (the human
  who approved it), `on` (ISO date) and `fingerprint` — the frame's structural fingerprint at approval,
  computed by the `design-fidelity-check` skill's `fingerprint.js`. Agents cannot read Ready-for-dev status
  from Figma, so this field is how they see it. An agent may set it only for a frame a human names as
  approved in the session. A frame whose live fingerprint no longer matches was edited after approval and
  needs re-approving.
- Frames on the `🗄️ Archive` page are never indexed.

Editing the index is data maintenance, not a change to this standard: it needs no separate approval
beyond the approval rule above. **An approval write goes in its own commit**, so the code owner reviewing
the PR sees each approval on its own (add this directory to `CODEOWNERS` so that review is intended).
Entries are re-validated live against the file by the
[`design-fidelity-check`](../../skills/design-fidelity-check/SKILL.md) skill's `verify` mode, and checked
offline — structure, and every node a changed `spec.md` cites — by the quality gate
([`check-screen-index.mjs`](../../scripts/check-screen-index.mjs)).

# Plans

This directory holds **cross-cutting** and **multi-feature** Plans — Plans whose scope is not contained inside a single feature folder.

Feature-scoped Plans live elsewhere: at `.agents/specs/<feature-slug>/plan.md`, alongside the feature's spec, decisions, and acceptance criteria. A Plan belongs *here* (under `.agents/plans/`) only when it does not naturally attach to a single feature.

Both kinds of Plan follow the same standard: `.agents/standards/plans.md`.

## When to put a Plan here

- The work touches multiple features, or no feature in particular (e.g. a build-system migration, a cross-cutting refactor, an infrastructure change).
- The work is preparatory or foundational (e.g. setting up CI, introducing a new test framework, scaffolding a shared library).
- The work spans more than one repository area (backend + frontend + persistence, for example) in a way that would be awkward to attach to any single feature's requirements.

If a Plan's natural home is a single feature, put it at `.agents/specs/<feature-slug>/plan.md` instead.

## Naming convention

```
<short-slug>.md
```

- `<short-slug>` is lowercase kebab-case and describes the work in a few words.
- Plans are not numbered (unlike ADRs). Their lifecycle is "open while in progress; archived in place when finished" — there is no audit-trail need for monotonic ordering.
- Use a date prefix only when chronological grouping is genuinely useful (e.g. `2026-q2-build-migration.md`); otherwise prefer a topical slug.

Examples:

- `build-migration-to-dotnet-9.md`
- `introduce-mediatr.md`
- `frontend-state-rework.md`

## Lifecycle

1. **Drafting.** Create the file when the Plan is first being shaped. Author it per `.agents/standards/plans.md` (self-contained, novice-targeted).
2. **In progress.** Update the `Progress`, `Surprises & Discoveries`, and `Decision Log` sections continuously as work proceeds.
3. **Completed.** When the work is done, write the `Outcomes & Retrospective` section. Leave the file in place — it is the historical record of how and why the work was carried out. Do not delete or move it.

## When a Plan triggers an ADR

If a cross-cutting Plan ratifies a significant architectural decision (introducing a new framework, changing persistence strategy, etc.), write an ADR under `.agents/adrs/` and reference it from the Plan's `Decision Log` and `Interfaces and Dependencies` sections. The Plan tracks the *work*; the ADR captures the *decision*. They serve different purposes and both should exist.

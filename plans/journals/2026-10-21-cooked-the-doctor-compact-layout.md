---
title: Cooked the doctor compact layout
date: 2026-10-21
summary: "Rendered doctor as one aligned check list in the clack frame: labelled rows, pass and fail marks, the fix hint nested under its row, no spinner, and the summary closing the frame"
---

# Cooked the doctor compact layout

## What happened

The [doctor compact layout plan](../261021-1408-doctor-compact-layout/plan.md) was cooked. `doctor`
now prints one aligned row per check inside the clack frame, the fix hint sits under the row it
fixes, the spinner is gone, and the run closes with `All 3 checks passed` or
`1 of 3 checks failed`.

## Findings

- **The mockup's opening line has one space more than clack writes.** `intro()` writes `┌  ` and
  `outro()` writes `└  `, both with two spaces; the mockup showed three on the opening line and two
  on the closing one. The frame keeps clack's spacing, so it is consistent with itself.
- **The failing path closes the frame itself.** It throws a `CliError` instead of calling `outro`,
  so `renderError` writes the `│` line and the `└  ` line to stderr.
- **The git version needed a prefix stripped.** The adapter returns the raw `git --version` output,
  so the check removes `git version ` and keeps any build suffix, such as `(Apple Git-146)`.
- **`styleText` needs no colour library.** On Node 24.11.0 it is plain when piped and under
  `NO_COLOR`, and coloured on a pty, which is the whole contract.
- **`log.message` takes an array.** One call with the rows writes them as one block, and
  `spacing: 0` keeps the empty `│` line out of the way.
- **The `note` and `label` ride on `DoctorResult`.** The ids stay for the tests, so nothing that
  matched on an id broke.

## Also

- `renderCheckList` lives in `core/ui/check-list.ui.ts`; the doctor hands it the results and knows
  nothing about the layout.
- No comment was added: the code changes need none.
- The gate is green on Node 24.11.0: lint, typecheck, 95 tests, build, format.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.

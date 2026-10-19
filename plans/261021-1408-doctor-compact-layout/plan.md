---
title: "Doctor compact layout"
description: "Render doctor as one aligned check list in the clack frame: labelled rows, pass and fail marks, the fix hint under its row, no spinner, and a closing summary line."
status: done
priority: P2
effort: 1h
branch: main
tags: [ui, doctor]
blockedBy: []
blocks: []
created: 2026-10-21
---

# Doctor compact layout

## Overview

The doctor output is noisy:

- every check is a separate clack log call, which adds an empty `│` line before it;
- a pass shows as `◆`;
- a spinner that finishes in milliseconds leaves a line behind;
- the rows show internal ids;
- the fix hint is a separate row.

This plan keeps clack and changes only the layout. Research and measurements are in
[researcher-261021-1351-doctor-terminal-ui.md](../reports/researcher-261021-1351-doctor-terminal-ui.md).

## Input fixed by the user (2026-10-21)

The user chose layout A ("A: clack gọn"):

```text
┌   jss-devtools doctor
│  ✔ Node.js         v24.11.0  needs >= 24.11.0
│  ✔ Git             2.55.0
│  ✖ Git repository  not inside a git repository
│    ↳ run `git init`, or cd into a repository
│
└  1 of 3 checks failed
```

## Target output

A run where every check passes writes to stdout and exits 0:

```text
┌   jss-devtools doctor
│  ✔ Node.js         v24.22.0  needs >= 24.11.0
│  ✔ Git             2.55.0
│  ✔ Git repository  inside a git repository
│
└  All 3 checks passed
```

A run with a failure writes the rows to stdout, writes the closing line to stderr, and exits 1:

```text
┌   jss-devtools doctor
│  ✔ Node.js         v24.22.0  needs >= 24.11.0
│  ✔ Git             2.55.0
│  ✖ Git repository  not a git repository
│    ↳ run `git init`, or cd into a repository
│
└  1 of 3 checks failed
```

Colours on a terminal:

- `✔` is green, `✖` is red;
- a failing detail is red;
- `↳` and the hint are yellow;
- the requirement note is dim;
- the intro title is inverse.

Piped output and `NO_COLOR` output carry the same text and no escape byte. Colour comes from
`node:util` `styleText`, which already drops colour when piped and under `NO_COLOR`; no colour
library is added.

## Steps

- [x] `DoctorResult` gains `label`, and an optional `note`.
      - `node.version`: label `Node.js`, detail `v<current>`, note `needs >= <floor>`.
      - `git.installed`: label `Git`, detail is the version number only, `2.55.0`, not
        `git version 2.55.0`.
      - `git.repository`: label `Git repository`.
      - Ids stay for tests. **Done (2026-10-21).** The git check strips the `git version ` prefix,
        so a build suffix such as `(Apple Git-146)` stays.
- [x] `src/core/ui/check-list.ui.ts`: `renderCheckList(rows)`.
      - Writes the rows as one `log.message(lines, { spacing: 0 })` block.
      - Labels are padded to the longest label.
      - A hint goes on the next line, indented under its row, with `↳`.
      - No clack `note` or `box`: they break when the terminal reports 0 columns. **Done (2026-10-21).**
- [x] `doctor.command.ts`:
      - `intro` with the inverse title;
      - no spinner;
      - `renderCheckList`;
      - when every check passes, `outro("All <n> checks passed")`;
      - otherwise `CliError("<failed> of <total> checks failed")`, with no hint. **Done (2026-10-21).**
- [x] `renderError` closes the clack frame on stderr.
      - It writes `└  <message>` in red.
      - When there is a hint, it writes the hint on the next line as `   ↳ <hint>` in yellow.
      - Update `tests/terminal-ui.test.ts` to match. **Done (2026-10-21).** The `│` line that closes
        the frame on stderr is written here too, because the failing path throws instead of calling
        `outro`.
- [x] Tests:
      - Unit test for `renderCheckList`: alignment, hint placement, no escape byte when not a TTY.
      - Bundle test, doctor piped in the repo: the exact row text (versions matched by pattern),
        `All 3 checks passed`, exit 0.
      - Bundle test, doctor piped in a non-git temp dir: the `✖ Git repository` row and the `↳` hint
        on stdout; `└  1 of 3 checks failed` on stderr; exit 1.
      - No escape byte in either run. **Done (2026-10-21).** The unit test lives in
        `tests/check-list.ui.test.ts`.
- [x] Docs: `docs/system-architecture.md` lists `check-list.ui.ts` in the ui layer;
      `docs/codebase-summary.md` adds the file. **Done (2026-10-21).**
- [x] No comments added. **Done (2026-10-21).**

## Acceptance criteria

- A doctor run on a pty matches the target text once colours are stripped.
- Piped output has 0 escape bytes.
- The architecture rules pass: clack is used only inside `core/ui` and the command files.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` is green on Node 24.11.0.

## Non-goals

- A `--json` output.
- New checks.
- Changing other commands.
- A colour library.

## Outcome

Done on 2026-10-21. The rows are one block, the labels line up, the hint sits under its row, the
spinner is gone, and the summary closes the frame on stdout or stderr. `renderCheckList` owns the
layout in `core/ui`; the doctor only hands it the results.

One difference from the mockup: clack's `intro()` writes `┌  ` and its `outro()` writes `└  `, both
with two spaces, so the opening line has two spaces, not the three the mockup shows. The mockup's
own closing line has two, so the frame is now consistent with itself.
